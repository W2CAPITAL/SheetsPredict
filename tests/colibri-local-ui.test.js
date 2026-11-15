const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('SheetsPredict starts free Colibri Local with no Qwen initialization before consent',()=>{
 const ui=read('lib/openbot-workspace.js');
 assert.match(ui,/engine:'colibri-local'/);
 assert.match(ui,/SheetsColibriLocal/);
 assert.match(ui,/value="colibri-local"/);
 assert.match(ui,/maxTokens:48/);
 assert.doesNotMatch(ui,/fetch\(.*api\/superagente/);
 assert.match(read('index.html'),/lib\/colibri-local\.js/);
 assert.match(read('scripts/build-cloudflare.js'),/colibri-local\.js/);
});
