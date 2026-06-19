-- Meu-Lutador — Phase 0/1 schema.
-- All objects live in the dedicated `meu_lutador` schema so they never collide
-- with the other app that already uses `public` in this Supabase project.

CREATE SCHEMA IF NOT EXISTS meu_lutador;

-- ---------------------------------------------------------------------------
-- Core reference tables
-- ---------------------------------------------------------------------------

-- Fighters. Natural key = the hex slug from the ufcstats profile URL.
CREATE TABLE IF NOT EXISTS meu_lutador.fighters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ufcstats_id TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  first_name  TEXT,
  last_name   TEXT,
  nickname    TEXT,
  dob         DATE,
  height_cm   NUMERIC,
  reach_cm    NUMERIC,
  weight_lbs  NUMERIC,          -- listed weight from tale-of-the-tape, not a class
  stance      TEXT,
  source_url  TEXT
);

-- Events.
CREATE TABLE IF NOT EXISTS meu_lutador.events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ufcstats_id TEXT UNIQUE,
  name        TEXT NOT NULL,
  ufc_number  INT,              -- parsed from "UFC 229" style names when present
  event_date  DATE,
  location    TEXT
);

-- Fights. fighter_a = first name in the BOUT string, fighter_b = second.
CREATE TABLE IF NOT EXISTS meu_lutador.fights (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ufcstats_fight_id TEXT UNIQUE,
  event_id          UUID REFERENCES meu_lutador.events(id),
  bout              TEXT,
  weight_class      TEXT,       -- normalized to canonical divisions / buckets
  weight_class_raw  TEXT,       -- original free-text value
  fighter_a_id      UUID REFERENCES meu_lutador.fighters(id),
  fighter_b_id      UUID REFERENCES meu_lutador.fighters(id),
  winner_id         UUID REFERENCES meu_lutador.fighters(id),
  outcome           TEXT,       -- W/L, L/W, D/D, NC, etc.
  method            TEXT,
  round             INT,
  time_seconds      INT,
  time_format       TEXT,
  referee           TEXT,
  has_round_stats   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_fights_event       ON meu_lutador.fights(event_id);
CREATE INDEX IF NOT EXISTS idx_fights_weightclass ON meu_lutador.fights(weight_class);
CREATE INDEX IF NOT EXISTS idx_fights_a           ON meu_lutador.fights(fighter_a_id);
CREATE INDEX IF NOT EXISTS idx_fights_b           ON meu_lutador.fights(fighter_b_id);

-- Per-round, per-fighter granular stats (only exists for the modern stats era).
CREATE TABLE IF NOT EXISTS meu_lutador.fight_round_stats (
  fight_id              UUID NOT NULL REFERENCES meu_lutador.fights(id),
  fighter_id            UUID NOT NULL REFERENCES meu_lutador.fighters(id),
  round_num             INT  NOT NULL,
  knockdowns            INT,
  sig_str_landed        INT,
  sig_str_att           INT,
  total_str_landed      INT,
  total_str_att         INT,
  td_landed             INT,
  td_att                INT,
  sub_att               INT,
  reversals             INT,
  control_time_seconds  INT,
  sig_head_landed       INT,
  sig_head_att          INT,
  sig_body_landed       INT,
  sig_body_att          INT,
  sig_leg_landed        INT,
  sig_leg_att           INT,
  sig_distance_landed   INT,
  sig_distance_att      INT,
  sig_clinch_landed     INT,
  sig_clinch_att        INT,
  sig_ground_landed     INT,
  sig_ground_att        INT,
  PRIMARY KEY (fight_id, fighter_id, round_num)
);

CREATE INDEX IF NOT EXISTS idx_frs_fighter ON meu_lutador.fight_round_stats(fighter_id);

-- ---------------------------------------------------------------------------
-- Derived / computed tables
-- ---------------------------------------------------------------------------

-- Chronological Elo + record. Universal floor of "overall" (covers UFC 1+).
CREATE TABLE IF NOT EXISTS meu_lutador.fighter_ratings (
  fighter_id     UUID PRIMARY KEY REFERENCES meu_lutador.fighters(id),
  elo            NUMERIC NOT NULL,
  peak_elo       NUMERIC NOT NULL,
  n_fights       INT NOT NULL DEFAULT 0,
  wins           INT NOT NULL DEFAULT 0,
  losses         INT NOT NULL DEFAULT 0,
  draws          INT NOT NULL DEFAULT 0,
  no_contests    INT NOT NULL DEFAULT 0,
  overall_0_100  NUMERIC,       -- elo mapped to 0-100 for display
  last_fight_date DATE,
  computed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-attribute scores (the §5.4 pipeline output).
CREATE TABLE IF NOT EXISTS meu_lutador.attribute_scores (
  fighter_id     UUID NOT NULL REFERENCES meu_lutador.fighters(id),
  weight_class   TEXT NOT NULL,
  era_window_id  TEXT NOT NULL DEFAULT 'career',
  attribute_name TEXT NOT NULL,
  value_0_100    NUMERIC NOT NULL,
  raw_value      NUMERIC,       -- pre-normalization metric, for auditing
  confidence     TEXT NOT NULL CHECK (confidence IN ('alto','medio','manual')),
  computed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (fighter_id, weight_class, era_window_id, attribute_name)
);

-- Hand-curated charisma / mic-skill scores (never derived from fight stats).
CREATE TABLE IF NOT EXISTS meu_lutador.charisma_scores (
  fighter_id   UUID PRIMARY KEY REFERENCES meu_lutador.fighters(id),
  value_0_100  NUMERIC NOT NULL,
  curated_by   TEXT,
  source_notes TEXT
);

-- Log of names that could not be resolved to a fighter, for manual review.
CREATE TABLE IF NOT EXISTS meu_lutador.ingest_unresolved (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  csv_source   TEXT,
  event        TEXT,
  bout         TEXT,
  fighter_name TEXT,
  reason       TEXT,            -- 'unmatched' | 'collision'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
