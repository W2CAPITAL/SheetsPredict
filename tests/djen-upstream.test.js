const assert=require("node:assert/strict");
const {DJEN_DEFAULT_URL,configuredDjenUrl}=require("../lib/djen");

assert.equal(
  configuredDjenUrl("https://comunicaapi.pje.jus.br/api/v1/comunicacao"),
  DJEN_DEFAULT_URL
);
assert.equal(
  configuredDjenUrl("https://hcomunicaapi.cnj.jus.br/api/v1/comunicacao"),
  DJEN_DEFAULT_URL
);
assert.equal(configuredDjenUrl(""),DJEN_DEFAULT_URL);
assert.equal(configuredDjenUrl("not-a-url"),DJEN_DEFAULT_URL);

console.log("djen-upstream: ok");
