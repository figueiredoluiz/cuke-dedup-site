#!/usr/bin/env node
// Regenerates the social preview image (public/images/og.png) from an inline
// SVG base plus the raster icon. Committed output; rerun manually after brand
// changes.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(projectRoot, 'public/images');
const outFile = path.join(outDir, 'og.png');
const iconFile = path.join(projectRoot, 'public/images/icon.png');

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

  <!-- wordmark; the icon is composited to the left by sharp below -->
  <text x="196" y="152" font-family="sans-serif" font-size="58" font-weight="700" fill="#ece9f5">Cuke<tspan fill="#a78bfa">Dedup</tspan></text>

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

const icon = await sharp(iconFile).resize(90, 90).png().toBuffer();

await mkdir(outDir, { recursive: true });
await sharp(Buffer.from(svg))
  .composite([{ input: icon, left: 84, top: 86 }])
  .png()
  .toFile(outFile);
console.log(`Wrote ${path.relative(projectRoot, outFile)}`);
