# Cloudflare Workers deployment

SheetsPredict can run on Cloudflare Workers with Static Assets without removing the existing Vercel configuration.

## Dashboard setup

When connecting `W2CAPITAL/SheetsPredict` in **Workers & Pages → Create application → Import repository**:

- Project name: `sheetspredict`
- Root directory: `/`
- Build command: `npm run deploy:cloudflare`
- Preview builds: optional
- Cloudflare Access: leave disabled unless you intentionally want Cloudflare login in front of the app

The repository contains `wrangler.jsonc`. The deploy script prepares a safe static `dist/` directory, then Wrangler deploys the Worker.

## Runtime layout

- Static SPA/PWA files → Cloudflare Static Assets
- `/api/*` → `cloudflare/worker.js`
- Existing API modules are reused through a small req/res compatibility adapter
- `nodejs_compat` keeps current Node-oriented modules such as `node:crypto`, `Buffer`, and `process.env`

## Required variables/secrets

Configure the same server-side values previously used in Vercel under **Worker → Settings → Variables and Secrets**.

Core:
- `LEXIS_SHEETS_TOKEN` — secret
- `LEXIS_APPS_SCRIPT_URL`
- `LEXIS_SHEET_URL` when used
- `DATAJUD_API_KEY` — secret when configured
- `DJEN_UPSTREAM` optional; default already exists in code

Optional integrations:
- `PREDICTLM_URL`
- `PREDICTLM_API_KEY` — secret
- `LEXISPREDICT_URL`
- `LEXISPREDICT_API_KEY` — secret
- `WA_AUTO_URL`
- `GREY_URL`
- `GREY_API_KEY` — secret
- `LEADCHECKIN_URL`
- `SHEETSPREDICT_AI_BASE_URL`
- `SHEETSPREDICT_AI_API_KEY` — secret
- `SHEETSPREDICT_AI_MODEL`
- `SHEETSPREDICT_AI_NAME`
- `KHOJ_URL`
- `KHOJ_TOKEN` — secret
- `KHOJ_AGENT_SLUG`

Do not commit real credentials to GitHub or `wrangler.jsonc`.

## Local checks

```bash
npm test
npm run cf:build
npx wrangler deploy --dry-run
```

The old `vercel.json` remains in the repository so the same source can still deploy to Vercel if that workspace is reactivated later.


## Runtime variables managed in the dashboard

Production secrets and runtime variables are intentionally managed in Cloudflare **Settings → Variables and Secrets**, not committed to Git.

The Wrangler configuration uses `keep_vars: true` so Git-based `wrangler deploy` runs preserve values already configured in the Cloudflare dashboard.

Do not copy real API keys, tokens, or credentials into the `vars` block of `wrangler.jsonc`.
