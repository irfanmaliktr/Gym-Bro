const fs = require('fs');
const lines = fs.readFileSync('src/features/session/ActiveSessionPage.tsx', 'utf8').split(/\r?\n/);
for(let i=300;i<420&&i<lines.length;i++) {
  console.log((i+1)+': '+lines[i]);
}
