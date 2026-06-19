-- Phase 2 population (run after the dataset is loaded). Pure SQL, server-side,
-- idempotent (truncates first). Builds weight_class_history for all divisions
-- and division_snapshot for the MVP divisions.

-- 1) Per fighter & division: span + count.
TRUNCATE meu_lutador.weight_class_history;
WITH parts AS (
  SELECT p.fid, f.weight_class, e.event_date
  FROM meu_lutador.fights f
  JOIN meu_lutador.events e ON e.id = f.event_id
  CROSS JOIN LATERAL (VALUES (f.fighter_a_id),(f.fighter_b_id)) AS p(fid)
  WHERE p.fid IS NOT NULL AND e.event_date IS NOT NULL
)
INSERT INTO meu_lutador.weight_class_history (fighter_id, weight_class, first_fight_date, last_fight_date, fights_count)
SELECT fid, weight_class, min(event_date), max(event_date), count(*)
FROM parts GROUP BY fid, weight_class;

-- 2) division_snapshot: eligible pool = everyone who fought that division within
--    ±window_months of the anchor event. MVP divisions; anchors = numbered UFC
--    events; keep pools >= 8 so draws are interesting.
TRUNCATE meu_lutador.division_snapshot;
WITH anchors AS (
  SELECT id AS anchor_event_id, event_date AS d
  FROM meu_lutador.events
  WHERE ufc_number IS NOT NULL AND event_date IS NOT NULL
),
divs AS (SELECT unnest(ARRAY['lightweight','welterweight','heavyweight']) AS wc),
parts AS (
  SELECT f.weight_class, e.event_date, p.fid
  FROM meu_lutador.fights f
  JOIN meu_lutador.events e ON e.id = f.event_id
  CROSS JOIN LATERAL (VALUES (f.fighter_a_id),(f.fighter_b_id)) AS p(fid)
  WHERE p.fid IS NOT NULL AND e.event_date IS NOT NULL
)
INSERT INTO meu_lutador.division_snapshot
  (weight_class, anchor_event_id, window_months, eligible_fighter_ids, pool_size, anchor_date)
SELECT d.wc, a.anchor_event_id, 18,
       array_agg(DISTINCT pt.fid), count(DISTINCT pt.fid), a.d
FROM anchors a
CROSS JOIN divs d
JOIN parts pt
  ON pt.weight_class = d.wc
 AND pt.event_date BETWEEN (a.d - INTERVAL '18 months') AND (a.d + INTERVAL '18 months')
GROUP BY d.wc, a.anchor_event_id, a.d
HAVING count(DISTINCT pt.fid) >= 8;
