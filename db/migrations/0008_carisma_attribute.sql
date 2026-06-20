-- Add "carisma" as a 12th attribute for every fighter: a fame proxy (Elo
-- percentile), overridden by the curated charisma_scores where present.
WITH fame AS (
  SELECT fighter_id, round(5 + 94 * cume_dist() OVER (ORDER BY elo))::numeric AS fame_val
  FROM meu_lutador.fighter_ratings
),
base AS (
  SELECT DISTINCT ON (fighter_id) fighter_id, weight_class, era_window_id
  FROM meu_lutador.attribute_scores
  ORDER BY fighter_id, attribute_name
)
INSERT INTO meu_lutador.attribute_scores
  (fighter_id, weight_class, era_window_id, attribute_name, value_0_100, raw_value, confidence)
SELECT b.fighter_id, b.weight_class, b.era_window_id, 'carisma',
       COALESCE(cs.value_0_100, f.fame_val, 40),
       COALESCE(cs.value_0_100, f.fame_val, 40),
       CASE WHEN cs.fighter_id IS NOT NULL THEN 'manual' ELSE 'medio' END
FROM base b
LEFT JOIN fame f ON f.fighter_id = b.fighter_id
LEFT JOIN meu_lutador.charisma_scores cs ON cs.fighter_id = b.fighter_id
ON CONFLICT (fighter_id, weight_class, era_window_id, attribute_name) DO UPDATE
  SET value_0_100 = EXCLUDED.value_0_100, raw_value = EXCLUDED.raw_value, confidence = EXCLUDED.confidence;
