-- Add two cards to the draw pool: the historic UFC 1 (1993, was missing from the
-- source dataset) and a custom marquee card "UFC Freedom 250". Idempotent: events
-- are only inserted if absent. Only fighters already in the roster are linked;
-- the card draw further filters to fighters that have attribute_scores.
WITH newev(name, num, dt, loc) AS (VALUES
    ('UFC 1: The Beginning', 1, DATE '1993-11-12', 'McNichols Sports Arena, Denver'),
    ('UFC Freedom 250', NULL::int, DATE '2026-06-14', 'Las Vegas, Nevada, USA')
),
ins AS (
  INSERT INTO meu_lutador.events (id, name, ufc_number, event_date, location)
  SELECT gen_random_uuid(), n.name, n.num, n.dt, n.loc
  FROM newev n
  WHERE NOT EXISTS (SELECT 1 FROM meu_lutador.events e WHERE e.name = n.name)
  RETURNING id, name
)
INSERT INTO meu_lutador.fights (id, event_id, weight_class, fighter_a_id, fighter_b_id, winner_id, outcome, method)
SELECT gen_random_uuid(), e.id, w.wc, a.id, b.id, a.id, 'W/L', w.method
FROM (VALUES
  ('UFC 1: The Beginning','open_weight','Royce Gracie','Gerard Gordeau','Submission'),
  ('UFC 1: The Beginning','open_weight','Jason DeLucia','Trent Jenkins','Submission'),
  ('UFC 1: The Beginning','open_weight','Royce Gracie','Ken Shamrock','Submission'),
  ('UFC 1: The Beginning','open_weight','Gerard Gordeau','Kevin Rosier','KO/TKO'),
  ('UFC 1: The Beginning','open_weight','Ken Shamrock','Patrick Smith','Submission'),
  ('UFC 1: The Beginning','open_weight','Royce Gracie','Art Jimmerson','Submission'),
  ('UFC 1: The Beginning','open_weight','Kevin Rosier','Zane Frazier','KO/TKO'),
  ('UFC Freedom 250','catchweight','Ilia Topuria','Justin Gaethje','KO/TKO'),
  ('UFC Freedom 250','catchweight','Alex Pereira','Ciryl Gane','KO/TKO'),
  ('UFC Freedom 250','catchweight','Sean O''Malley','Aiemann Zahabi','KO/TKO'),
  ('UFC Freedom 250','catchweight','Josh Hokit','Derrick Lewis','KO/TKO'),
  ('UFC Freedom 250','catchweight','Mauricio Ruffy','Michael Chandler','KO/TKO'),
  ('UFC Freedom 250','catchweight','Bo Nickal','Kyle Daukaus','KO/TKO'),
  ('UFC Freedom 250','catchweight','Diego Lopes','Steve Garcia','KO/TKO')
) AS w(ename, wc, an, bn, method)
JOIN ins e ON e.name = w.ename
JOIN meu_lutador.fighters a ON lower(a.name) = lower(w.an)
JOIN meu_lutador.fighters b ON lower(b.name) = lower(w.bn);
