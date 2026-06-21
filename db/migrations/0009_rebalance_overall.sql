-- Equilibrate the fighter "overall" rating: remap to a 30..95 band (percentile of
-- Elo), so no fighter sits at 0/1 or 99/100. Used for the ladder difficulty ramp.
WITH p AS (
  SELECT fighter_id, round(30 + 65 * cume_dist() OVER (ORDER BY elo))::numeric AS v
  FROM meu_lutador.fighter_ratings
)
UPDATE meu_lutador.fighter_ratings r
SET overall_0_100 = LEAST(95, GREATEST(30, p.v))
FROM p WHERE p.fighter_id = r.fighter_id;
