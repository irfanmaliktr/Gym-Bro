import fs from 'fs';
import sharp from 'sharp';
const svg = fs.readFileSync('public/gymbro-icon.svg');
await Promise.all([
  sharp(svg).resize(192,192).png().toFile('public/icon-192.png'),
  sharp(svg).resize(512,512).png().toFile('public/icon-512.png'),
]);
console.log('done');
