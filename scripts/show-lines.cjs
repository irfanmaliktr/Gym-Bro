const fs = require('fs');
const lines = fs.readFileSync('src/features/progress/ProgressPage.tsx', 'utf8').split(/\r?\n/);
for(let i=350;i<400&&i<lines.length;i++) {
  console.log((i+1)+': '+lines[i]);
}
