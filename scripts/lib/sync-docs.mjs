// Pure logic of the docs sync: reads the CukeDedup source repository at a release tag and
// renders the Starlight pages. `scripts/sync-docs.mjs` is the CLI around it.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { TAG_PATTERN } from '../../src/release-tag.mjs';
import { docsNav } from '../../src/reference-nav.mjs';

export const GITHUB_BASE = 'https://github.com/figueiredoluiz/cuke-dedup';
export { TAG_PATTERN };

// Contributor-internal pages and the upstream docs index (its table duplicates the sidebar).
// Links to them leave the site for GitHub at the tag.
export const EXCLUDED = new Set(['docs/README.md', 'docs/development.md', 'docs/releasing.md']);

// The README heading is the product name, which would repeat in the tab title and sidebar.
const TITLE_OVERRIDES = { 'README.md': 'Introduction' };
const SIDEBAR_LABEL_OVERRIDES = { 'README.md': 'Introduction' };

export class SyncError extends Error {
  constructor(message, exitCode) {
    super(message);
    this.exitCode = exitCode;
  }
}

const git = (repo, args) =>
  execFileSync('git', ['-C', repo, ...args], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

const compareVersions = (a, b) => {
  const pa = a.slice(1).split('.').map(Number);
  const pb = b.slice(1).split('.').map(Number);
  return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2];
};

/** Resolves the release tag: an explicit value wins, else the newest `vX.Y.Z` tag of the repo. */
export const resolveTag = (repo, explicit) => {
  if (explicit) {
    if (!TAG_PATTERN.test(explicit)) {
      throw new SyncError(`Invalid tag "${explicit}": expected vX.Y.Z.`, 2);
    }
    return explicit;
  }
  let tags;
  try {
    tags = git(repo, ['tag', '--list', 'v*'])
      .split('\n')
      .filter((tag) => TAG_PATTERN.test(tag));
  } catch {
    throw new SyncError(`Cannot list tags of ${repo}. Set CUKE_DEDUP_REPO to a clone.`, 2);
  }
  if (tags.length === 0) throw new SyncError(`No vX.Y.Z tag found in ${repo}.`, 2);
  return tags.sort(compareVersions).at(-1);
};

/** Reads the published markdown files (README.md and docs/**) of `tag` from git objects. */
export const readSource = (repo, tag) => {
  let sha;
  try {
    // A fixed length: git's abbreviation grows with repository size, which would churn the output.
    sha = git(repo, ['rev-parse', '--verify', `refs/tags/${tag}^{commit}`])
      .trim()
      .slice(0, 7);
  } catch {
    throw new SyncError(`Tag ${tag} not found in ${repo}.`, 2);
  }
  const listed = git(repo, [
    'ls-tree',
    '-r',
    '-z',
    '--name-only',
    `refs/tags/${tag}`,
    '--',
    'docs',
    'README.md',
  ])
    .split('\0')
    .filter(Boolean);
  if (!listed.includes('README.md')) throw new SyncError(`README.md missing at ${tag}.`, 2);
  if (!listed.some((file) => file.startsWith('docs/'))) {
    throw new SyncError(`docs/ missing at ${tag}.`, 2);
  }
  const unsupported = listed.filter((file) => /\.(mdx|markdown)$/i.test(file));
  if (unsupported.length > 0) {
    throw new SyncError(`Unsupported page format at ${tag}: ${unsupported.join(', ')}`, 3);
  }
  const files = new Map();
  for (const file of listed) {
    if (!file.endsWith('.md') || file.endsWith('.local.md') || EXCLUDED.has(file)) continue;
    files.set(file, git(repo, ['show', `refs/tags/${tag}:${file}`]).replace(/\r\n/g, '\n'));
  }
  return { sha, files };
};

const NAV_FILES = new Set(docsNav.map(({ file }) => file));
const NAV_FOLDERS = new Set(docsNav.map(({ children }) => children).filter(Boolean));

/** Fails when an upstream page or folder has no sidebar entry in src/reference-nav.mjs. */
export const assertNavigable = (files) => {
  // Astro slugifies page IDs; names that slugify to themselves keep rewritten links valid.
  const unroutable = [...files.keys()].filter(
    (file) => file !== 'README.md' && !/^docs(\/[a-z0-9][a-z0-9-]*)+\.md$/.test(file),
  );
  if (unroutable.length > 0) {
    throw new SyncError(
      `Upstream docs need lowercase-hyphen file names to route: ${unroutable.join(', ')}`,
      3,
    );
  }
  const unlisted = [];
  for (const file of files.keys()) {
    if (file === 'README.md') continue;
    const rest = file.slice('docs/'.length);
    const [first, ...tail] = rest.split('/');
    if (tail.length === 0 ? !NAV_FILES.has(first) : !NAV_FOLDERS.has(first)) unlisted.push(file);
  }
  for (const { file, children } of docsNav) {
    const hasChildren = [...files.keys()].some((f) => f.startsWith(`docs/${children}/`));
    if (children && hasChildren && !files.has(`docs/${file}`)) {
      unlisted.push(`docs/${children}/ (parent page docs/${file} is missing)`);
    }
  }
  if (unlisted.length > 0) {
    throw new SyncError(
      `Upstream docs missing from src/reference-nav.mjs: ${unlisted.join(', ')}`,
      3,
    );
  }
};

// Applies `transform` to prose lines only; fenced code is left untouched. A transform that
// returns null drops its line.
const mapOutsideFences = (text, transform) => {
  let fence = null;
  return text
    .split('\n')
    .map((line) => {
      // A backtick fence's info string cannot contain a backtick (that line is inline code).
      // Fences may sit inside blockquotes (`>` prefix) or open a list item (`-`, `1.`).
      const marker = line.match(
        /^\s*(?:>\s?)*\s*(?:(?:[-*+]|\d+[.)])\s+)?(`{3,}(?=[^`]*$)|~{3,})(.*)$/,
      );
      if (fence) {
        // A closing fence carries no info string, so ```js inside a fenced example stays inside.
        const closes =
          marker &&
          marker[2].trim() === '' &&
          marker[1][0] === fence[0] &&
          marker[1].length >= fence.length;
        if (closes) fence = null;
        return line;
      }
      if (marker) {
        fence = marker[1];
        return line;
      }
      return transform(line);
    })
    .filter((line) => line !== null)
    .join('\n');
};

const pageRoute = (repoPath) => {
  if (repoPath === 'README.md') return '/docs/';
  const slug = repoPath.replace(/^docs\//, '').replace(/\.md$/, '');
  return `/docs/${slug}/`;
};

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const githubUrl = (kind, tag, repoPath, hash) => `${GITHUB_BASE}/${kind}/${tag}/${repoPath}${hash}`;

/** Maps a repo-relative target to a site route when published, else to GitHub at the tag. */
const mapRepoPath = (repoPath, hash, ctx, image, kind = null) => {
  if (image) {
    return `https://raw.githubusercontent.com/figueiredoluiz/cuke-dedup/${ctx.tag}/${repoPath}`;
  }
  if (repoPath.endsWith('.md') && ctx.files.has(repoPath)) {
    return `${pageRoute(repoPath)}${hash}`;
  }
  return githubUrl(kind ?? 'blob', ctx.tag, repoPath, hash);
};

const isExternal = (target) => /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(target);

const rejectQuery = (linkPath, currentFile) => {
  if (linkPath.includes('?')) {
    throw new SyncError(
      `Link with a query string in ${currentFile} is not supported: ${linkPath}`,
      4,
    );
  }
};

/** Rewrites one link target found in `currentFile`; `ctx` is `{ tag, files }`. */
export const rewriteTarget = (target, currentFile, ctx, image = false) => {
  // Links into this repository at `main` (or already at the tag) follow the synced tag.
  const absolute = target.match(
    new RegExp(
      `^${escapeRegExp(GITHUB_BASE)}/(blob|tree)/(?:main|${escapeRegExp(ctx.tag)})(?:/([^#]*))?(#.*)?$`,
    ),
  );
  if (absolute) {
    rejectQuery(absolute[2] ?? '', currentFile);
    return mapRepoPath(absolute[2] ?? '', absolute[3] ?? '', ctx, image, absolute[1]);
  }
  if (isExternal(target) || target.startsWith('#')) return target;
  const [, linkPath, hash = ''] = target.match(/^([^#]*)(#.*)?$/);
  if (!linkPath) return target;
  rejectQuery(linkPath, currentFile);
  // A leading slash is relative to the repository root, not to the current page.
  const joined = linkPath.startsWith('/')
    ? linkPath.slice(1)
    : path.posix.join(path.posix.dirname(currentFile), linkPath);
  const resolved = path.posix.normalize(joined).replace(/\/+$/, '');
  if (resolved === '..' || resolved.startsWith('../')) {
    throw new SyncError(`Link "${target}" in ${currentFile} leaves the repository.`, 4);
  }
  const isDirectory = linkPath.endsWith('/') || /(^|\/)\.{1,2}$/.test(linkPath);
  return mapRepoPath(
    resolved === '.' ? '' : resolved,
    hash,
    ctx,
    image,
    isDirectory ? 'tree' : null,
  );
};

// Inline code is masked while links are rewritten, so documented examples stay verbatim.
const maskCode = (line) => {
  const spans = [];
  const masked = line.replace(
    /(?<!`)(`+)(?!`).+?(?<!`)\1(?!`)/g,
    (span) => `\u0000${spans.push(span) - 1}\u0000`,
  );
  return { masked, unmask: (text) => text.replace(/\u0000(\d+)\u0000/g, (_, n) => spans[n]) };
};

const LINK_TAIL = '\\(([^()\\s<>]+)((?:\\s+"[^"]*")?)\\)';
// Images first, so `[![alt](img)](url)` rewrites the image as an image, not as a page link.
const IMAGE = new RegExp(`!\\[([^\\]]*)\\]${LINK_TAIL}`, 'g');
const LINK = new RegExp(`(?<!!)\\[([^\\]]*)\\]${LINK_TAIL}`, 'g');

/** Rewrites inline markdown links and images in a page; unsupported link forms fail the sync. */
export const rewriteLinks = (body, currentFile, ctx) =>
  mapOutsideFences(body, (line) => {
    if (/^\[[^\]]+\]:\s/.test(line)) {
      throw new SyncError(`Reference-style link in ${currentFile} is not supported: ${line}`, 4);
    }
    const { masked, unmask } = maskCode(line);
    // HTML comments and email autolinks are harmless; other HTML link forms would ship unrewritten.
    const withoutHarmless = masked.replace(/<!--.*?-->/g, '').replace(/<[^<>\s@]+@[^<>\s]+>/g, '');
    if (/<(a|img|source|video|picture|iframe|link)\b/i.test(withoutHarmless)) {
      throw new SyncError(`Raw HTML link or image in ${currentFile} is not supported: ${line}`, 4);
    }
    const handled = new Set();
    const rewrite = (bang) => (_, label, target, title) => {
      handled.add(target);
      return `${bang}[${label}](${rewriteTarget(target, currentFile, ctx, bang === '!')}${title})`;
    };
    const rewritten = masked.replace(IMAGE, rewrite('!')).replace(LINK, rewrite(''));
    // Any other relative target (angle brackets, parentheses, nested images) would ship unrewritten.
    for (const [, target] of masked.matchAll(/\]\(([^\s)]*)/g)) {
      if (!isExternal(target) && !target.startsWith('#') && !handled.has(target)) {
        throw new SyncError(`Unsupported link form in ${currentFile}: ${line}`, 4);
      }
    }
    return unmask(rewritten);
  });

// A line made only of linked badge images, e.g. the CI and license badges of the README.
const BADGE_LINE = /^\s*(\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)\s*)+$/;

const cleanTitle = (title) => title.replace(/`/g, '').trim();

const buildDescription = (body) => {
  const paragraph = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .find(
      (block) =>
        block && !block.endsWith(':') && !/^(\||#|```|\[!\[|[-*] |\d+\.\s|>|<)/.test(block),
    );
  if (!paragraph) return '';
  const text = paragraph
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*|__|`/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const chars = Array.from(text);
  if (chars.length <= 160) return text;
  // Cut at a word boundary, not mid-word.
  return `${chars
    .slice(0, 157)
    .join('')
    .replace(/\s+\S*$/, '')}...`;
};

// Links from a parent page to its children, in order of first appearance.
const childOrder = (parentRaw, parentFile, children) => {
  const order = [];
  for (const [, target] of parentRaw.matchAll(/\]\(([^)#\s]+\.md)(?:#[^)]*)?\)/g)) {
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(parentFile), target));
    if (children.includes(resolved) && !order.includes(resolved)) order.push(resolved);
  }
  return order;
};

const outputPath = (file) => (file === 'README.md' ? 'index.md' : file.replace(/^docs\//, ''));

/**
 * Renders every published page. Returns `Map<outputPath, content>` relative to
 * `src/content/docs/docs/`.
 */
export const renderPages = ({ tag, sha, files }) => {
  assertNavigable(files);
  const ctx = { tag, files };
  const orders = new Map();
  for (const { file, children } of docsNav) {
    const parent = `docs/${file}`;
    if (!children || !files.has(parent)) continue;
    const kids = [...files.keys()].filter((f) => f.startsWith(`docs/${children}/`)).sort();
    const linked = childOrder(files.get(parent), parent, kids);
    [...linked, ...kids.filter((kid) => !linked.includes(kid))].forEach((kid, index) =>
      orders.set(kid, index + 1),
    );
  }
  const out = new Map();
  for (const [file, raw] of files) {
    const lines = raw.split('\n');
    if (!lines[0].startsWith('# ')) {
      throw new SyncError(`${file} must start with a "# " heading.`, 5);
    }
    const title = TITLE_OVERRIDES[file] ?? cleanTitle(lines[0].slice(2));
    // Badge rows (CI status of the default branch) say nothing about the released docs.
    const body = mapOutsideFences(lines.slice(1).join('\n'), (line) =>
      file === 'README.md' && BADGE_LINE.test(line) ? null : line,
    ).replace(/^\n+/, '');
    const sidebar = [];
    if (SIDEBAR_LABEL_OVERRIDES[file]) {
      sidebar.push(`  label: ${JSON.stringify(SIDEBAR_LABEL_OVERRIDES[file])}`);
    }
    if (orders.has(file)) sidebar.push(`  order: ${orders.get(file)}`);
    const frontmatter = [
      '---',
      `title: ${JSON.stringify(title)}`,
      `description: ${JSON.stringify(buildDescription(body))}`,
      ...(sidebar.length ? ['sidebar:', ...sidebar] : []),
      '---',
      '',
      `<!-- Synced from ${GITHUB_BASE} ${file} at ${tag} (${sha}). Edits belong upstream. -->`,
      '',
      '',
    ].join('\n');
    out.set(outputPath(file), `${frontmatter}${rewriteLinks(body, file, ctx).trimEnd()}\n`);
  }
  return out;
};
