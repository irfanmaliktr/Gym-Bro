const fs = require('fs');
const s = fs.readFileSync('src/features/progress/ProgressPage.tsx', 'utf8');
const idx = s.indexOf('bodyweightWeight');
if (idx >= 0) {
  console.log(s.substring(idx - 50, idx + 200));
}
