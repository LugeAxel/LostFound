-- Create item_activities table for Activity Log feature
CREATE TABLE IF NOT EXISTS item_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'item_created',
    'claim_started',
    'message_sent',
    'complaint_filed',
    'claimer_assigned',
    'item_returned',
    'item_edited',
    'claimer_removed'
  )),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_item_activities_item_id ON item_activities(item_id);
CREATE INDEX idx_item_activities_created_at ON item_activities(created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE item_activities;
