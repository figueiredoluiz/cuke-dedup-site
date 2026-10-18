#!/usr/bin/env node
// Regenerates the social preview image (public/images/og.png) from an inline
// SVG. Committed output; rerun manually after brand changes.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(projectRoot, 'public/images');
const outFile = path.join(outDir, 'og.png');

const mark = `
  <g transform="translate(84,84) scale(2.6)">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#8b5cf6"/>
        <stop offset="1" stop-color="#6d28d9"/>
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="8" fill="url(#bg)"/>
    <g stroke="#f5f3ff" stroke-width="1.8" fill="none" stroke-linecap="round">
      <circle cx="16" cy="16" r="8.5" stroke-opacity="0.9"/>
      <circle cx="16" cy="16" r="4.5" stroke-opacity="0.45"/>
    </g>
    <g fill="#f5f3ff">
      <circle cx="16" cy="11.5" r="1.1"/><circle cx="20.4" cy="14.1" r="1.1"/>
      <circle cx="18.7" cy="19.1" r="1.1"/><circle cx="13.3" cy="19.1" r="1.1"/>
      <circle cx="11.6" cy="14.1" r="1.1"/><circle cx="16" cy="16" r="1.4"/>
    </g>
  </g>
`;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <radialGradient id="glow" cx="28%" cy="0%" r="85%">
      <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#0d0b14"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  ${mark}
  <text x="190" y="152" font-family="sans-serif" font-size="58" font-weight="700" fill="#ece9f5">Cuke<tspan fill="#a78bfa">Dedup</tspan></text>

  <!-- tagline -->
  <text x="90" y="300" font-family="sans-serif" font-size="44" fill="#a49bba">Find duplicate step definitions. Remove ambiguity.</text>
  <text x="90" y="362" font-family="sans-serif" font-size="44" fill="#a49bba">Keep your Cucumber suite maintainable.</text>

  <!-- terminal hint -->
  <rect x="90" y="430" width="560" height="84" rx="12" fill="#0a0810" stroke="#241d36" stroke-width="2"/>
  <text x="122" y="481" font-family="monospace" font-size="30" fill="#a78bfa">$ npx cuke-dedup .</text>

  <!-- domain -->
  <text x="90" y="576" font-family="monospace" font-size="26" fill="#a49bba">cukededup.dev</text>
</svg>
`;

await mkdir(outDir, { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(outFile);
console.log(`Wrote ${path.relative(projectRoot, outFile)}`);
