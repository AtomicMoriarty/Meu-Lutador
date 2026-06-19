-- Random sampling RPCs for career mode (build picker + opponent generation).
-- SECURITY INVOKER; RLS public-read already in place; exposed via PostgREST.

CREATE OR REPLACE FUNCTION meu_lutador.random_attribute_options(p_attribute text, p_n int DEFAULT 10)
RETURNS TABLE (fighter_id uuid, name text, nickname text, value numeric)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = meu_lutador, public
AS $$
  SELECT a.fighter_id, f.name, f.nickname, a.value_0_100
  FROM meu_lutador.attribute_scores a
  JOIN meu_lutador.fighters f ON f.id = a.fighter_id
  WHERE a.attribute_name = p_attribute
  ORDER BY random()
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
    GROUP BY a.fighter_id
    HAVING count(*) >= 6
    ORDER BY random()
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

GRANT EXECUTE ON FUNCTION meu_lutador.random_attribute_options(text, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION meu_lutador.random_full_fighters(int) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
