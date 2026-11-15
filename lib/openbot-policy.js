(function(root){
'use strict';
// Browser-safe policy: no WA.Auto connection, QR code, bulk messaging or automatic sends.
const ROLES=Object.freeze([
{id:'identity',title:'Identificação do cliente'},
{id:'official',title:'DataJud / DJEN'},
{id:'memory',title:'Memória e atividades'},
{id:'writer',title:'Texto simples'},
{id:'review',title:'Revisão jurídica'},
{id:'audit',title:'Auditoria de atendimento'}
].map(x=>Object.freeze({...x,canSend:false})));
const oneSessionUrl=()=> 'https://zapfast-cloudflare-web.daviconcentrix.workers.dev/';
function routeQuestion(value){
 const q=String(value||'');
 const critical=/pagamento|honor[aá]rio|pix|saque|senten[cç]a|recurso|prazo|bloqueio|acordo|dispar[eo]|lote|todos os clientes/i.test(q);
 return {role:critical?'review':/whatsapp|cliente|mensagem|responda|atendimento/i.test(q)?'writer':'official',
 review:true,send:false,legal:/processo|andamento|movimenta[cç][aã]o|djen|datajud|senten[cç]a/i.test(q)};
}
function validateApproval(draft,{processId,now=new Date()}={}){
 const deny=reason=>({allowed:false,reason,send:false});
 if(draft?.kind!=='draft'||!/^[0-9]+@(s\.whatsapp\.net|lid)$/.test(draft.jid||''))return deny('private_draft_required');
 if(!processId||String(draft.processId)!==String(processId))return deny('wrong_process');
 if(!['DataJud','DJEN','tribunal'].includes(draft.source))return deny('official_evidence_required');
 const at=Date.parse(draft.checkedAt||'');
 if(!Number.isFinite(at)||at>now.getTime()+300000||now.getTime()-at>7*86400000)return deny('stale_evidence');
 return {allowed:true,reason:'manual_draft_only',send:false};
}
const api={ROLES,routeQuestion,validateApproval,oneSessionUrl};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.SheetsOpenBotPolicy=api;
})(typeof window!=='undefined'?window:null);
