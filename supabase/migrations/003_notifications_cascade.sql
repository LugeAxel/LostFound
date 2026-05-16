-- QReturn: Add ON DELETE CASCADE to notifications.item_id FK
-- Prevents orphaned notifications when items are deleted directly.

-- Clean up existing orphaned notifications first
DELETE FROM notifications n
  WHERE n.item_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM items i WHERE i.id = n.item_id);

-- Re-create FK with cascade
ALTER TABLE notifications
  DROP CONSTRAINT notifications_item_id_fkey,
  ADD CONSTRAINT notifications_item_id_fkey
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;
