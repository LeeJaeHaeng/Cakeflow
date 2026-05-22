-- CakeFlow security hardening and schema parity

CREATE TABLE IF NOT EXISTS shop_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shop_settings'
      AND policyname = 'Service role only shop_settings'
  ) THEN
    CREATE POLICY "Service role only shop_settings"
      ON shop_settings FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS design_id UUID REFERENCES cake_designs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_reviews_visible_created
  ON reviews(created_at DESC)
  WHERE hidden = FALSE;

CREATE INDEX IF NOT EXISTS idx_reviews_design_visible
  ON reviews(design_id, created_at DESC)
  WHERE hidden = FALSE;

ALTER TABLE sns_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sns_posts'
      AND policyname = 'Service role only sns_posts'
  ) THEN
    CREATE POLICY "Service role only sns_posts"
      ON sns_posts FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analytics_daily'
      AND policyname = 'Service role only analytics_daily'
  ) THEN
    CREATE POLICY "Service role only analytics_daily"
      ON analytics_daily FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;
