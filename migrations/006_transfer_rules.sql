ALTER TABLE families ADD COLUMN transfer_limit INTEGER NOT NULL DEFAULT 2500 CHECK(transfer_limit>=0);
ALTER TABLE families ADD COLUMN minimum_balance INTEGER NOT NULL DEFAULT 0 CHECK(minimum_balance>=0);
ALTER TABLE families ADD COLUMN transfers_paused INTEGER NOT NULL DEFAULT 0 CHECK(transfers_paused IN (0,1));
ALTER TABLE families ADD COLUMN transfer_consent INTEGER NOT NULL DEFAULT 0 CHECK(transfer_consent IN (0,1));
ALTER TABLE purchases ADD COLUMN reward_transfer_at TEXT;
CREATE VIEW savings_transfers AS
  SELECT family, id AS purchase, goal, 'roundup' AS kind, round_up AS amount, at, 'completed' AS status
  FROM purchases WHERE status='posted' AND goal IS NOT NULL AND round_up>0
  UNION ALL
  SELECT family, id, reward_goal, 'cashback', reward, COALESCE(reward_transfer_at,at),
    CASE reward_status WHEN 'paid' THEN 'completed' ELSE 'pending' END
  FROM purchases WHERE status='posted' AND reward_goal IS NOT NULL AND reward>0 AND reward_status IN ('confirmed','paid');
