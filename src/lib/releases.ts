import releasesJson from '../data/releases.json';
import { TAG_PATTERN, greatestStableTag } from '../release-tag.mjs';

export interface Release {
  tagName: string;
  name: string;
  publishedAt: string;
  prerelease: boolean;
  url: string;
  body: string;
}

// Subset of the GitHub Releases API response used by the site.
export interface GitHubRelease {
  tag_name: string;
  name: string | null;
  published_at: string | null;
  prerelease: boolean;
  draft?: boolean;
  html_url: string;
  body: string | null;
}

const SOURCE_REPO = 'figueiredoluiz/cuke-dedup';

const byNewestFirst = (a: Release, b: Release): number =>
  Date.parse(b.publishedAt) - Date.parse(a.publishedAt);

const mapGitHubRelease = (release: GitHubRelease): Release => ({
  tagName: release.tag_name,
  name: release.name ?? release.tag_name,
  publishedAt: release.published_at ?? '',
  prerelease: release.prerelease,
  url: release.html_url,
  body: release.body ?? '',
});

const toReleases = (data: GitHubRelease[]): Release[] =>
  data
    .filter((release) => !release.draft && release.published_at)
    .map(mapGitHubRelease)
    .sort(byNewestFirst);

// The committed snapshot of the Releases API; the offline fallback, so local development and
// builds with the API unreachable never block on the network.
const fixtureReleases: Release[] = toReleases(releasesJson as GitHubRelease[]);

// Set by the deploy workflow (and the docs sync) to the release the docs are generated from.
const pinnedTag = (): string | null => {
  const tag = process.env.CUKE_DEDUP_TAG;
  return tag && TAG_PATTERN.test(tag) ? tag : null;
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const fetchPage = async (page: number): Promise<GitHubRelease[] | null> => {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  // Only release-pinned builds retry; local and dev builds fall back to the snapshot at once.
  const attempts = pinnedTag() ? 3 : 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${SOURCE_REPO}/releases?per_page=100&page=${page}`,
        { headers, signal: AbortSignal.timeout(10_000) },
      );
      if (response.ok) return (await response.json()) as GitHubRelease[];
      // Other client errors do not clear by retrying; server errors and rate limits do.
      if (response.status < 500 && response.status !== 403 && response.status !== 429) return null;
      const retryAfter = Number(response.headers.get('retry-after'));
      if (retryAfter > 0) await sleep(Math.min(retryAfter, 30) * 1000);
    } catch {
      // Retry below.
    }
    if (attempt + 1 < attempts) await sleep(1000 * (attempt + 1));
  }
  return null;
};

const fetchReleases = async (): Promise<Release[] | null> => {
  const all: GitHubRelease[] = [];
  for (let page = 1; page <= 10; page += 1) {
    const data = await fetchPage(page);
    if (!data) return null;
    all.push(...data);
    if (data.length < 100) break;
  }
  const releases = toReleases(all);
  return releases.length > 0 ? releases : null;
};

/**
 * Published releases, newest first: the live API at build time, else the committed snapshot.
 * A build pinned to a release tag waits briefly for that release to appear in the list and
 * fails instead of serving data that lacks it.
 */
const loadReleases = async (): Promise<Release[]> => {
  const tag = pinnedTag();
  const hasPinned = (releases: Release[]): boolean =>
    releases.some((release) => release.tagName === tag && !release.prerelease);
  let releases = (await fetchReleases()) ?? fixtureReleases;
  for (let attempt = 1; tag && !hasPinned(releases) && attempt <= 3; attempt += 1) {
    await sleep(5000 * attempt);
    releases = (await fetchReleases()) ?? releases;
  }
  if (tag && !hasPinned(releases)) {
    throw new Error(`Release data has no stable release ${tag}; refusing to build stale pages.`);
  }
  return releases;
};

let releasesPromise: Promise<Release[]> | null = null;

export const getReleases = (): Promise<Release[]> => (releasesPromise ??= loadReleases());

/** The documented version: the pinned release tag, else the newest stable release. */
export const getCurrentVersion = async (): Promise<string> => {
  const releases = await getReleases();
  const stable = pinnedTag() ?? greatestStableTag(releases);
  if (!stable) throw new Error('No stable release found in the release data.');
  return stable;
};

export const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(iso));
