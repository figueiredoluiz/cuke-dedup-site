// Pins the docs sync contract: docs are read at a release tag, never the working tree or main.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { devNull, tmpdir } from 'node:os';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  GITHUB_BASE,
  SyncError,
  readSource,
  renderPages,
  resolveTag,
  rewriteLinks,
  rewriteTarget,
} from '../scripts/lib/sync-docs.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const scratch = mkdtempSync(path.join(tmpdir(), 'cuke-sync-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

// Isolated from the developer's git configuration (signing, hooks, autocrlf, templates).
const git = (repo, ...args) =>
  execFileSync(
    'git',
    [
      '-C',
      repo,
      '-c',
      'user.name=t',
      '-c',
      'user.email=t@t',
      '-c',
      'commit.gpgsign=false',
      '-c',
      'tag.gpgsign=false',
      ...args,
    ],
    {
      stdio: 'pipe',
      env: { ...process.env, GIT_CONFIG_GLOBAL: devNull, GIT_CONFIG_NOSYSTEM: '1' },
    },
  );

const write = (repo, file, content) => {
  mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
  writeFileSync(path.join(repo, file), content);
};

let counter = 0;
/** Creates a repo whose commits/tags are described by `releases` ({ tag, files }). */
const makeRepo = (releases) => {
  const repo = path.join(scratch, `repo-${(counter += 1)}`);
  mkdirSync(repo);
  git(repo, 'init', '-q');
  for (const { tag, files } of releases) {
    git(repo, 'rm', '-rq', '--ignore-unmatch', '.');
    for (const [file, content] of Object.entries(files)) write(repo, file, content);
    git(repo, 'add', '-A');
    git(repo, 'commit', '-q', '--allow-empty', '-m', `release ${tag}`);
    if (tag) git(repo, 'tag', tag);
  }
  return repo;
};

const base = {
  'README.md':
    '# CukeDedup\n\n[![CI](https://x/y.svg)](https://x/y)\n\nIntro paragraph.\n\nSee [rules](docs/rules.md#a), [dev](docs/development.md), [license](LICENSE).\n',
  'docs/rules.md':
    '# Rules\n\nRules intro.\n\n[Config](configuration.md#x) and [dev](development.md)\n',
  'docs/configuration.md': '# Configuration\n\nConfig intro.\n',
  'docs/development.md': '# Development\n\nInternal.\n',
  'docs/releasing.md': '# Releasing\n\nInternal.\n',
  'docs/notes.local.md': '# Notes\n\nLocal.\n',
};

const ctx = {
  tag: 'v1.2.3',
  files: new Map([
    ['docs/rules.md', ''],
    ['README.md', ''],
  ]),
};

describe('tag resolution', () => {
  const repo = makeRepo([
    { tag: 'v0.9.0', files: base },
    { tag: 'v0.13.0', files: base },
    { tag: 'v0.14.0-rc.1', files: base },
    { tag: 'nightly', files: base },
  ]);

  test('newest vX.Y.Z wins, compared numerically, prerelease and non-semver tags ignored', () => {
    assert.equal(resolveTag(repo, undefined), 'v0.13.0');
  });

  test('explicit tag wins over the newest', () => {
    assert.equal(resolveTag(repo, 'v0.9.0'), 'v0.9.0');
  });

  test('invalid explicit tag is rejected', () => {
    for (const bad of ['main', '0.13.0', 'v0.13', 'v1.2.3; rm -rf /', 'v0.14.0-rc.1']) {
      assert.throws(() => resolveTag(repo, bad), SyncError, bad);
    }
  });

  test('repository without release tags fails closed', () => {
    const empty = makeRepo([{ tag: 'nightly', files: base }]);
    assert.throws(() => resolveTag(empty, undefined), /No vX\.Y\.Z tag/);
  });
});

describe('reading at the tag', () => {
  test('reads the tag, not later commits or the working tree', () => {
    const repo = makeRepo([
      {
        tag: 'v1.0.0',
        files: { ...base, 'docs/configuration.md': '# Configuration\n\nReleased.\n' },
      },
      {
        tag: null,
        files: { ...base, 'docs/configuration.md': '# Configuration\n\nUse --emit-pairs.\n' },
      },
    ]);
    write(repo, 'docs/configuration.md', '# Configuration\n\nDirty --emit-pairs.\n');
    const { files } = readSource(repo, 'v1.0.0');
    assert.match(files.get('docs/configuration.md'), /Released\./);
    // Control: the same repo's HEAD carries the unreleased flag.
    assert.match(git(repo, 'show', 'HEAD:docs/configuration.md').toString(), /--emit-pairs/);
    const out = renderPages({ tag: 'v1.0.0', ...readSource(repo, 'v1.0.0') });
    assert.ok(![...out.values()].some((page) => page.includes('--emit-pairs')));
  });

  test('missing tag, missing docs and missing README fail closed', () => {
    const repo = makeRepo([{ tag: 'v1.0.0', files: base }]);
    assert.throws(() => readSource(repo, 'v9.9.9'), /Tag v9\.9\.9 not found/);
    const noDocs = makeRepo([{ tag: 'v1.0.0', files: { 'README.md': '# X\n' } }]);
    assert.throws(() => readSource(noDocs, 'v1.0.0'), /docs\/ missing/);
    const noReadme = makeRepo([{ tag: 'v1.0.0', files: { 'docs/rules.md': '# R\n' } }]);
    assert.throws(() => readSource(noReadme, 'v1.0.0'), /README\.md missing/);
  });

  test('CRLF sources are normalised to LF', () => {
    const repo = makeRepo([
      { tag: 'v1.0.0', files: { ...base, 'docs/reports.md': '# R\r\n\r\nText.\r\n' } },
    ]);
    assert.equal(readSource(repo, 'v1.0.0').files.get('docs/reports.md'), '# R\n\nText.\n');
  });

  test('non-markdown page formats fail closed', () => {
    const repo = makeRepo([{ tag: 'v1.0.0', files: { ...base, 'docs/new.mdx': '# N\n' } }]);
    assert.throws(() => readSource(repo, 'v1.0.0'), /Unsupported page format/);
  });

  test('non-ASCII file names are listed, not dropped', () => {
    const repo = makeRepo([{ tag: 'v1.0.0', files: { ...base, 'docs/résumé.md': '# R\n' } }]);
    assert.ok(readSource(repo, 'v1.0.0').files.has('docs/résumé.md'));
  });

  test('excludes *.local.md, the docs index and contributor-internal pages', () => {
    const repo = makeRepo([
      {
        tag: 'v1.0.0',
        files: { ...base, 'docs/README.md': '# Index\n', 'docs/rules/x.local.md': '# L\n' },
      },
    ]);
    const names = [...readSource(repo, 'v1.0.0').files.keys()].sort();
    assert.deepEqual(names, ['README.md', 'docs/configuration.md', 'docs/rules.md']);
  });
});

describe('rendering', () => {
  const render = (extra = {}, tag = 'v1.2.3') => {
    const repo = makeRepo([{ tag, files: { ...base, ...extra } }]);
    return renderPages({ tag, ...readSource(repo, tag) });
  };

  test('provenance comment names tag and short sha; README becomes the docs index', () => {
    const out = render();
    assert.deepEqual([...out.keys()].sort(), ['configuration.md', 'index.md', 'rules.md']);
    assert.match(
      out.get('rules.md'),
      /<!-- Synced from .* docs\/rules\.md at v1\.2\.3 \([0-9a-f]{7,}\)\. Edits belong upstream\. -->/,
    );
    assert.match(out.get('index.md'), /label: "Introduction"/);
    assert.match(out.get('index.md'), /title: "Introduction"/);
  });

  test('README badge rows are dropped; badges inside prose and other pages are kept', () => {
    const readme =
      '# T\n\n[![a](https://x/a.svg)](https://x) [![b](https://x/b.svg)](https://x)\n\nIntro. [![c](https://x/c.svg)](https://x) tail\n';
    const index = render({ 'README.md': readme }).get('index.md');
    assert.doesNotMatch(index, /a\.svg|b\.svg/);
    assert.match(index, /c\.svg/);
    const other = render({ 'docs/reports.md': '# R\n\n[![a](https://x/a.svg)](https://x)\n' });
    assert.match(other.get('reports.md'), /a\.svg/);
  });

  test('long descriptions are cut at a word boundary', () => {
    const words = Array.from({ length: 60 }, () => 'wordy').join(' ');
    const out = render({ 'docs/reports.md': `# R\n\n${words}\n` }).get('reports.md');
    const description = out.match(/description: "(.*)"/)[1];
    assert.match(description, /^(wordy )*wordy\.\.\.$/);
    assert.ok(description.length <= 160);
  });

  test('numbered lists and quotes are not used as the description', () => {
    const index = render({ 'README.md': '# T\n\n1. step\n\n> note\n\nReal paragraph.\n' }).get(
      'index.md',
    );
    assert.match(index, /description: "Real paragraph\."/);
  });

  test('badges are stripped and the description is the first prose paragraph', () => {
    const index = render().get('index.md');
    assert.doesNotMatch(index, /img\.shields|svg/);
    assert.match(index, /description: "Intro paragraph\."/);
  });

  test('links resolve to site routes, excluded pages and other files to GitHub at the tag', () => {
    const index = render().get('index.md');
    assert.match(index, /\[rules\]\(\/docs\/rules\/#a\)/);
    assert.match(
      index,
      new RegExp(`\\[dev\\]\\(${GITHUB_BASE}/blob/v1\\.2\\.3/docs/development\\.md\\)`),
    );
    assert.match(index, new RegExp(`\\[license\\]\\(${GITHUB_BASE}/blob/v1\\.2\\.3/LICENSE\\)`));
    assert.match(render().get('rules.md'), /\[Config\]\(\/docs\/configuration\/#x\)/);
  });

  test('folder pages are ordered by their parent page links', () => {
    const out = render({
      'docs/rules.md': '# Rules\n\n[b](rules/b.md) then [a](rules/a.md)\n',
      'docs/rules/a.md': '# a\n\nA.\n',
      'docs/rules/b.md': '# b\n\nB.\n',
      'docs/rules/c.md': '# c\n\nC, not linked.\n',
    });
    const order = (name) => out.get(`rules/${name}.md`).match(/order: (\d+)/)[1];
    assert.deepEqual(['b', 'a', 'c'].map(order), ['1', '2', '3']);
  });

  test('an upstream top-level page or folder without a nav entry fails with exit 3', () => {
    for (const extra of [
      { 'docs/new-page.md': '# New\n\nX.\n' },
      { 'docs/newdir/p.md': '# P\n' },
    ]) {
      assert.throws(
        () => render(extra),
        (error) =>
          error instanceof SyncError && error.exitCode === 3 && /reference-nav/.test(error.message),
      );
    }
    // File names Astro would slugify differ from the routes the links point to.
    for (const name of ['docs/rules/Duplicate Matcher.md', 'docs/rules/FAQ.md']) {
      assert.throws(
        () => render({ [name]: '# X\n' }),
        (error) =>
          error instanceof SyncError && error.exitCode === 3 && /file names/.test(error.message),
      );
    }
    // A folder whose parent page is missing would be orphaned from the sidebar.
    const orphan = new Map([
      ['README.md', '# T\n\nX.\n'],
      ['docs/rules/a.md', '# a\n\nA.\n'],
    ]);
    assert.throws(
      () => renderPages({ tag: 'v1.2.3', sha: 'abc1234', files: orphan }),
      (error) => error instanceof SyncError && error.exitCode === 3,
    );
    // Control: a listed page and an excluded one do not fail.
    assert.doesNotThrow(() => render({ 'docs/reports.md': '# Reports\n\nR.\n' }));
  });

  test('a page without an H1 fails closed', () => {
    assert.throws(() => render({ 'docs/reports.md': 'No heading\n' }), /must start with/);
  });
});

describe('link rewriting', () => {
  test('absolute GitHub links to main and to the tag follow the tag; docs links become routes', () => {
    const t = (target) => rewriteTarget(target, 'README.md', ctx);
    assert.equal(t(`${GITHUB_BASE}/blob/main/docs/rules.md#a`), '/docs/rules/#a');
    assert.equal(t(`${GITHUB_BASE}/blob/v1.2.3/docs/rules.md`), '/docs/rules/');
    assert.equal(
      t(`${GITHUB_BASE}/blob/main/skills/x/SKILL.md`),
      `${GITHUB_BASE}/blob/v1.2.3/skills/x/SKILL.md`,
    );
    assert.equal(t(`${GITHUB_BASE}/tree/main/skills`), `${GITHUB_BASE}/tree/v1.2.3/skills`);
  });

  test('controls: external, anchor and mailto links are untouched; escaping the repo fails', () => {
    const t = (target) => rewriteTarget(target, 'docs/rules.md', ctx);
    for (const same of [
      'https://example.com/a',
      '#frag',
      'mailto:a@b.c',
      `${GITHUB_BASE}/releases`,
    ]) {
      assert.equal(t(same), same);
    }
    assert.throws(() => t('../../outside.md'), /leaves the repository/);
    assert.equal(t('../README.md'), '/docs/');
  });

  test('link titles are kept, inline code is verbatim, unsupported forms fail closed', () => {
    const rewrite = (body) => rewriteLinks(body, 'README.md', ctx);
    assert.equal(rewrite('[a](docs/rules.md "Title")'), '[a](/docs/rules/ "Title")');
    assert.equal(
      rewrite('`[x](docs/rules.md)` [`c`](docs/rules.md)'),
      '`[x](docs/rules.md)` [`c`](/docs/rules/)',
    );
    assert.throws(() => rewrite('[a](<docs/rules.md>)'), /Unsupported link form/);
    assert.throws(() => rewrite('[a](docs/a(b).md)'), /Unsupported link form/);
  });

  test('root-relative, directory and query targets; raw HTML and nested images', () => {
    const t = (target, file = 'docs/configuration.md') => rewriteTarget(target, file, ctx);
    assert.equal(t('/docs/rules.md#a'), '/docs/rules/#a');
    assert.equal(t('.', 'docs/rules.md'), `${GITHUB_BASE}/tree/v1.2.3/docs`);
    assert.equal(t('../skills', 'docs/rules.md'), `${GITHUB_BASE}/blob/v1.2.3/skills`);
    assert.equal(t(`${GITHUB_BASE}/tree/main`), `${GITHUB_BASE}/tree/v1.2.3/`);
    assert.equal(t('docs/', 'README.md'), `${GITHUB_BASE}/tree/v1.2.3/docs`);
    assert.equal(t('..', 'docs/rules.md'), `${GITHUB_BASE}/tree/v1.2.3/`);
    assert.throws(() => t('rules.md?plain=1'), /query string/);
    const rewrite = (body) => rewriteLinks(body, 'README.md', ctx);
    assert.throws(() => rewrite('<a href="docs/rules.md">x</a>'), /Raw HTML/);
    assert.throws(() => rewrite('[![b](docs/x.svg)](docs/rules.md)'), /Unsupported link form/);
    assert.doesNotThrow(() => rewrite('<!-- <a href="x"> --> <me@example.com>'));
    assert.equal(
      rewrite('[![logo](assets/logo.png)](https://example.com)'),
      `[![logo](https://raw.githubusercontent.com/figueiredoluiz/cuke-dedup/v1.2.3/assets/logo.png)](https://example.com)`,
    );
    // Controls: external URLs with parentheses and linked external images pass through.
    const external = '[c](https://x.com/a_(b)) [![b](https://x/x.svg)](https://x/y)';
    assert.equal(rewrite(external), external);
  });

  test('a target whose name starts with two dots stays inside the repository', () => {
    assert.equal(
      rewriteTarget('..hidden.md', 'docs/rules.md', ctx),
      `${GITHUB_BASE}/blob/v1.2.3/docs/..hidden.md`,
    );
  });

  test('fenced code and inline reference definitions', () => {
    const nested = '```md\n```js\n[x](docs/rules.md)\n```\n[y](docs/rules.md)\n';
    const expected = '```md\n```js\n[x](docs/rules.md)\n```\n[y](/docs/rules/)\n';
    assert.equal(rewriteLinks(nested, 'README.md', ctx), expected);
    const quoted = '> ```md\n> [x](docs/rules.md)\n> ```\n[y](docs/rules.md)\n';
    assert.equal(
      rewriteLinks(quoted, 'README.md', ctx),
      '> ```md\n> [x](docs/rules.md)\n> ```\n[y](/docs/rules/)\n',
    );
    const listed = '- ```bash\n  [x](docs/rules.md)\n  ```\n[y](docs/rules.md)\n';
    assert.equal(
      rewriteLinks(listed, 'README.md', ctx),
      '- ```bash\n  [x](docs/rules.md)\n  ```\n[y](/docs/rules/)\n',
    );
    // An opener with a backtick in its info string is inline code, not a fence.
    const inline = '```npx x``` run\n[y](docs/rules.md)\n';
    assert.equal(rewriteLinks(inline, 'README.md', ctx), '```npx x``` run\n[y](/docs/rules/)\n');
    assert.equal(
      rewriteLinks('``a ` b`` [x](docs/rules.md)', 'README.md', ctx),
      '``a ` b`` [x](/docs/rules/)',
    );
    const body = '```md\n[x](docs/rules.md)\n```\n[y](docs/rules.md)\n';
    assert.equal(
      rewriteLinks(body, 'README.md', ctx),
      '```md\n[x](docs/rules.md)\n```\n[y](/docs/rules/)\n',
    );
    assert.throws(() => rewriteLinks('[a]: docs/rules.md\n', 'README.md', ctx), /Reference-style/);
  });
});

describe('sync CLI', () => {
  const run = (env, ...args) =>
    spawnSync('node', ['scripts/sync-docs.mjs', ...args], {
      cwd: root,
      env: { ...process.env, ...env },
      encoding: 'utf8',
    });

  test('--check fails on drift against the committed docs and skips without a source repo', () => {
    const repo = makeRepo([{ tag: 'v1.0.0', files: base }]);
    const drift = run({ CUKE_DEDUP_REPO: repo, CUKE_DEDUP_TAG: 'v1.0.0' }, '--check');
    assert.equal(drift.status, 1);
    assert.match(drift.stderr, /differ from a fresh sync at v1\.0\.0/);
    const absent = path.join(scratch, 'absent');
    const skipped = run({ CUKE_DEDUP_REPO: absent, CI: '' }, '--check');
    assert.equal(skipped.status, 0);
    assert.match(skipped.stdout, /skipped/);
    // Control: in CI a missing source repository is an error, not a skip.
    assert.equal(run({ CUKE_DEDUP_REPO: absent, CI: 'true' }, '--check').status, 2);
  });

  test('sync without a source repo or with an unknown tag exits 2', () => {
    assert.equal(run({ CUKE_DEDUP_REPO: path.join(scratch, 'absent') }).status, 2);
    const repo = makeRepo([{ tag: 'v1.0.0', files: base }]);
    assert.equal(run({ CUKE_DEDUP_REPO: repo, CUKE_DEDUP_TAG: 'v2.0.0' }, '--check').status, 2);
  });
});
