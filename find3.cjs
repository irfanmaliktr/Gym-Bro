const fs = require('fs');
const s = fs.readFileSync('src/features/routines/RoutineEditorPage.tsx', 'utf8');
const idx = s.indexOf('function NumberField');
if (idx >= 0) {
  console.log(s.substring(idx, idx + 650));
} else {
  console.log('not found');
}
