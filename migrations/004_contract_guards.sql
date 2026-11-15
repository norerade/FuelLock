CREATE TRIGGER contract_balance_insert BEFORE INSERT ON contracts
WHEN NEW.available + NEW.reserved + NEW.used != (SELECT volume FROM offers WHERE id=NEW.offer)
BEGIN SELECT RAISE(ABORT, 'Contract gallons must reconcile to the agreement volume'); END;
CREATE TRIGGER contract_balance_update BEFORE UPDATE OF available,reserved,used ON contracts
WHEN NEW.available + NEW.reserved + NEW.used != (SELECT volume FROM offers WHERE id=NEW.offer)
BEGIN SELECT RAISE(ABORT, 'Contract gallons must reconcile to the agreement volume'); END;
CREATE TRIGGER accepted_terms_immutable BEFORE UPDATE OF partner,kind,fuel,grade,cap,volume,fee,service,starts,ends,allowed,scope,terms,version ON offers
WHEN EXISTS (SELECT 1 FROM contracts c WHERE c.offer=OLD.id)
BEGIN SELECT RAISE(ABORT, 'Accepted terms are immutable: publish a new offer version'); END;
