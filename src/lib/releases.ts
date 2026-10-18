import releasesJson from '../data/releases.json';

export interface Release {
  tagName: string;
  name: string;
  publishedAt: string;
  prerelease: boolean;
  url: string;
  body: string;
}

// Mirrors the GitHub Releases API response shape so the fixture can later be
// replaced by a build-time fetch of
// https://api.github.com/repos/figueiredoluiz/cuke-dedup/releases
export interface GitHubRelease {
  tag_name: string;
  name: string | null;
  published_at: string | null;
  prerelease: boolean;
  html_url: string;
  body: string | null;
}

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

const fixtureReleases: Release[] = (releasesJson as GitHubRelease[])
  .map(mapGitHubRelease)
  .sort(byNewestFirst);

export const getReleases = (): Release[] => fixtureReleases;

// Newest stable release — the version a fresh install would get.
export const getCurrentVersion = (): string =>
  fixtureReleases.find((release) => !release.prerelease)?.tagName ?? 'v0.13.0';

export const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(iso));
