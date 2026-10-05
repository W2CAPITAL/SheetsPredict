const fs=require("node:fs");
const path=require("node:path");

const ROOT=path.resolve(__dirname,"..");
const OUT=path.join(ROOT,"dist");
const PUBLIC_FILES=[
  "index.html","app.js","styles.css","sw.js","manifest.webmanifest","installer.html"
];
const PUBLIC_DIRS=[
  "assets","agenda","analise","cases","central","clientes","documentos","financeiro",
  "pipeline","processos-empresa","processos","report","scanner","studio","tarefas"
];
const PUBLIC_LIB_FILES=[
  "device-profile.js",
  "needle-router.js",
  "crm-model.js",
  "task-priority.js",
  "suggest-response.js",
  "sheets-hub.js",
  "predict-learning-pack.js",
  "predict-studio-catalog.js",
  "predict-runtime.js",
  "predict-studio.js",
  "wa-auto.js",
  "legal-document-generator.js"
];

fs.rmSync(OUT,{recursive:true,force:true});
fs.mkdirSync(OUT,{recursive:true});

for(const rel of PUBLIC_FILES){
  const src=path.join(ROOT,rel);
  if(fs.existsSync(src))fs.copyFileSync(src,path.join(OUT,rel));
}
for(const rel of PUBLIC_DIRS){
  const src=path.join(ROOT,rel);
  if(fs.existsSync(src))fs.cpSync(src,path.join(OUT,rel),{recursive:true});
}

const libOut=path.join(OUT,"lib");
fs.mkdirSync(libOut,{recursive:true});
for(const file of PUBLIC_LIB_FILES){
  const src=path.join(ROOT,"lib",file);
  if(!fs.existsSync(src))throw new Error("Browser asset ausente: lib/"+file);
  fs.copyFileSync(src,path.join(libOut,file));
}

console.log("[cloudflare] static assets prepared",{
  out:OUT,
  files:PUBLIC_FILES.length,
  directories:PUBLIC_DIRS.length,
  browserLibFiles:PUBLIC_LIB_FILES.length
});
