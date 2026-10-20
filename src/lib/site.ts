export const siteConfig = {
  name: 'CukeDedup',
  tagline:
    'Find duplicate step definitions. Remove ambiguity. Keep your Cucumber suite maintainable.',
  description:
    'CukeDedup is a fast static analyzer for duplicate, ambiguous, reusable, and unused Cucumber/Gherkin step definitions. It reads project configuration and test code without executing either one.',
  license: 'MIT',
  domain: 'cukededup.dev',
  repoUrl: 'https://github.com/figueiredoluiz/cuke-dedup',
  npmUrl: 'https://www.npmjs.com/package/cuke-dedup',
  issuesUrl: 'https://github.com/figueiredoluiz/cuke-dedup/issues',
  contributingUrl: 'https://github.com/figueiredoluiz/cuke-dedup/blob/main/CONTRIBUTING.md',
  securityUrl: 'https://github.com/figueiredoluiz/cuke-dedup/blob/main/SECURITY.md',
  releasesUrl: 'https://github.com/figueiredoluiz/cuke-dedup/releases',
} as const;

export const headerNav = [
  { label: 'Features', href: '/#features' },
  { label: 'Docs', href: '/docs/' },
  { label: 'Changelog', href: '/changelog/' },
] as const;
