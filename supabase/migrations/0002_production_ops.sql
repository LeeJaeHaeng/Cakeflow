-- CakeFlow production operations layer

CREATE TYPE quote_status AS ENUM ('not_required', 'pending_quote', 'quoted', 'accepted', 'expired');
CREATE TYPE notification_channel AS ENUM ('alimtalk', 'sms');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'fallback_sent');

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS quote_status quote_status NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS requires_consultation BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS confirmed_price INT CHECK (confirmed_price IS NULL OR confirmed_price >= 0),
  ADD COLUMN IF NOT EXISTS payment_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS internal_priority SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_channel VARCHAR(30) NOT NULL DEFAULT 'web';

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS portone_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS channel_key TEXT,
  ADD COLUMN IF NOT EXISTS raw_payload JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_orders_quote_status ON orders(quote_status);
CREATE INDEX IF NOT EXISTS idx_orders_requires_consultation ON orders(requires_consultation);
CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON payments(payment_id);

CREATE TABLE IF NOT EXISTS order_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  actor_type VARCHAR(20) NOT NULL DEFAULT 'system',
  actor_id TEXT,
  previous_status order_status,
  next_status order_status NOT NULL,
  previous_payment_status payment_status,
  next_payment_status payment_status,
  note TEXT,
  notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_events_order ON order_status_events(order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_templates (
  key TEXT PRIMARY KEY,
  channel notification_channel NOT NULL DEFAULT 'alimtalk',
  aligo_template_code TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  template_key TEXT,
  channel notification_channel NOT NULL,
  status notification_status NOT NULL DEFAULT 'pending',
  receiver_phone VARCHAR(20) NOT NULL,
  receiver_name VARCHAR(50),
  subject TEXT,
  message TEXT NOT NULL,
  provider_response JSONB NOT NULL DEFAULT '{}',
  error_message TEXT,
  fallback_log_id UUID REFERENCES notification_logs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_order ON notification_logs(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);

CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  payment_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  raw_payload JSONB NOT NULL DEFAULT '{}',
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(payment_id, event_type, processed_at)
);

CREATE TABLE IF NOT EXISTS review_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(40) NOT NULL DEFAULT 'ingredient',
  unit VARCHAR(20) NOT NULL DEFAULT 'ea',
  current_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  low_stock_threshold NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost_per_unit INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('in', 'out', 'adjust')),
  quantity NUMERIC(12,2) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipe_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type order_type NOT NULL,
  cake_design_id UUID REFERENCES cake_designs(id) ON DELETE CASCADE,
  dessert_id UUID REFERENCES dessert_products(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_recipe_target CHECK (
    (product_type = 'cake' AND cake_design_id IS NOT NULL AND dessert_id IS NULL) OR
    (product_type = 'dessert' AND dessert_id IS NOT NULL AND cake_design_id IS NULL)
  )
);

ALTER TABLE order_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only order_status_events"
  ON order_status_events FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role only notification_templates"
  ON notification_templates FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role only notification_logs"
  ON notification_logs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role only payment_events"
  ON payment_events FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role only review_tokens"
  ON review_tokens FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role only inventory_items"
  ON inventory_items FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role only stock_movements"
  ON stock_movements FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role only recipe_components"
  ON recipe_components FOR ALL
  USING (auth.role() = 'service_role');

INSERT INTO notification_templates (key, channel, aligo_template_code, subject, body)
VALUES
  ('order_received', 'alimtalk', NULL, '주문 접수', '[앙금앤케이크] #{고객명}님 주문서가 접수되었습니다. 주문번호: #{주문번호}'),
  ('quote_needed', 'alimtalk', NULL, '상담 필요 주문 접수', '[앙금앤케이크] 주문서가 접수되었습니다. 사장님 확인 후 카카오톡 또는 전화로 안내드릴게요. 주문번호: #{주문번호}'),
  ('payment_paid', 'alimtalk', NULL, '결제 완료', '[앙금앤케이크] 결제가 완료되어 예약 확인 대기 중입니다. 주문번호: #{주문번호}'),
  ('confirmed', 'alimtalk', NULL, '예약 확정', '[앙금앤케이크] 예약이 확정되었습니다. 픽업일: #{픽업일} #{픽업시간}'),
  ('producing', 'alimtalk', NULL, '제작 시작', '[앙금앤케이크] 케이크 제작을 시작했습니다.'),
  ('ready', 'alimtalk', NULL, '픽업 준비 완료', '[앙금앤케이크] 케이크 준비가 완료되었습니다. 예약 시간에 방문해 주세요.'),
  ('completed', 'alimtalk', NULL, '픽업 완료', '[앙금앤케이크] 픽업이 완료되었습니다. 이용해주셔서 감사합니다.'),
  ('cancelled', 'alimtalk', NULL, '주문 취소', '[앙금앤케이크] 주문이 취소되었습니다. 문의가 필요하면 매장으로 연락해 주세요.'),
  ('review_request', 'alimtalk', NULL, '리뷰 요청', '[앙금앤케이크] 소중한 후기를 남겨주세요. #{리뷰링크}')
ON CONFLICT (key) DO NOTHING;
