-- Rebalance attribute_scores: recompute value_0_100 as a *midpoint percentile*
-- of the stored raw_value, per attribute (global). Fixes the old z-score ceilings
-- (e.g. chin maxed at 68) and ties: every attribute uses the full ~5..99 range,
-- tied groups land at their average percentile. Idempotent (derives from raw_value).

WITH ranked AS (
  SELECT fighter_id, weight_class, era_window_id, attribute_name,
         round(5 + 94 * (
           ( (rank() OVER (PARTITION BY attribute_name ORDER BY raw_value) - 1)
             + (count(*) OVER (PARTITION BY attribute_name, raw_value)) / 2.0 )
           / (count(*) OVER (PARTITION BY attribute_name))
         ))::numeric AS v
  FROM meu_lutador.attribute_scores
)
UPDATE meu_lutador.attribute_scores a
SET value_0_100 = LEAST(99, GREATEST(5, r.v))
FROM ranked r
WHERE a.fighter_id = r.fighter_id AND a.weight_class = r.weight_class
  AND a.era_window_id = r.era_window_id AND a.attribute_name = r.attribute_name;

CREATE INDEX IF NOT EXISTS idx_attr_name ON meu_lutador.attribute_scores(attribute_name);
