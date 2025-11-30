const fs = require('fs');
const p = 'C:/VSCProject/webanalyzer/frontend/src/pages/Analyze.jsx';
const lines = fs.readFileSync(p,'utf8').split(/\r?\n/);
let balance=0;
for(let i=0;i<lines.length;i++){
  const line = lines[i];
  const opens = (line.match(/<div(\s|>)/g)||[]).length;
  const closes = (line.match(/<\/div>/g)||[]).length;
  if(opens - closes !== 0){
    balance += opens - closes;
    console.log(`Line ${i+1}: opens=${opens} closes=${closes} balance=${balance}`);
  }
}
console.log('FINAL BALANCE:', balance);
