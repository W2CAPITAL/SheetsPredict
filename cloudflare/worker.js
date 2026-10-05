import configHandler from "../api/config.js";
import datajudSearchHandler from "../api/datajud-search.js";
import datajudStatusHandler from "../api/datajud-status.js";
import datajudHandler from "../api/datajud.js";
import djenSearchHandler from "../api/djen-search.js";
import djenHandler from "../api/djen.js";
import healthHandler from "../api/health.js";
import integrationHubHandler from "../api/integration-hub.js";
import judicialScanHandler from "../api/judicial-scan.js";
import predictStudioHandler from "../api/predict-studio.js";
import sheetsHandler from "../api/sheets.js";
import comunicacaoHandler from "../api/v1/comunicacao.js";
import waAutoHandler from "../api/wa-auto.js";

const MAX_BODY=2_000_000;
const apiRoutes=new Map([
  ["/api/config",configHandler],
  ["/api/datajud-search",datajudSearchHandler],
  ["/api/datajud-status",datajudStatusHandler],
  ["/api/datajud",datajudHandler],
  ["/api/djen-search",djenSearchHandler],
  ["/api/djen",djenHandler],
  ["/api/health",healthHandler],
  ["/api/integration-hub",integrationHubHandler],
  ["/api/judicial-scan",judicialScanHandler],
  ["/api/predict-studio",predictStudioHandler],
  ["/api/sheets",sheetsHandler],
  ["/api/v1/comunicacao",comunicacaoHandler],
  ["/api/wa-auto",waAutoHandler]
]);

function headersObject(headers){
  const out={};
  for(const [key,value] of headers.entries())out[key.toLowerCase()]=value;
  return out;
}
function queryObject(url){
  const out={};
  for(const [k,v] of url.searchParams){
    if(Object.prototype.hasOwnProperty.call(out,k)){
      out[k]=Array.isArray(out[k])?[...out[k],v]:[out[k],v];
    }else out[k]=v;
  }
  return out;
}
async function requestBody(request){
  if(["GET","HEAD"].includes(request.method.toUpperCase()))return {};
  const raw=await request.text();
  if(new TextEncoder().encode(raw).byteLength>MAX_BODY){
    const err=new Error("Payload grande demais.");err.status=413;throw err;
  }
  if(!raw)return {};
  const type=String(request.headers.get("content-type")||"").toLowerCase();
  if(type.includes("application/json")||raw.trim().startsWith("{")||raw.trim().startsWith("[")){
    try{return JSON.parse(raw)}catch{
      const err=new Error("JSON inválido.");err.status=400;throw err;
    }
  }
  return raw;
}
function responseAdapter(){
  let statusCode=200;
  let payload="";
  let ended=false;
  const headers=new Headers();
  const res={
    writableEnded:false,
    status(code){statusCode=Number(code)||200;return res;},
    setHeader(name,value){
      if(Array.isArray(value)){
        headers.delete(name);
        for(const item of value)headers.append(name,String(item));
      }else headers.set(name,String(value));
      return res;
    },
    json(value){
      if(!headers.has("content-type"))headers.set("Content-Type","application/json; charset=utf-8");
      payload=JSON.stringify(value);
      ended=true;
      res.writableEnded=true;
      return res;
    },
    end(value=""){
      payload=value==null?"":String(value);
      ended=true;
      res.writableEnded=true;
      return res;
    }
  };
  return {
    res,
    toResponse(){
      if(!ended&&statusCode===204)return new Response(null,{status:204,headers});
      return new Response(payload,{status:statusCode,headers});
    }
  };
}

async function runApi(request){
  const url=new URL(request.url);
  const path=url.pathname.replace(/\/$/,"")||"/";
  const handler=apiRoutes.get(path);
  if(!handler)return new Response(JSON.stringify({ok:false,error:"Rota de API não encontrada"}),{
    status:404,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}
  });

  const headers=headersObject(request.headers);
  headers.host??=url.host;
  headers["x-forwarded-host"]??=url.host;
  headers["x-forwarded-proto"]??=url.protocol.replace(":","");

  const req={
    method:request.method,
    headers,
    query:queryObject(url),
    body:await requestBody(request)
  };
  const adapter=responseAdapter();
  try{
    await handler(req,adapter.res);
  }catch(error){
    if(adapter.res.writableEnded)return adapter.toResponse();
    adapter.res.status(Number(error?.status)||500).json({
      ok:false,
      error:error?.message||"Falha interna"
    });
  }
  return adapter.toResponse();
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==="/api"||url.pathname.startsWith("/api/")){
      return runApi(request);
    }
    return env.ASSETS.fetch(request);
  }
};
