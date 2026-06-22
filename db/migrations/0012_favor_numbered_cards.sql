-- Nudge the card draw to favor numbered UFC events a bit more (2.0x vs 1.0x for
-- Fight Nights, up from 1.5x). Fight Nights still appear, just a touch less often.
CREATE OR REPLACE FUNCTION meu_lutador.random_card()
RETURNS TABLE (event_name text, ufc_number int, event_date date, fighters jsonb)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = meu_lutador, public
AS $$
  WITH chosen AS (
    SELECT e.id, e.name, e.ufc_number, e.event_date
    FROM meu_lutador.events e
    WHERE e.event_date IS NOT NULL
      AND EXISTS (SELECT 1 FROM meu_lutador.fights f WHERE f.event_id = e.id)
    ORDER BY (-ln(random()) / GREATEST(0.1,
      (CASE
         WHEN e.event_date >= DATE '2020-01-01' THEN 2.0
         WHEN e.event_date >= DATE '2012-01-01' THEN 1.4
         WHEN e.event_date >= DATE '2005-01-01' THEN 1.0
         ELSE 0.6 END)
      * (CASE WHEN e.ufc_number IS NOT NULL THEN 2.0 ELSE 1.0 END)
    )) ASC
    LIMIT 1
  ),
  roster AS (
    SELECT DISTINCT fid FROM (
      SELECT f.fighter_a_id AS fid FROM meu_lutador.fights f JOIN chosen c ON f.event_id = c.id
      UNION
      SELECT f.fighter_b_id FROM meu_lutador.fights f JOIN chosen c ON f.event_id = c.id
    ) z WHERE fid IS NOT NULL
  ),
  top AS (
    SELECT ro.fid, COALESCE(r.elo, 1400) AS elo
    FROM roster ro
    LEFT JOIN meu_lutador.fighter_ratings r ON r.fighter_id = ro.fid
    WHERE EXISTS (SELECT 1 FROM meu_lutador.attribute_scores a WHERE a.fighter_id = ro.fid)
    ORDER BY elo DESC
    LIMIT 12
  )
  SELECT c.name, c.ufc_number, c.event_date,
    (SELECT jsonb_agg(jsonb_build_object(
        'fighter_id', t.fid, 'name', f.name, 'nickname', f.nickname,
        'attrs', (SELECT jsonb_object_agg(a.attribute_name, a.value_0_100)
                  FROM meu_lutador.attribute_scores a WHERE a.fighter_id = t.fid)
      ) ORDER BY t.elo DESC)
     FROM top t JOIN meu_lutador.fighters f ON f.id = t.fid) AS fighters
  FROM chosen c;
$$;

GRANT EXECUTE ON FUNCTION meu_lutador.random_card() TO anon, authenticated;
