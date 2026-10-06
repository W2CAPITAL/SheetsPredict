const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.join(__dirname,"..");
const config=JSON.parse(fs.readFileSync(path.join(root,"wrangler.jsonc"),"utf8"));
assert.equal(config.name,"sheetspredict");
assert.equal(config.main,"cloudflare/worker.js");
assert.ok(config.compatibility_flags.includes("nodejs_compat"));
assert.equal(config.assets.directory,"./dist");
assert.equal(config.assets.binding,"ASSETS");
assert.equal(config.assets.not_found_handling,"single-page-application");
assert.ok(config.assets.run_worker_first.includes("/api/*"));

const worker=fs.readFileSync(path.join(root,"cloudflare","worker.js"),"utf8");
for(const route of [
  "/api/config","/api/datajud-search","/api/datajud-status","/api/datajud",
  "/api/djen-search","/api/djen","/api/health","/api/integration-hub",
  "/api/judicial-scan","/api/predict-studio","/api/sheets",
  "/api/v1/comunicacao","/api/wa-auto"
]) assert.ok(worker.includes(route),"Worker sem rota "+route);

const build=fs.readFileSync(path.join(root,"scripts","build-cloudflare.js"),"utf8");
for(const asset of ["index.html","app.js","styles.css","sw.js","manifest.webmanifest"]){
  assert.ok(build.includes(asset),"build Cloudflare não inclui "+asset);
}
assert.ok(!build.includes('"api"'),"api não deve ser copiada como asset público");
for(const asset of [
  "device-profile.js","needle-router.js","crm-model.js","task-priority.js",
  "suggest-response.js","sheets-hub.js","predict-learning-pack.js",
  "predict-studio-catalog.js","predict-runtime.js","predict-studio.js",
  "wa-auto.js","legal-document-generator.js"
]) assert.ok(build.includes(asset),"browser lib não publicada: "+asset);
assert.ok(!/fs\.cpSync\([^\n]*["']lib["']/.test(build),"diretório lib completo não deve ser publicado");

const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
assert.equal(pkg.scripts["cf:build"],"node scripts/build-cloudflare.js");
assert.match(pkg.scripts["deploy:cloudflare"],/wrangler deploy/);

console.log("cloudflare-deploy: ok");

const workerEnvContract=worker;
for(const key of [
  "LEXIS_APPS_SCRIPT_URL","LEXIS_SHEETS_TOKEN","LEXIS_SHEET_URL",
  "DJEN_UPSTREAM","DATAJUD_API_KEY","PREDICTLM_URL","PREDICTLM_API_KEY",
  "LEXISPREDICT_URL","LEXISPREDICT_API_KEY","WA_AUTO_URL","GREY_URL","GREY_API_KEY"
]){
  assert.ok(workerEnvContract.includes('"'+key+'"'),"Worker não sincroniza runtime env: "+key);
}
assert.match(workerEnvContract,/syncRuntimeEnv\(env\)/,"Worker deve sincronizar runtime env antes das rotas");

assert.equal(config.keep_vars,true,"Wrangler deve preservar Runtime Variables/Secrets cadastrados no dashboard");
