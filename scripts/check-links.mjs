#!/usr/bin/env node
// Verifies that every internal link and fragment in the built site (dist/) resolves.
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve(process.argv[2] ?? 'dist');

const listHtml = async (dir) => {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await listHtml(full)));
    else if (entry.name.endsWith('.html')) found.push(full);
  }
  return found;
};

const targetFile = (pathname) =>
  [path.join(dist, pathname, 'index.html'), path.join(dist, pathname)].find(
    (candidate) => candidate.endsWith('.html') && existsSync(candidate),
  ) ?? null;

const idCache = new Map();
const idsOf = async (file) => {
  if (!idCache.has(file)) {
    const html = await readFile(file, 'utf8');
    idCache.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1])));
  }
  return idCache.get(file);
};

const errors = [];
let checked = 0;
for (const file of await listHtml(dist)) {
  const raw = await readFile(file, 'utf8');
  // Release notes rendered on the changelog come from GitHub and are not site-authored links.
  const isChangelog = path.relative(dist, file) === path.join('changelog', 'index.html');
  const html = isChangelog ? raw.replace(/<article\b[\s\S]*?<\/article>/g, '') : raw;
  for (const [, href] of html.matchAll(/(?<![\w:-])(?:href|src)="([^"]*)"/g)) {
    if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) continue;
    const here = path.relative(dist, file);
    const pageUrl = `https://site.invalid/${here.replace(/(^|\/)index\.html$/, '$1')}`;
    let url;
    let pathname;
    let fragment;
    try {
      url = new URL(href.replaceAll('&amp;', '&'), pageUrl);
      pathname = decodeURIComponent(url.pathname);
      fragment = decodeURIComponent(url.hash.slice(1));
    } catch {
      errors.push(`${here}: malformed link ${href}`);
      continue;
    }
    const isAsset = /\.[a-z0-9]+$/i.test(pathname) && !pathname.endsWith('.html');
    checked += 1;
    if (isAsset) {
      if (!existsSync(path.join(dist, pathname))) {
        errors.push(`${here}: missing asset ${href}`);
      }
      continue;
    }
    const target = targetFile(pathname);
    if (!target) {
      errors.push(`${here}: broken link ${href}`);
    } else if (fragment && !(await idsOf(target)).has(fragment)) {
      errors.push(`${here}: missing anchor ${href}`);
    }
  }
}

if (errors.length > 0) {
  console.error([...new Set(errors)].join('\n'));
  process.exit(1);
}
console.log(`${checked} internal links resolve in ${path.relative(process.cwd(), dist) || dist}.`);
