// Release tags the site documents: stable `vX.Y.Z` only. The deploy workflow validates the same
// pattern in shell.
export const TAG_PATTERN = /^v[0-9]+\.[0-9]+\.[0-9]+$/;

/** Orders `vX.Y.Z` tags by version, so a backport published later does not outrank a newer line. */
export const compareVersions = (a, b) => {
  const pa = a.slice(1).split('.').map(Number);
  const pb = b.slice(1).split('.').map(Number);
  return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2];
};

/**
 * The greatest stable `vX.Y.Z` tag among releases, whatever their publication order.
 * @param {{tagName: string, prerelease: boolean}[]} releases Published releases.
 * @returns {string|undefined} The tag, or undefined when no stable release exists.
 */
export const greatestStableTag = (releases) =>
  releases
    .filter((release) => !release.prerelease && TAG_PATTERN.test(release.tagName))
    .map((release) => release.tagName)
    .sort(compareVersions)
    .at(-1);
