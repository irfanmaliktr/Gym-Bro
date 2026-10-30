const fs = require('fs');
const s = fs.readFileSync('src/features/session/ActiveSessionPage.tsx', 'utf8');
const idx = s.indexOf('w-full max-w-[64px]');
if (idx >= 0) {
  console.log(s.substring(idx - 200, idx + 500));
} else {
  console.log('not found');
}
