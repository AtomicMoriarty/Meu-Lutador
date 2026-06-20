-- Bias the random draws toward recent + elite (known) fighters, while keeping
-- older/obscure ones POSSIBLE (not forced). Efraimidis-Spirakis weighted sampling
-- without replacement: ORDER BY (-ln(random())/weight). weight = recency * eliteness.

CREATE OR REPLACE FUNCTION meu_lutador.random_attribute_options(p_attribute text, p_n int DEFAULT 10)
RETURNS TABLE (fighter_id uuid, name text, nickname text, value numeric)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = meu_lutador, public
AS $$
  SELECT a.fighter_id, f.name, f.nickname, a.value_0_100
  FROM meu_lutador.attribute_scores a
  JOIN meu_lutador.fighters f ON f.id = a.fighter_id
  LEFT JOIN meu_lutador.fighter_ratings r ON r.fighter_id = a.fighter_id
  WHERE a.attribute_name = p_attribute
  ORDER BY (-ln(random()) / GREATEST(0.05,
    (CASE
       WHEN r.last_fight_date >= DATE '2024-01-01' THEN 3.0
       WHEN r.last_fight_date >= DATE '2020-01-01' THEN 2.2
       WHEN r.last_fight_date >= DATE '2010-01-01' THEN 1.4
       WHEN r.last_fight_date >= DATE '2005-01-01' THEN 1.0
       ELSE 0.5 END)
    * (1 + GREATEST(0, (COALESCE(r.elo, 1400) - 1450) / 220.0))
  )) ASC
  LIMIT GREATEST(1, LEAST(p_n, 50));
$$;

CREATE OR REPLACE FUNCTION meu_lutador.random_full_fighters(p_n int DEFAULT 8)
RETURNS TABLE (fighter_id uuid, name text, nickname text, overall numeric, attrs jsonb)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = meu_lutador, public
AS $$
  WITH picked AS (
    SELECT a.fighter_id
    FROM meu_lutador.attribute_scores a
    LEFT JOIN meu_lutador.fighter_ratings r ON r.fighter_id = a.fighter_id
    GROUP BY a.fighter_id, r.last_fight_date, r.elo
    HAVING count(*) >= 6
    ORDER BY (-ln(random()) / GREATEST(0.05,
      (CASE
         WHEN r.last_fight_date >= DATE '2024-01-01' THEN 3.0
         WHEN r.last_fight_date >= DATE '2020-01-01' THEN 2.2
         WHEN r.last_fight_date >= DATE '2010-01-01' THEN 1.4
         WHEN r.last_fight_date >= DATE '2005-01-01' THEN 1.0
         ELSE 0.5 END)
      * (1 + GREATEST(0, (COALESCE(r.elo, 1400) - 1450) / 220.0))
    )) ASC
    LIMIT GREATEST(1, LEAST(p_n, 50))
  )
  SELECT p.fighter_id, f.name, f.nickname,
         COALESCE(r.overall_0_100, 50) AS overall,
         (SELECT jsonb_object_agg(a.attribute_name, a.value_0_100)
          FROM meu_lutador.attribute_scores a WHERE a.fighter_id = p.fighter_id) AS attrs
  FROM picked p
  JOIN meu_lutador.fighters f ON f.id = p.fighter_id
  LEFT JOIN meu_lutador.fighter_ratings r ON r.fighter_id = p.fighter_id;
$$;
