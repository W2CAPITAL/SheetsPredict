const test=require('node:test'),assert=require('node:assert/strict');
const {planColibriLocal,COLIBRI_LOCAL_POLICY}=require('../lib/colibri-local.js');
test('free Colibri browser mode is deterministic by default',()=>{
 const x=planColibriLocal({prompt:'Meu processo está parado?',allowLocalModel:false,device:{webgpu:true,memoryGb:16}});
 assert.equal(x.engine,'rules');
 assert.equal(x.offline,true);
 assert.equal(x.needsServer,false);
});
test('requires explicit model consent and safe local hardware to load quantized Qwen',()=>{
 const x={prompt:'Reescreva uma mensagem para cliente em linguagem simples',allowLocalModel:true,device:{webgpu:true,memoryGb:8}};
 assert.equal(planColibriLocal(x).engine,'qwen');
 assert.equal(planColibriLocal({...x,allowLocalModel:false}).engine,'rules');
 assert.equal(planColibriLocal({...x,device:{webgpu:true,memoryGb:4}}).engine,'rules');
 assert.equal(planColibriLocal({...x,device:{webgpu:false,memoryGb:16}}).engine,'rules');
 assert.equal(planColibriLocal({...x,device:{webgpu:true,memoryGb:0}}).engine,'rules');
 assert.ok(COLIBRI_LOCAL_POLICY.maxNewTokens<=48);
 assert.equal(COLIBRI_LOCAL_POLICY.cacheRole,'weights_only');
});
