// Release tags the site documents: stable `vX.Y.Z` only. The deploy workflow validates the same
// pattern in shell.
export const TAG_PATTERN = /^v[0-9]+\.[0-9]+\.[0-9]+$/;
