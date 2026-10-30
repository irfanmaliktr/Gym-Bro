const fs = require('fs');
const lines = fs.readFileSync('src/lib/units.ts', 'utf8').split(/\r?\n/);
for(let i=0;i<150&&i<lines.length;i++) {
  console.log((i+1)+': '+lines[i]);
}
