-- QReturn: Add unique claim_code to items table
-- claim_code is a random 8-char alphanumeric string used in QR codes
-- instead of the database UUID, preventing URL-based claim bypass.

ALTER TABLE items ADD COLUMN claim_code VARCHAR(12);

-- Backfill existing items with random 8-char codes
DO $$
DECLARE
    r RECORD;
    code VARCHAR(12);
    tries INT;
BEGIN
    FOR r IN SELECT id FROM items WHERE claim_code IS NULL LOOP
        tries := 0;
        LOOP
            code := UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8));
            BEGIN
                UPDATE items SET claim_code = code WHERE id = r.id;
                EXIT;
            EXCEPTION WHEN unique_violation THEN
                tries := tries + 1;
                IF tries > 10 THEN
                    RAISE EXCEPTION 'Failed to generate unique claim_code for item %', r.id;
                END IF;
            END;
        END LOOP;
    END LOOP;
END $$;

CREATE UNIQUE INDEX idx_items_claim_code ON items(claim_code);
ALTER TABLE items ALTER COLUMN claim_code SET NOT NULL;

-- Enable users to delete their own notifications (click-to-delete)
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

  ALTER TABLE notifications
DROP CONSTRAINT notifications_item_id_fkey;

ALTER TABLE notifications
ADD CONSTRAINT notifications_item_id_fkey
FOREIGN KEY (item_id)
REFERENCES items(id)
ON DELETE CASCADE;
