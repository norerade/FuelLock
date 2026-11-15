ALTER TABLE goals ADD COLUMN cashback INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX one_cashback_goal ON goals(family) WHERE cashback=1;
ALTER TABLE purchases ADD COLUMN reward_goal TEXT REFERENCES goals(id);
