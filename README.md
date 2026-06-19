# Meu-Lutador — "Octógono dos Sonhos"

Data foundation (Phase 0–1) for a UFC/MMA fantasy fighter-builder. Ingests real
ufcstats data into Postgres (Supabase) and computes per-fighter attribute scores
with confidence flags. No simulation engine / API / frontend yet — those are
later phases.

## Data source

The 6 CSVs in `data/raw/` come from the public
[`Greco1899/scrape_ufc_stats`](https://github.com/Greco1899/scrape_ufc_stats)
dataset (GPL-3.0 code — we use only its generated **data**, with our own parser).

## Database

Supabase project `AtomicMoriarty's Project` (`nozthsissdwkfwtogmdu`), all objects
in a dedicated **`meu_lutador`** schema so they don't collide with the other app
in that project's `public` schema. Migrations: `db/migrations/`.

## Pipeline

```
npm install
cp .env.example .env   # fill in SUPABASE_URL + a key with write access
npm run ingest         # CSVs -> fighters, events, fights, fight_round_stats
npm run elo            # chronological Elo -> fighter_ratings
npm run attributes     # §5.4 attribute formulas -> attribute_scores
npm run charisma       # curated mic-skills -> charisma_scores
# or: npm run pipeline
```

### Key data-shape notes
- Fighters have no IDs in the CSVs; the ufcstats profile-URL hex slug is the
  natural key, and we derive a deterministic UUID from it.
- Fight participants are referenced by **name** (inside the `BOUT` string), so
  names are resolved to fighters; unresolved/ambiguous names are logged to
  `meu_lutador.ingest_unresolved`.
- Stat cells are encoded strings (`"9 of 9"`, `"1:44"`, `"100%"`) — parsed in
  `scripts/parse/normalize.ts`.
- `confidence` on `attribute_scores`: `alto` (granular round stats), `medio`
  (results-only / weak proxy), `manual` (hand-curated).

## Network note

In the Claude-Code web environment, direct Postgres ports and the Supabase host
may be blocked by the network egress policy. If `npm run ingest` fails with
"Host not in allowlist", add the Supabase host to the environment's egress
settings, or run the load server-side.
