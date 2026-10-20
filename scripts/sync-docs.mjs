#!/usr/bin/env node
// Generates the Starlight docs from the CukeDedup source repository AT A RELEASE TAG, never from
// its working tree: the site documents the last released version. The tag comes from
// CUKE_DEDUP_TAG (CI) or the newest vX.Y.Z tag of the local clone (`../cuke-dedup`, override with
// CUKE_DEDUP_REPO). Output is committed so builds stay deterministic; CI re-runs the sync before
// every build. `--check` compares the committed output with a fresh sync instead of writing.
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GITHUB_BASE, SyncError, readSource, renderPages, resolveTag } from './lib/sync-docs.mjs';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourceRepo = path.resolve(
  process.env.CUKE_DEDUP_REPO ?? path.resolve(projectRoot, '../cuke-dedup'),
);
const outDir = path.resolve(projectRoot, 'src/content/docs/docs');
const checkOnly = process.argv.includes('--check');

const listFiles = async (dir, prefix = '') => {
  if (!existsSync(dir)) return [];
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) found.push(...(await listFiles(path.join(dir, entry.name), relative)));
    else if (!entry.name.startsWith('.')) found.push(relative);
  }
  return found.sort();
};

try {
  if (!existsSync(sourceRepo)) {
    if (checkOnly && !process.env.CI) {
      console.log(`check:docs skipped: source repository not found at ${sourceRepo}.`);
      process.exit(0);
    }
    throw new SyncError(
      `Source repository not found: ${sourceRepo}. Set CUKE_DEDUP_REPO or clone it next to this project.`,
      2,
    );
  }
  const tag = resolveTag(sourceRepo, process.env.CUKE_DEDUP_TAG);
  const { sha, files } = readSource(sourceRepo, tag);
  const pages = renderPages({ tag, sha, files });

  if (checkOnly) {
    const committed = await listFiles(outDir);
    const drift = [];
    for (const name of new Set([...committed, ...pages.keys()])) {
      const expected = pages.get(name);
      const actual = committed.includes(name)
        ? await readFile(path.join(outDir, name), 'utf8')
        : undefined;
      if (expected !== actual) drift.push(name);
    }
    if (drift.length > 0) {
      throw new SyncError(
        `Committed docs differ from a fresh sync at ${tag}: ${drift.join(', ')}. Run pnpm sync:docs.`,
        1,
      );
    }
    console.log(`Docs match ${GITHUB_BASE} at ${tag} (${sha}): ${pages.size} pages.`);
  } else {
    // Write beside the target and swap, so a failed write never leaves a half-populated docs tree.
    const staging = path.join(projectRoot, '.docs-staging');
    await rm(staging, { recursive: true, force: true });
    for (const [name, content] of pages) {
      const destination = path.join(staging, name);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, content);
    }
    const previous = `${staging}-previous`;
    await rm(previous, { recursive: true, force: true });
    if (existsSync(outDir)) await rename(outDir, previous);
    try {
      await rename(staging, outDir);
    } catch (error) {
      if (existsSync(previous)) await rename(previous, outDir);
      throw error;
    }
    await rm(previous, { recursive: true, force: true });
    console.log(
      `Synced ${pages.size} docs from ${GITHUB_BASE} at ${tag} (${sha}) into ${path.relative(projectRoot, outDir)}`,
    );
  }
} catch (error) {
  if (error instanceof SyncError) {
    console.error(error.message);
    process.exit(error.exitCode);
  }
  throw error;
}
