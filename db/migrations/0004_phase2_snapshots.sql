-- Phase 2: era-window draw support.
--
-- weight_class_history: per fighter & division, the span they competed in it.
-- division_snapshot: precomputed eligible-fighter pool for a draw =
--   (weight_class, anchor_event, ±window_months around the anchor's date).

CREATE TABLE IF NOT EXISTS meu_lutador.weight_class_history (
  fighter_id       UUID NOT NULL REFERENCES meu_lutador.fighters(id),
  weight_class     TEXT NOT NULL,
  first_fight_date DATE,
  last_fight_date  DATE,
  fights_count     INT NOT NULL DEFAULT 0,
  PRIMARY KEY (fighter_id, weight_class)
);

CREATE INDEX IF NOT EXISTS idx_wch_class ON meu_lutador.weight_class_history(weight_class);

CREATE TABLE IF NOT EXISTS meu_lutador.division_snapshot (
  weight_class         TEXT NOT NULL,
  anchor_event_id      UUID NOT NULL REFERENCES meu_lutador.events(id),
  window_months        INT  NOT NULL,
  eligible_fighter_ids UUID[] NOT NULL,
  pool_size            INT  NOT NULL,
  anchor_date          DATE,
  computed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (weight_class, anchor_event_id, window_months)
);

CREATE INDEX IF NOT EXISTS idx_snapshot_class ON meu_lutador.division_snapshot(weight_class);

-- read access + RLS consistent with the rest of the schema
GRANT SELECT ON meu_lutador.weight_class_history, meu_lutador.division_snapshot TO anon, authenticated;
GRANT ALL    ON meu_lutador.weight_class_history, meu_lutador.division_snapshot TO service_role;

ALTER TABLE meu_lutador.weight_class_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE meu_lutador.division_snapshot    ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS public_read ON meu_lutador.weight_class_history;
DROP POLICY IF EXISTS public_read ON meu_lutador.division_snapshot;
CREATE POLICY public_read ON meu_lutador.weight_class_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY public_read ON meu_lutador.division_snapshot    FOR SELECT TO anon, authenticated USING (true);
