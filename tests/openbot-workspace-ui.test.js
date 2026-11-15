const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=x=>fs.readFileSync(path.join(__dirname,'..',x),'utf8');
test('SheetsPredict OpenBot workspace only renders inside the existing authenticated app',()=>{
 assert.match(read('index.html'),/data-view="agents"/);
 assert.match(read('index.html'),/lib\/openbot-workspace\.js/);
 assert.match(read('app.js'),/renderOpenBotAgents/);
 const ui=read('lib/openbot-workspace.js');
 assert.match(ui,/SheetsOpenBotPolicy/);
 assert.match(ui,/sheets-qwen-0\.5b\.worker\.mjs/);
 assert.match(ui,/ensureLocal/);
 assert.match(ui,/oneSessionUrl/);
 assert.doesNotMatch(ui,/sendMessage\(|\/api\/wa-auto.*send|fetch\(.*\/api\/wa-auto/);
});
