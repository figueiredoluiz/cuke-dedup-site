// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { GA_MEASUREMENT_ID, gaBootstrapScript } from './src/lib/analytics.mjs';

// Production origin. The real domain is the default so built pages carry
// correct canonical URLs; override with SITE_URL for local experiments.
const site = process.env.SITE_URL ?? 'https://cukededup.dev';
const ogImageUrl = new URL('/images/og.png', site).href;

// GA loads only in real production builds; the bootstrap script additionally
// gates itself on the served hostname at runtime.
const isBuild = process.argv.some((arg) => arg === 'build' || arg.endsWith('/build'));

export default defineConfig({
  site,
  integrations: [
    starlight({
      title: 'CukeDedup',
      description:
        'A fast static analyzer for duplicate, ambiguous, reusable, and unused Cucumber/Gherkin step definitions.',
      logo: { src: './src/assets/icon.png' },
      favicon: '/favicon.png',
      customCss: ['./src/styles/starlight.css'],
      // Docs header matches the landing header: shared wordmark and icon
      // toggle instead of Starlight's default title and theme dropdown.
      components: {
        SiteTitle: './src/components/starlight/SiteTitle.astro',
        ThemeSelect: './src/components/starlight/ThemeSelect.astro',
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/figueiredoluiz/cuke-dedup',
        },
        {
          icon: 'npm',
          label: 'npm',
          href: 'https://www.npmjs.com/package/cuke-dedup',
        },
      ],
      head: [
        {
          tag: 'link',
          attrs: { rel: 'icon', type: 'image/png', sizes: '48x48', href: '/favicon.png' },
        },
        {
          tag: 'link',
          attrs: { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:image',
            content: ogImageUrl,
          },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:image:width', content: '1200' },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:image:height', content: '630' },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'twitter:card',
            content: 'summary_large_image',
          },
        },
        ...(isBuild ? [{ tag: 'script', content: gaBootstrapScript(GA_MEASUREMENT_ID) }] : []),
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Website home', link: '/' },
            { label: 'Introduction', slug: 'docs' },
            { label: 'Installation', slug: 'docs/installation' },
            { label: 'Quick Start', slug: 'docs/quick-start' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'CLI Reference', slug: 'docs/cli-reference' },
            { label: 'Configuration', slug: 'docs/configuration' },
            { label: 'Discovery and Frameworks', slug: 'docs/discovery-and-frameworks' },
            { label: 'Rules', slug: 'docs/rules' },
            { label: 'Understanding Results', slug: 'docs/understanding-results' },
            { label: 'Reports', slug: 'docs/reports' },
          ],
        },
        {
          label: 'Rules Reference',
          items: [{ autogenerate: { directory: 'docs/reference' } }],
        },
        {
          label: 'Guides',
          items: [
            { label: 'CI and Baselines', slug: 'docs/ci-and-baselines' },
            { label: 'Safety and Limitations', slug: 'docs/safety-and-limitations' },
            { label: 'Troubleshooting', slug: 'docs/troubleshooting' },
            { label: 'Contributing', slug: 'docs/contributing' },
            { label: 'Changelog', link: '/changelog/' },
          ],
        },
      ],
    }),
    sitemap(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
  },
});
