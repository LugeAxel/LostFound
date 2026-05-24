-- Add params JSONB to notifications for i18n rendering
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS params JSONB DEFAULT '{}'::jsonb;

-- Add show_tips preference to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_tips BOOLEAN DEFAULT TRUE;
