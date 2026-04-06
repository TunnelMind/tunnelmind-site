-- TunnelMind Community Platform — Seed Data

-- Score weights (configurable, not hardcoded in application)
INSERT INTO score_weights (action_type, weight) VALUES
  ('annotation_created', 5),
  ('vote_cast', 1),
  ('upvote_received', 2),
  ('correction_accepted', 10),
  ('correction_proposed', 0)
ON CONFLICT (action_type) DO UPDATE SET weight = EXCLUDED.weight;
