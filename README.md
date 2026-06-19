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

## Loading

Two paths, depending on whether this machine can reach Supabase:

**A. Direct (egress to `*.supabase.co:443` allowed).** Fill `.env` with a
write-capable key and run `npm run pipeline`.

**B. Server-side (Supabase host blocked — the default in the Claude-Code web
environment).** The container can't reach Supabase, so:

```
npm run build:json     # compute everything locally -> data/build/*.json
git push               # publish the JSON artifacts
```

Then load them from inside Postgres (the DB *can* reach GitHub) via the `http`
extension — see `db/seed/load_from_github.sql` (manifest-driven, idempotent).

## Current state

The MVP dataset is loaded in Supabase `meu_lutador`: 4,496 fighters, 774 events,
8,701 fights, 40,839 round-stat rows, 2,686 Elo ratings, 24,679 attribute scores
(21,019 `alto` / 3,660 `medio`), 18 curated charisma rows. Granular round stats
exist back to **1994**, so `alto`-confidence attributes are broadly available.

## API (Phase 3)

Pure simulation engine in `src/engine.ts` (deterministic, no I/O — tested via
`npm run sim:demo`). The game API is a single routed Supabase Edge Function
`ml-api` (`supabase/functions/ml-api/`, engine copied in via `npm run sync:engine`):

| Route | Method | Purpose |
|---|---|---|
| `/ml-api/draw?weight_class=` | GET | random division + era anchor + the 11 attribute slots |
| `/ml-api/slot-options?weight_class&anchor_event_id&attribute` | GET | pickable fighters + their value for that attribute |
| `/ml-api/simulate` | POST | `{fighterA, fighterB, rounds?, seed?}` → event log (+ optional narrative) |

Base URL: `https://nozthsissdwkfwtogmdu.supabase.co/functions/v1`. All routes
require `Authorization: Bearer <anon key>`. A built fighter is
`{ name, picks: { <attribute_name>: <source_fighter_id> } }`.

Narrative (PT-BR, plan §8) is generated only if the `ANTHROPIC_API_KEY` secret
is set on the function (optional); otherwise `simulate` returns `narrative: null`.

### Security note
Tables in `meu_lutador` are readable via the project's anon key (RLS disabled).
Before any public deployment, enable RLS with a public-read policy — see the SQL
in the project handoff notes.
