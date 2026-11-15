UPDATE purchases SET reward_goal=NULL,reward_transfer_at=NULL WHERE reward_status!='paid';
DROP VIEW savings_transfers;
CREATE VIEW savings_transfers AS
  SELECT family, id AS purchase, goal, 'roundup' AS kind, round_up AS amount, at, 'completed' AS status
  FROM purchases WHERE status='posted' AND goal IS NOT NULL AND round_up>0
  UNION ALL
  SELECT family, id, reward_goal, 'cashback', reward, COALESCE(reward_transfer_at,at), 'completed'
  FROM purchases WHERE status='posted' AND reward_goal IS NOT NULL AND reward>0 AND reward_status='paid';
