(function(root){
'use strict';
// Local original coordinator, NOT the LexisPredict remote Colibri API.
// CPU handles deterministic routing; disk cache stores weights; Qwen inference
// still requires working RAM and WebGPU, with no unsafe CPU fallback.
const COLIBRI_LOCAL_POLICY=Object.freeze({
 free:true,needsServer:false,requiresWebGpu:true,minimumMemoryGb:8,
 maxNewTokens:48,cacheRole:'weights_only',maxParallelModels:1,
 writesWhatsApp:false,sharesDataWithAIProvider:false
});
const writing=/reescrev|redig|reformul|simplifi|melhor(e|ar) (o |a )?(texto|mensagem)|linguagem simples|tom (mais )?(claro|respeitoso)|transform(e|ar) (o |a )?(texto|mensagem)/i;
function planColibriLocal({prompt='',allowLocalModel=false,device={}}={}){
 const memory=Number(device.memoryGb),compatible=device.webgpu===true&&Number.isFinite(memory)&&memory>=COLIBRI_LOCAL_POLICY.minimumMemoryGb;
 const wantsModel=writing.test(String(prompt).slice(0,1500));
 return {engine:allowLocalModel&&compatible&&wantsModel?'qwen':'rules',offline:true,needsServer:false,autoSend:false,requiresReview:true,
  modelDownloadRequiresConsent:true,maxNewTokens:COLIBRI_LOCAL_POLICY.maxNewTokens,
  reason:!wantsModel?'deterministic_legal_check':!allowLocalModel?'model_not_authorized':!compatible?'hardware_not_safe':'local_qwen_optional'};
}
const api={planColibriLocal,COLIBRI_LOCAL_POLICY};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.SheetsColibriLocal=api;
})(typeof window!=='undefined'?window:null);
