// Pins how the site picks the version it documents: the greatest stable version, never the most
// recently published release, so a backport cannot redeploy older documentation.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { compareVersions, greatestStableTag } from '../src/release-tag.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const scratch = mkdtempSync(path.join(tmpdir(), 'cuke-tag-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

describe('version order', () => {
  test('compares numerically, not as text', () => {
    assert.ok(compareVersions('v0.9.0', 'v0.10.0') < 0);
    assert.ok(compareVersions('v0.12.3', 'v0.13.0') < 0);
    assert.ok(compareVersions('v1.0.0', 'v0.99.99') > 0);
    assert.equal(compareVersions('v0.13.0', 'v0.13.0'), 0);
  });

  test('the greatest stable tag ignores publication order, prereleases and other tags', () => {
    const releases = [
      { tagName: 'v0.12.3', prerelease: false }, // a backport published last
      { tagName: 'v0.13.0', prerelease: false },
      { tagName: 'v0.14.0', prerelease: true },
      { tagName: 'nightly', prerelease: false },
      { tagName: 'v0.12.2', prerelease: false },
    ];
    assert.equal(greatestStableTag(releases), 'v0.13.0');
    // Control: without the newer line the backport is the answer, so the filter is not a constant.
    assert.equal(greatestStableTag([releases[0], releases[4]]), 'v0.12.3');
    assert.equal(greatestStableTag([releases[2], releases[3]]), undefined);
  });
});

// The workflow resolves the same answer in shell; its helper is run against a fake `gh`.
const workflow = readFileSync(path.join(root, '.github/workflows/deploy.yml'), 'utf8').replaceAll(
  '\r\n',
  '\n',
);
const helper = workflow.match(/^ {10}latest\(\) \{\n[\s\S]*?^ {10}\}\n/m)?.[0];

/** Runs the workflow's `latest` helper with `gh` printing the given tag lines. */
const runLatest = (helperText, lines) => {
  const bin = mkdtempSync(path.join(scratch, 'bin-'));
  writeFileSync(
    path.join(bin, 'gh'),
    `#!/bin/sh\nprintf '%s\\n' ${lines.map((l) => `'${l}'`).join(' ')}\n`,
  );
  chmodSync(path.join(bin, 'gh'), 0o755);
  return spawnSync(
    'bash',
    ['-eo', 'pipefail', '-c', `pattern='^v[0-9]+\\.[0-9]+\\.[0-9]+$'\n${helperText}\nlatest`],
    { encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } },
  );
};

describe('deploy workflow release selection', () => {
  test('selects the greatest stable version of the release list', () => {
    assert.ok(helper, 'the latest() helper is found');
    const run = runLatest(helper, ['v0.12.3', 'v0.13.0', 'v0.12.2', 'v1.0.0-rc1', 'nightly']);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stdout.trim(), 'v0.13.0');
    // Control: a first entry is not simply taken.
    assert.equal(runLatest(helper, ['v0.9.0', 'v0.10.0']).stdout.trim(), 'v0.10.0');
  });

  test('fails closed when no stable release exists', () => {
    assert.notEqual(runLatest(helper, ['nightly', 'v1.0.0-rc1']).status, 0);
  });

  test('queries the full release list for published stable releases, not /releases/latest', () => {
    assert.match(helper, /gh api --paginate repos\/figueiredoluiz\/cuke-dedup\/releases \\\n/);
    assert.match(helper, /select\(\.prerelease == false and \.draft == false\)/);
    const code = workflow
      .split('\n')
      .filter((line) => !line.trim().startsWith('#'))
      .join('\n');
    assert.doesNotMatch(code, /releases\/latest/);
    assert.match(workflow, /releases\/latest/, 'the comment explaining the choice is kept');
    // Mutation controls: each weakening is rejected by the checks above.
    const unsorted = helper.replace(' | sort -V', '');
    assert.equal(runLatest(unsorted, ['v0.12.3', 'v0.13.0', 'v0.12.2']).stdout.trim(), 'v0.12.2');
  });
});
