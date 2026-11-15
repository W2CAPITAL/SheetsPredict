(function(w){
'use strict';
// Review-only coworker console inspired by OpenBot; it does not run OpenBot
// server, Intelligence, computer sandbox, or a second WhatsApp session.
const S={engine:'colibri-local',consent:false,busy:false,worker:null,pending:0,answer:'',request:'',reviewNote:'',approved:false,status:''};
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rules=()=>w.SheetsOpenBotPolicy;
const visible=()=>!!document.querySelector('#openbotWorkbench');
function showStatus(message){
 S.status=String(message||'').slice(0,300);
 const el=document.querySelector('#openbotStatus');if(el)el.textContent=S.status;
}
function ensureLocal(){
 if(!('Worker' in w))throw Error('Navegador sem suporte a Web Workers.');
 if(!navigator.gpu?.requestAdapter)throw Error('WebGPU indisponível. Qwen não será executado na CPU.');
 if(Number(navigator.deviceMemory||0)>0&&Number(navigator.deviceMemory)<8)
  throw Error('Menos de 8 GB detectados. A carga do Qwen foi bloqueada para evitar travamento.');
 return navigator.gpu.requestAdapter({powerPreference:'low-power'}).then(adapter=>{
  if(!adapter)throw Error('Sem adaptador WebGPU. O modelo não será carregado.');
 });
}
async function invokeQwen(prompt,{maxTokens=96}={}){
 await ensureLocal();
 if(!S.consent)throw Error('Autorize a execução local e o download do modelo antes de continuar.');
 if(S.worker)S.worker.terminate();
 const worker=new Worker('/workers/sheets-qwen-0.5b.worker.mjs',{type:'module',name:'sheets-qwen-0.5b'});
 S.worker=worker;const requestId=++S.pending;
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{worker.terminate();if(S.worker===worker)S.worker=null;reject(Error('Qwen excedeu o tempo permitido.'))},480000);
  const done=(error,text)=>{clearTimeout(timer);worker.terminate();if(S.worker===worker)S.worker=null;
    error?reject(Error(error)):resolve(text)};
  worker.onmessage=e=>{
   const m=e.data||{};if(m.requestId!==requestId)return;
   if(m.status==='loading'||m.status==='generating')showStatus(m.message||'Qwen processando no navegador...');
   if(m.status==='progress')showStatus('Download local: '+Math.round(Number(m.progress)||0)+'%');
   if(m.status==='complete')done(null,String(m.text||'').slice(0,2400));
   if(m.status==='error')done(String(m.error||'Motor indisponível'));
  };
  worker.onerror=()=>done('Erro ao carregar Qwen. Nenhuma IA remota será acionada.');
  worker.postMessage({requestId,prompt,history:[],maxTokens:Math.max(16,Math.min(96,maxTokens))});
 });
}
function safeCaseSummary(question,rows){
 const cnj=(String(question||'').match(/\b\d{7}[-.]?\d{2}[.]?\d{4}[.]?\d[.]?\d{2}[.]?\d{4}\b/)||[])[0];
 if(!cnj)return '';
 const digits=cnj.replace(/\D/g,'');
 const matching=(Array.isArray(rows)?rows:[]).filter(row=>{
   const number=String(row?.Protocolo||row?.CNJ||row?.process_number||'').replace(/\D/g,'');
   return number.length===20&&number===digits;
 });
 if(matching.length!==1)return 'Nenhum processo único foi identificado pela numeração CNJ. Confira a carteira antes de responder.';
 const item=matching[0],last=String(item['DataJud • Último Movimento']||item['Último Andamento']||'').trim().slice(0,220);
 const date=String(item['DataJud • Data']||item['Data da Movimentação']||'').slice(0,40);
 return last?('Registro já salvo na planilha: '+last+(date?' · '+date:'')+'. Isso não é uma nova consulta oficial; confira no tribunal antes de informar o cliente.'):
 'Processo encontrado na planilha, mas sem última movimentação comprovada nesta amostra.';
}
function deterministicAnswer(value,context){
 const evidence=safeCaseSummary(value,context.rows?.()||[]);
 return (evidence||'Solicitação recebida. Consulte a fonte oficial do processo e o histórico do cliente antes de preparar uma resposta.')+
   '\\n\\nNenhum andamento novo, prazo, pagamento ou decisão foi confirmado por este motor determinístico.';
}
async function run(context){
 const input=document.querySelector('#obQuestion'),value=input?.value.trim().slice(0,1500)||'';
 if(S.busy||!value){showStatus('Digite uma solicitação.');return}
 S.busy=true;S.answer='';S.approved=false;
 const btn=document.querySelector('#obRun');if(btn)btn.disabled=true;
 try{
  const policy=rules(),plan=policy.routeQuestion(value);
  showStatus('Roteamento: '+plan.role+'. Revisão humana obrigatória.');
  let output;
  if(S.engine==='colibri-local'){
    const colibri=w.SheetsColibriLocal;
    if(!colibri)throw Error('Colibri Local ainda não foi carregado. Atualize esta página.');
    const route=colibri.planColibriLocal({prompt:value,allowLocalModel:S.consent,
      device:{webgpu:!!navigator.gpu?.requestAdapter,memoryGb:Number(navigator.deviceMemory||0)}});
    if(route.engine==='qwen'){
      try{
        output=await invokeQwen(value,{maxTokens:48});
        showStatus('Colibri Local: Qwen 0,5B respondeu via WebGPU. Worker encerrado; modelo fica apenas no cache do navegador.');
      }catch(error){
        output=deterministicAnswer(value,context);
        showStatus('Colibri Local protegeu o aparelho e usou regras leves: '+String(error.message||error).slice(0,130));
      }
    }else{
      output=deterministicAnswer(value,context);
      showStatus('Colibri Local econômico: regras na CPU, sem modelo carregado e sem servidor.');
    }
  }else if(S.engine==='qwen'){
    if(!S.consent)throw Error('Marque a autorização de execução local do Qwen.');
    output=await invokeQwen(value,{maxTokens:48});
    showStatus('Gerado por Qwen 0,5B no navegador. Confira todos os fatos.');
  }else{
    output=deterministicAnswer(value,context);
    showStatus('Motor determinístico: leitura local; nenhuma consulta judicial executada.');
  }
  S.answer=output.slice(0,2500);S.request=value;
  const result=document.querySelector('#obAnswer');if(result)result.textContent=S.answer;
  const approve=document.querySelector('#obApprove');if(approve)approve.disabled=false;
  const reject=document.querySelector('#obReject');if(reject)reject.disabled=false;
 }catch(error){showStatus(String(error.message||error).slice(0,250));}
 finally{S.busy=false;if(btn)btn.disabled=false}
}
function review(decision){
 const reason=document.querySelector('#obReviewNote')?.value.trim()||'';
 if(!S.answer||reason.length<8){showStatus('Registre o motivo da revisão (mínimo de 8 caracteres).');return}
 // No WhatsApp send or CRM mutation. The current page is merely a local draft.
 S.approved=decision==='approved';
 showStatus(decision==='approved'?'Rascunho aprovado localmente. Copie e confira no WhatsApp; nenhum envio registrado.':'Rascunho rejeitado localmente; nada foi enviado.');
 const btn=document.querySelector('#obCopy');if(btn)btn.disabled=!S.approved;
}
function render(root,context={}){
 if(!root||!rules())return;
 root.innerHTML=`
  <section id="openbotWorkbench" class="card" style="padding:22px;max-width:1050px;margin:auto">
   <div class="section-head"><div><span class="eyebrow">SHEETSPREDICT · OPENBOT ADAPTADO</span>
   <h2>Agentes jurídicos e IA local</h2><p>Assistentes com funções fixas e revisão humana. Não executa o backend do OpenBot completo.</p></div></div>
   <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin:20px 0" id="obRoles"></div>
   <div class="card" style="padding:16px;background:var(--surface,#fff);border:1px solid #9a9a9a38;border-radius:12px">
    <h3>Uma sessão WhatsApp</h3><p>WA.Auto do SheetsPredict e ZapFast usam transportes distintos. Para o mesmo número, use apenas uma conexão ativa.</p>
    <a id="obZapfast" href="${escapeHtml(rules().oneSessionUrl())}" target="_blank" rel="noopener noreferrer">Abrir ZapFast · sessão existente</a>
    <span> · </span><a href="/#/wa-auto">Ver WA.Auto do SheetsPredict</a>
   </div>
   <div style="display:grid;gap:12px;margin-top:20px">
    <label for="obEngine">Motor de análise</label>
    <select id="obEngine"><option value="colibri-local">Colibri Local · gratuito, econômico, sem servidor</option><option value="rules">Superagente determinístico · sem modelo</option><option value="qwen">Qwen2.5 0,5B · navegador WebGPU</option></select>
    <label id="obConsentLine" style="display:none"><input type="checkbox" id="obConsent"> Autorizar Qwen 0,5B somente para redação no Colibri Local. Exige WebGPU e pelo menos 8 GB de RAM; sem CPU fallback. Desmarcado: apenas regras leves.</label>
    <label for="obQuestion">Solicitação do operador (não incluir dados sensíveis sem necessidade)</label>
    <textarea id="obQuestion" rows="4" maxlength="1500" placeholder="Ex.: analise o andamento previamente registrado para o CNJ ..."></textarea>
    <button class="btn primary" id="obRun" type="button">Preparar rascunho</button>
    <p id="openbotStatus" role="status">Aguardando solicitação. Nenhuma ação externa autorizada.</p>
    <div class="card" style="padding:14px;border-radius:10px;background:var(--surface,#fff);border:1px solid #9a9a9a38">
     <strong>Rascunho (não enviado)</strong><p id="obAnswer" style="white-space:pre-wrap;overflow-wrap:anywhere"></p>
     <label for="obReviewNote">Motivo da conferência humana</label><textarea id="obReviewNote" rows="2" placeholder="Descreva fontes, lacunas ou revisão necessária"></textarea>
     <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
      <button class="btn" id="obApprove" type="button" disabled>Aprovar apenas para uso manual</button>
      <button class="btn" id="obReject" type="button" disabled>Rejeitar</button>
      <button class="btn" id="obCopy" type="button" disabled>Copiar rascunho aprovado</button>
     </div>
    </div>
   </div>
   <p class="muted" style="margin-top:12px">Colibri Local é um roteador original do SheetsPredict, não o Colibri de servidor do LexisPredict. Disco armazena o modelo em cache; CPU faz as regras e WebGPU executa o Qwen quando permitido. O disco não substitui a RAM. Nenhum modelo é iniciado automaticamente e nenhuma mensagem é enviada ao WhatsApp.</p>
  </section>`;
 const roster=root.querySelector('#obRoles');
 for(const role of rules().ROLES){
  const article=document.createElement('article');article.className='card';
  article.style.padding='12px';
  const title=document.createElement('strong');title.textContent=role.title;
  const description=document.createElement('small');description.textContent='Revisão e consulta · sem envio';
  article.append(title,document.createElement('br'),description);roster.append(article);
 }
 const engine=root.querySelector('#obEngine');
 engine.value=S.engine;
 engine.onchange=()=>{S.engine=engine.value;root.querySelector('#obConsentLine').style.display=(S.engine==='qwen'||S.engine==='colibri-local')?'block':'none';};
 engine.onchange();
 root.querySelector('#obConsent').checked=S.consent;
 root.querySelector('#obConsent').onchange=e=>S.consent=!!e.target.checked;
 root.querySelector('#obRun').onclick=()=>run(context);
 root.querySelector('#obApprove').onclick=()=>review('approved');
 root.querySelector('#obReject').onclick=()=>review('rejected');
 root.querySelector('#obCopy').onclick=async()=>{
  if(!S.approved||!S.answer)return;
  try{await navigator.clipboard.writeText(S.answer);showStatus('Copiado, sem envio. Confira antes de encaminhar.')}
  catch{showStatus('Não foi possível copiar o texto.')}
 };
 showStatus(S.status||'Pronto para revisão humana. Nenhuma mensagem foi enviada.');
 if(S.answer)root.querySelector('#obAnswer').textContent=S.answer;
}
w.SheetsOpenBotWorkspace={render,stop(){if(S.worker)S.worker.terminate();S.worker=null}};
})(window);
