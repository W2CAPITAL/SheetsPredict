const test=require('node:test'),assert=require('node:assert/strict');
const {ROLES,routeQuestion,validateApproval,oneSessionUrl}=require('../lib/openbot-policy.js');
test('Sheetspredict has six readonly work roles',()=>{
 assert.equal(ROLES.length,6); assert.ok(ROLES.every(x=>x.canSend===false));
});
test('only explicitly requested local AI may use browser',()=>{
 const p=routeQuestion('Qual a última movimentação do meu processo?');
 assert.equal(p.review,true); assert.equal(p.send,false);
 assert.equal(routeQuestion('Dispare para todos os clientes').send,false);
});
test('approval limited to a single message and exact linked process',()=>{
 const a={kind:'draft',source:'DataJud',checkedAt:'2026-11-15T12:00:00Z',processId:'123',jid:'5511999999999@s.whatsapp.net'};
 assert.equal(validateApproval(a,{processId:'123',now:new Date('2026-11-15T13:00:00Z')}).allowed,true);
 assert.equal(validateApproval({...a,jid:'1@g.us'},{processId:'123',now:new Date('2026-11-15T13:00:00Z')}).allowed,false);
 assert.equal(validateApproval({...a,source:'internal-note'},{processId:'123',now:new Date('2026-11-15T13:00:00Z')}).allowed,false);
 assert.equal(oneSessionUrl().includes('zapfast-cloudflare-web.daviconcentrix.workers.dev'),true);
});
