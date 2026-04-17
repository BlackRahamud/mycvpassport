// One-shot icon generator.
// Run:  npm install --no-save sharp png-to-ico  &&  node scripts/generate-icons.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico').default;

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SVG_PATH = path.join(PUBLIC_DIR, 'favicon.svg');

async function main() {
  const svg = fs.readFileSync(SVG_PATH);

  console.log('→ logo192.png');
  await sharp(svg, { density: 300 })
    .resize(192, 192)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'logo192.png'));

  console.log('→ logo512.png');
  await sharp(svg, { density: 600 })
    .resize(512, 512)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'logo512.png'));

  console.log('→ favicon.ico (32×32)');
  const png32 = await sharp(svg, { density: 200 })
    .resize(32, 32)
    .png()
    .toBuffer();
  const ico = await pngToIco([png32]);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), ico);

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
