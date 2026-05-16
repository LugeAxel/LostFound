-- QReturn Supabase Schema
-- School Lost & Found System — SMKN 2 Depok

-- ─────────────────────────────────────────────
-- 1. PROFILES TABLE (extends auth.users)
-- ─────────────────────────────────────────────
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  nisn VARCHAR(20) UNIQUE,
  nis VARCHAR(20),
  jurusan VARCHAR(100),
  ttl VARCHAR(100),
  agama VARCHAR(50),
  gender VARCHAR(20),
  role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for NISN lookups (QR login)
CREATE INDEX idx_profiles_nisn ON profiles(nisn);

-- ─────────────────────────────────────────────
-- 2. ITEMS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  location VARCHAR(200) NOT NULL,
  category VARCHAR(50) DEFAULT 'Others',
  status VARCHAR(20) DEFAULT 'Available' CHECK (status IN ('Available', 'On Progress', 'Returned')),
  type VARCHAR(10) NOT NULL CHECK (type IN ('found', 'lost')),
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  image_url VARCHAR(500),
  description VARCHAR(500),
  reporter UUID REFERENCES profiles(id) NOT NULL,
  coordinates_lat NUMERIC,
  coordinates_lng NUMERIC,
  claimer UUID REFERENCES profiles(id),
  claim_photo TEXT,
  claim_notes VARCHAR(500),
  claimed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_items_type ON items(type);
CREATE INDEX idx_items_reported_at ON items(reported_at DESC);
CREATE INDEX idx_items_reporter ON items(reporter);
CREATE INDEX idx_items_type_status ON items(type, status);
CREATE INDEX idx_items_type_reported_at ON items(type, reported_at DESC);

-- ─────────────────────────────────────────────
-- 3. MESSAGES TABLE (chat)
-- ─────────────────────────────────────────────
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  sender UUID REFERENCES profiles(id),
  text TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_item_id ON messages(item_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);

-- ─────────────────────────────────────────────
-- 4. COMPLAINTS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE complaints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id),
  reason VARCHAR(500) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, user_id)
);

CREATE INDEX idx_complaints_item_id ON complaints(item_id);

-- ─────────────────────────────────────────────
-- 5. NOTIFICATIONS TABLE (Supabase Realtime)
-- ─────────────────────────────────────────────
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('message', 'claim', 'resolved', 'complaint', 'system')),
  item_id UUID REFERENCES items(id),
  text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id, created_at DESC);

-- ─────────────────────────────────────────────
-- 6. RATINGS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) UNIQUE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 7. COUNTERS TABLE (for stats)
-- ─────────────────────────────────────────────
CREATE TABLE counters (
  name VARCHAR(50) PRIMARY KEY,
  value INTEGER DEFAULT 0
);

-- ─────────────────────────────────────────────
-- 8. DAILY COUNTERS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE daily_counters (
  date DATE PRIMARY KEY,
  returned INTEGER DEFAULT 0
);

-- ─────────────────────────────────────────────
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ─────────────────────────────────────────────

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Items
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view items"
  ON items FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert items"
  ON items FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Reporter can update own items"
  ON items FOR UPDATE
  USING (auth.uid() = reporter);

CREATE POLICY "Reporter can delete own items"
  ON items FOR DELETE
  USING (auth.uid() = reporter);

-- Messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages for items they're involved in"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = messages.item_id
      AND (items.reporter = auth.uid() OR items.claimer = auth.uid())
    )
  );

CREATE POLICY "Users can insert messages for items they're involved in"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = messages.item_id
      AND (items.reporter = auth.uid() OR items.claimer = auth.uid())
    )
  );

-- Complaints
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view complaints for items they're involved in"
  ON complaints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = complaints.item_id
      AND (items.reporter = auth.uid() OR items.claimer = auth.uid())
    )
  );

CREATE POLICY "Users can insert complaints"
  ON complaints FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Ratings
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ratings"
  ON ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own rating"
  ON ratings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Counters
ALTER TABLE counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view counters"
  ON counters FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can update counters"
  ON counters FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Daily Counters
ALTER TABLE daily_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view daily counters"
  ON daily_counters FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can update daily counters"
  ON daily_counters FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────
-- 10. ENABLE SUPABASE REALTIME
-- ─────────────────────────────────────────────
-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ─────────────────────────────────────────────
-- 11. RPC FUNCTIONS (for counter increments)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_counter(counter_name TEXT)
RETURNS void AS $$
BEGIN
  UPDATE counters SET value = value + 1 WHERE name = counter_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_daily_counter(counter_date DATE)
RETURNS void AS $$
BEGIN
  UPDATE daily_counters SET returned = returned + 1 WHERE date = counter_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- 12. HELPER FUNCTION: Auto-create profile on signup
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nama, nisn, nis, jurusan, ttl, agama, gender, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama', 'User'),
    NEW.raw_user_meta_data->>'nisn',
    NEW.raw_user_meta_data->>'nis',
    NEW.raw_user_meta_data->>'jurusan',
    NEW.raw_user_meta_data->>'ttl',
    NEW.raw_user_meta_data->>'agama',
    NEW.raw_user_meta_data->>'gender',
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────
-- 13. SEED DATA
-- ─────────────────────────────────────────────
INSERT INTO counters (name, value) VALUES ('returnedAllTime', 0) ON CONFLICT DO NOTHING;
