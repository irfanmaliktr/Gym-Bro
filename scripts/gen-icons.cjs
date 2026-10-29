const fs = require('fs');
const sharp = require('sharp');
const svg = fs.readFileSync('public/gymbro-icon.svg');
Promise.all([
  sharp(svg).resize(192, 192).png().toFile('public/icon-192.png'),
  sharp(svg).resize(512, 512).png().toFile('public/icon-512.png'),
  sharp(svg).resize(192, 192).png().toFile('public/icon-192-maskable.png'),
  sharp(svg).resize(512, 512).png().toFile('public/icon-512-maskable.png'),
]).then(() => {
  console.log('done');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
