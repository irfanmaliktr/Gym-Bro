const fs = require('fs');
const sharp = require('sharp');
const src = 'public/my-gymbro-icon.png';

async function run() {
  // Generate standard icons
  await sharp(src).resize(192, 192, { fit: 'cover' }).png().toFile('public/icon-192.png');
  await sharp(src).resize(512, 512, { fit: 'cover' }).png().toFile('public/icon-512.png');
  
  // Generate maskable icons with padding (safe area ~80% of canvas)
  // Create with background and center the image with padding
  const bg = { r: 10, g: 10, b: 10, alpha: 1 };
  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: bg
    }
  })
    .composite([{
      input: await sharp(src).resize(154, 154, { fit: 'contain' }).png().toBuffer(),
      top: 19,
      left: 19
    }])
    .png()
    .toFile('public/icon-192-maskable.png');
  
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: bg
    }
  })
    .composite([{
      input: await sharp(src).resize(410, 410, { fit: 'contain' }).png().toBuffer(),
      top: 51,
      left: 51
    }])
    .png()
    .toFile('public/icon-512-maskable.png');
  
  console.log('done');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
