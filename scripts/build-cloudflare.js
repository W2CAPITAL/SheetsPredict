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

console.log("[cloudflare] static assets prepared",{
  out:OUT,
  files:PUBLIC_FILES.length,
  directories:PUBLIC_DIRS.length
});
