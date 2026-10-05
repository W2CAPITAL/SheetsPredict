const http=require("node:http");
const fs=require("node:fs");
const path=require("node:path");

const ROOT=__dirname;
const PORT=Math.max(1,Number(process.env.PORT)||3000);
const MAX_BODY=2_000_000;

const apiRoutes=new Map([
  ["/api/config",require("./api/config")],
  ["/api/datajud-search",require("./api/datajud-search")],
  ["/api/datajud-status",require("./api/datajud-status")],
  ["/api/datajud",require("./api/datajud")],
  ["/api/djen-search",require("./api/djen-search")],
  ["/api/djen",require("./api/djen")],
  ["/api/health",require("./api/health")],
  ["/api/integration-hub",require("./api/integration-hub")],
  ["/api/judicial-scan",require("./api/judicial-scan")],
  ["/api/predict-studio",require("./api/predict-studio")],
  ["/api/sheets",require("./api/sheets")],
  ["/api/v1/comunicacao",require("./api/v1/comunicacao")],
  ["/api/wa-auto",require("./api/wa-auto")]
]);

const MIME={
  ".html":"text/html; charset=utf-8",".js":"application/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",
  ".webmanifest":"application/manifest+json; charset=utf-8",".svg":"image/svg+xml",
  ".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",
  ".ico":"image/x-icon",".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf",
  ".txt":"text/plain; charset=utf-8"
};
const BLOCKED_PREFIXES=["api/","lib/","tests/","skills/",".github/","node_modules/"];
const BLOCKED_FILES=new Set(["package.json","package-lock.json","server.js","installer-script.txt","README.md","LICENSE"]);

function jsonBody(req){
  return new Promise((resolve,reject)=>{
    const chunks=[];let size=0;
    req.on("data",chunk=>{
      size+=chunk.length;
      if(size>MAX_BODY){
        const err=new Error("Payload grande demais.");err.status=413;reject(err);req.destroy();return;
      }
      chunks.push(chunk);
    });
    req.on("end",()=>{
      if(!chunks.length)return resolve({});
      const raw=Buffer.concat(chunks).toString("utf8");
      const type=String(req.headers["content-type"]||"").toLowerCase();
      if(type.includes("application/json")||raw.trim().startsWith("{")||raw.trim().startsWith("[")){
        try{return resolve(JSON.parse(raw||"{}"))}catch{
          const err=new Error("JSON inválido.");err.status=400;return reject(err);
        }
      }
      resolve(raw);
    });
    req.on("error",reject);
  });
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
function enhanceResponse(res){
  res.status=function(code){res.statusCode=Number(code)||200;return res};
  res.json=function(payload){
    if(!res.headersSent)res.setHeader("Content-Type","application/json; charset=utf-8");
    res.end(JSON.stringify(payload));
    return res;
  };
  return res;
}
function safeStaticPath(pathname){
  let decoded;
  try{decoded=decodeURIComponent(pathname)}catch{return null}
  const rel=decoded.replace(/^\/+/, "")||"index.html";
  const normalized=path.posix.normalize(rel).replace(/^\.\.\/+/, "");
  if(normalized.includes("\0")||normalized.startsWith("../"))return null;
  if(BLOCKED_FILES.has(normalized)||BLOCKED_PREFIXES.some(prefix=>normalized.startsWith(prefix)))return null;
  return normalized;
}
function sendFile(req,res,rel){
  const file=path.join(ROOT,rel);
  if(!file.startsWith(ROOT+path.sep)&&file!==ROOT)return false;
  let stat;try{stat=fs.statSync(file)}catch{return false}
  if(!stat.isFile())return false;
  const ext=path.extname(file).toLowerCase();
  if(!MIME[ext])return false;
  res.statusCode=200;
  res.setHeader("Content-Type",MIME[ext]);
  res.setHeader("X-Content-Type-Options","nosniff");
  if(rel==="index.html"||rel==="sw.js")res.setHeader("Cache-Control","no-cache");
  else res.setHeader("Cache-Control","public, max-age=3600");
  if(req.method==="HEAD")return res.end(),true;
  fs.createReadStream(file).pipe(res);
  return true;
}

const server=http.createServer(async(req,res)=>{
  enhanceResponse(res);
  const proto=String(req.headers["x-forwarded-proto"]||"https").split(",")[0].trim();
  const host=String(req.headers["x-forwarded-host"]||req.headers.host||"localhost").split(",")[0].trim();
  let url;
  try{url=new URL(req.url||"/",proto+"://"+host)}catch{
    return res.status(400).json({ok:false,error:"URL inválida"});
  }

  const handler=apiRoutes.get(url.pathname.replace(/\/$/,""));
  if(handler){
    try{
      req.query=queryObject(url);
      if(!["GET","HEAD"].includes(String(req.method||"GET").toUpperCase()))req.body=await jsonBody(req);
      else req.body={};
      return await handler(req,res);
    }catch(e){
      if(res.writableEnded)return;
      return res.status(Number(e?.status)||500).json({ok:false,error:e?.message||"Falha interna"});
    }
  }

  if(!["GET","HEAD"].includes(String(req.method||"GET").toUpperCase())){
    return res.status(405).json({ok:false,error:"Método não permitido"});
  }

  const rel=safeStaticPath(url.pathname);
  if(rel&&sendFile(req,res,rel))return;

  // SPA fallback. Hash routes como /#/cases chegam ao servidor como "/".
  if(!path.extname(url.pathname)){
    if(sendFile(req,res,"index.html"))return;
  }
  res.statusCode=404;
  res.setHeader("Content-Type","text/plain; charset=utf-8");
  res.end("Not Found");
});

server.listen(PORT,"0.0.0.0",()=>{
  console.log("[sheetspredict] listening",{port:PORT,runtime:"node",host:"0.0.0.0"});
});
