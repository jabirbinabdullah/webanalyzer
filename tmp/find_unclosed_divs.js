const fs = require('fs');
const p = 'C:/VSCProject/webanalyzer/frontend/src/pages/Analyze.jsx';
const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
const stack = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // find all opening <div occurrences
  const openMatches = line.match(/<div(\s|>)/g) || [];
  for (let j = 0; j < openMatches.length; j++)
    stack.push({ line: i + 1, text: line.trim().slice(0, 120) });
  const closeMatches = line.match(/<\/div>/g) || [];
  for (let j = 0; j < closeMatches.length; j++) {
    if (stack.length > 0) stack.pop();
    else console.log('Extra close at', i + 1);
  }
}
if (stack.length === 0) console.log('All divs closed');
else {
  console.log('Unclosed divs count', stack.length);
  console.log(stack);
}
