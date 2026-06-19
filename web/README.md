# Meu-Lutador — Web (Phase 4)

Mobile-first Next.js (App Router) + Tailwind v4 + Framer Motion frontend for the
"Octógono dos Sonhos" game. Talks to the `ml-api` Supabase Edge Function.

Flow: **sortear** (categoria + era) → **montar** seu lutador escolhendo, por
atributo, de qual fera real herdar o valor → **simular** → assistir ao log
animado da luta + narração.

## Run

```
cd web
npm install
cp .env.local.example .env.local   # defaults already point at the live backend
npm run dev                        # http://localhost:3000
```

The defaults in `.env.local.example` use the live project + public anon key, so
it works out of the box. Deploy anywhere that runs Next.js (e.g. Vercel) — set
the two `NEXT_PUBLIC_*` env vars there.

> Note: the AI narration only appears if `ANTHROPIC_API_KEY` is set as a secret
> on the `ml-api` Edge Function. Without it, fights still simulate and show the
> full structured play-by-play.
