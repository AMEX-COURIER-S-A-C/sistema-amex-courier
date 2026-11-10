---
type: "query"
date: "2026-11-04T23:02:27.460214+00:00"
question: "analiza todo y dime todos los servicios que se estan utilizando actualmetne por ejemplo vercel supabase sentry hostinger etc, listame todos"
contributor: "graphify"
outcome: "useful"
source_nodes: ["supabase", "openai", "resend", "sentry.server.config.ts", "testCloudflare()", "tib-mirror-daemon.mjs", "vercel.json", "testGitHub()", "Despliegue en VPS (Hostinger / Ubuntu)"]
---

# Q: analiza todo y dime todos los servicios que se estan utilizando actualmetne por ejemplo vercel supabase sentry hostinger etc, listame todos

## Answer

Expanded from original query via graph vocabulary: [cloudflare, github, hostinger, openai, render, resend, sentry, supabase, tib, vercel, whatsapp]. ERP active code/config includes Supabase (database, auth, realtime), Cloudflare R2, OpenAI, Sentry, Resend, TIB Courier API, Vercel app/env sync, GitHub Actions and GHCR worker image. Render is the documented worker image target; VPS/Hostinger deployment scripts also exist. The credential-check script probes GitHub, Cloudflare, Vercel, Supabase management, Gemini, TIB, Resend, Sentry, and VPS connectivity; those probes do not prove the remote credentials are valid. Kambista is a local manual exchange-rate helper, not a live API integration.

## Outcome

- Signal: useful

## Source Nodes

- supabase
- openai
- resend
- sentry.server.config.ts
- testCloudflare()
- tib-mirror-daemon.mjs
- vercel.json
- testGitHub()
- Despliegue en VPS (Hostinger / Ubuntu)