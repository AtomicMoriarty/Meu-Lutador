-- Server-side data load for environments where the container cannot reach
-- Supabase directly (Postgres ports + host blocked by network egress policy).
--
-- The pipeline is computed locally (`npm run build:json` -> data/build/*.json),
-- pushed to GitHub, and this script makes Postgres pull those JSON files via the
-- `http` extension and insert them. Manifest-driven, so it adapts to chunk count.
--
-- Prereqs: `CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;`
-- Adjust `base` to the branch/commit you pushed the build artifacts to.

DO $$
DECLARE
  base  text := 'https://raw.githubusercontent.com/AtomicMoriarty/Meu-Lutador/claude/new-session-rfvvxx/data/build/';
  manifest jsonb;
  t     jsonb;
  f     text;
  cols  text;   -- "id uuid, name text, ..."  (jsonb_to_recordset column defs)
  names text;   -- "id, name, ..."            (insert/select column list)
BEGIN
  PERFORM set_config('http.timeout_msec', '180000', true);
  manifest := (extensions.http_get(base || 'manifest.json')).content::jsonb;

  TRUNCATE meu_lutador.attribute_scores, meu_lutador.charisma_scores,
    meu_lutador.fighter_ratings, meu_lutador.fight_round_stats, meu_lutador.fights,
    meu_lutador.events, meu_lutador.fighters, meu_lutador.ingest_unresolved
    RESTART IDENTITY CASCADE;

  FOR t IN SELECT * FROM jsonb_array_elements(manifest) LOOP
    cols := t->>'record_cols';
    SELECT string_agg(split_part(trim(p), ' ', 1), ', ')
      INTO names FROM unnest(string_to_array(cols, ',')) p;

    FOR f IN SELECT * FROM jsonb_array_elements_text(t->'files') LOOP
      EXECUTE format(
        'INSERT INTO meu_lutador.%I (%s) SELECT * FROM jsonb_to_recordset((extensions.http_get(%L)).content::jsonb) AS x(%s)',
        t->>'table', names, base || f, cols
      );
    END LOOP;
  END LOOP;
END $$;
