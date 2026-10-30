const fs = require('fs');
const s = fs.readFileSync('src/features/routines/RoutineEditorPage.tsx', 'utf8');
const idx = s.indexOf('targetSets');
if (idx >= 0) {
  console.log(s.substring(idx - 200, idx + 300));
} else {
  console.log('not found');
}
