-- Add billing settings to klanten table
-- weekly_hours: standard weekly budget per client
ALTER TABLE klanten
  ADD COLUMN IF NOT EXISTS multiplication_factor DECIMAL(5,2) DEFAULT 1.25,
  ADD COLUMN IF NOT EXISTS weekly_hours DECIMAL(10,2) DEFAULT NULL;

-- Remove old columns if they exist (from earlier migration attempt)
ALTER TABLE klanten DROP COLUMN IF EXISTS agreed_hours;
ALTER TABLE klanten DROP COLUMN IF EXISTS agreed_hours_type;

-- Personal days off (vacation, sick days, etc.) - applies to all clients
CREATE TABLE IF NOT EXISTS vrije_dagen (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  datum DATE NOT NULL,
  omschrijving TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, datum)
);

ALTER TABLE vrije_dagen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own days off" ON vrije_dagen
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own days off" ON vrije_dagen
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own days off" ON vrije_dagen
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own days off" ON vrije_dagen
  FOR DELETE USING (auth.uid() = user_id);

-- Manual budget overrides per client per month
CREATE TABLE IF NOT EXISTS budget_overrides (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  klant_id INTEGER REFERENCES klanten(id) ON DELETE CASCADE,
  maand TEXT NOT NULL, -- format: 'YYYY-MM'
  budget_uren DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, klant_id, maand)
);

ALTER TABLE budget_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budget overrides" ON budget_overrides
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budget overrides" ON budget_overrides
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budget overrides" ON budget_overrides
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budget overrides" ON budget_overrides
  FOR DELETE USING (auth.uid() = user_id);
