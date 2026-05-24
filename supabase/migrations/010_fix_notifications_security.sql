-- QReturn: Security hardening for notifications

-- 1. Remove public INSERT policy — only service_role (backend) can insert
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- 2. Add TEXT length constraint (prevents oversized notification content)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_text_length;
ALTER TABLE notifications ADD CONSTRAINT notifications_text_length CHECK (char_length(text) <= 500);

-- 3. Add updated_at column for push_subscriptions (if table already exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'push_subscriptions') THEN
    ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;
