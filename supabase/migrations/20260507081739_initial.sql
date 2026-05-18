-- CakeFlow 초기 DB 스키마
-- §8 데이터 모델 기반

-- ============================================================
-- ENUM 타입
-- ============================================================

CREATE TYPE order_type AS ENUM ('cake', 'dessert');

CREATE TYPE order_status AS ENUM (
  'pending',
  'confirmed',
  'producing',
  'ready',
  'completed',
  'cancelled',
  'refunded'
);

CREATE TYPE delivery_method AS ENUM ('pickup', 'delivery');

CREATE TYPE payment_status AS ENUM ('unpaid', 'partial', 'paid', 'refunded');

CREATE TYPE design_category AS ENUM (
  'birthday',
  'first_birthday',
  'anniversary',
  'couple',
  'wedding',
  'parents_day',
  'custom',
  'rice_cake',
  'flower'
);

-- ============================================================
-- CUSTOMERS
-- ============================================================

CREATE TABLE customers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone        VARCHAR(20) NOT NULL UNIQUE,
  name         VARCHAR(50) NOT NULL,
  memo         TEXT,
  allergy      TEXT,
  vip_flag     BOOLEAN NOT NULL DEFAULT FALSE,
  total_orders INT NOT NULL DEFAULT 0,
  total_amount BIGINT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_phone ON customers(phone);

-- ============================================================
-- CAKE DESIGNS
-- ============================================================

CREATE TABLE cake_designs (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                  VARCHAR(100) NOT NULL,
  description            TEXT,
  categories             design_category[] NOT NULL DEFAULT '{}',
  style_tags             TEXT[] NOT NULL DEFAULT '{}',
  color_tags             TEXT[] NOT NULL DEFAULT '{}',
  price_from             INT NOT NULL CHECK (price_from > 0),
  thumbnail_url          TEXT NOT NULL,
  simulator_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  simulator_template_url TEXT,
  display_status         VARCHAR(20) NOT NULL DEFAULT 'visible'
                           CHECK (display_status IN ('visible', 'hidden')),
  view_count             INT NOT NULL DEFAULT 0,
  order_count            INT NOT NULL DEFAULT 0,
  deleted_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_designs_status ON cake_designs(display_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_designs_categories ON cake_designs USING GIN(categories);

-- ============================================================
-- DESIGN IMAGES
-- ============================================================

CREATE TABLE design_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id  UUID NOT NULL REFERENCES cake_designs(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_dimages_design ON design_images(design_id);

-- ============================================================
-- DESSERT PRODUCTS
-- ============================================================

CREATE TABLE dessert_products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         VARCHAR(100) NOT NULL,
  category      VARCHAR(50),
  price         INT NOT NULL CHECK (price >= 0),
  cost          INT CHECK (cost >= 0),
  stock_count   INT NOT NULL DEFAULT 0 CHECK (stock_count >= 0),
  thumbnail_url TEXT,
  description   TEXT,
  options_json  JSONB,
  status        VARCHAR(20) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'paused', 'deleted')),
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_desserts_status ON dessert_products(status) WHERE deleted_at IS NULL;

-- ============================================================
-- PRODUCT IMAGES
-- ============================================================

CREATE TABLE product_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES dessert_products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0
);

-- ============================================================
-- SIMULATOR SESSIONS
-- ============================================================

CREATE TABLE simulator_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id       UUID REFERENCES cake_designs(id),
  anonymous_token VARCHAR(64) NOT NULL UNIQUE,
  state_json      JSONB NOT NULL DEFAULT '{}',
  preview_url     TEXT,
  production_url  TEXT,
  summary         JSONB,
  finalized_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_simsess_token ON simulator_sessions(anonymous_token);
CREATE INDEX idx_simsess_expires ON simulator_sessions(expires_at);

-- ============================================================
-- ORDERS
-- ============================================================

CREATE TABLE orders (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number         VARCHAR(20) NOT NULL UNIQUE,
  customer_id          UUID NOT NULL REFERENCES customers(id),
  order_type           order_type NOT NULL,
  status               order_status NOT NULL DEFAULT 'pending',
  delivery_method      delivery_method NOT NULL DEFAULT 'pickup',
  pickup_date          DATE NOT NULL,
  pickup_time          TIME,
  total_price          INT NOT NULL CHECK (total_price >= 0),
  deposit_amount       INT NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
  payment_status       payment_status NOT NULL DEFAULT 'unpaid',
  customer_message     TEXT,
  admin_memo           TEXT,
  simulator_session_id UUID REFERENCES simulator_sessions(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_pickup_date ON orders(pickup_date);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_pickup_status ON orders(pickup_date, status);

-- ============================================================
-- ORDER ITEMS
-- ============================================================

CREATE TABLE order_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_type   order_type NOT NULL,
  cake_design_id UUID REFERENCES cake_designs(id),
  dessert_id     UUID REFERENCES dessert_products(id),
  quantity       INT NOT NULL CHECK (quantity > 0),
  unit_price     INT NOT NULL CHECK (unit_price >= 0),
  options_json   JSONB,
  CONSTRAINT chk_item_type CHECK (
    (product_type = 'cake' AND cake_design_id IS NOT NULL AND dessert_id IS NULL) OR
    (product_type = 'dessert' AND dessert_id IS NOT NULL AND cake_design_id IS NULL)
  )
);

CREATE INDEX idx_oitems_order ON order_items(order_id);

-- ============================================================
-- ORDER IMAGES (제작 완료 후 사장님 업로드)
-- ============================================================

CREATE TABLE order_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES orders(id),
  amount            INT NOT NULL CHECK (amount > 0),
  method            VARCHAR(30) NOT NULL,
  pg_transaction_id TEXT,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending',
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_order ON payments(order_id);

-- ============================================================
-- REVIEWS
-- ============================================================

CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content     TEXT,
  image_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_order ON reviews(order_id);

-- ============================================================
-- SHOP CAPACITY (일별 주문 캐퍼시티)
-- ============================================================

CREATE TABLE shop_capacity (
  date          DATE PRIMARY KEY,
  max_orders    INT NOT NULL DEFAULT 8 CHECK (max_orders > 0),
  is_holiday    BOOLEAN NOT NULL DEFAULT FALSE,
  current_count INT NOT NULL DEFAULT 0 CHECK (current_count >= 0),
  note          TEXT
);

-- ============================================================
-- SNS POSTS
-- ============================================================

CREATE TABLE sns_posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform     VARCHAR(20) NOT NULL DEFAULT 'instagram',
  caption      TEXT,
  image_urls   TEXT[] NOT NULL DEFAULT '{}',
  hashtags     TEXT[] NOT NULL DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  status       VARCHAR(20) NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ANALYTICS DAILY (배치 집계, 매일 03:00 KST)
-- ============================================================

CREATE TABLE analytics_daily (
  date              DATE PRIMARY KEY,
  order_count       INT NOT NULL DEFAULT 0,
  revenue           BIGINT NOT NULL DEFAULT 0,
  simulator_used    INT NOT NULL DEFAULT 0,
  new_customers     INT NOT NULL DEFAULT 0,
  review_count      INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- OTP REQUESTS (커스텀 전화번호 인증)
-- ============================================================

CREATE TABLE otp_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      VARCHAR(20) NOT NULL,
  code       CHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_phone ON otp_requests(phone);
CREATE INDEX idx_otp_expires ON otp_requests(expires_at);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_cake_designs_updated_at
  BEFORE UPDATE ON cake_designs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_dessert_products_updated_at
  BEFORE UPDATE ON dessert_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 재고 차감 트리거 (dessert 주문 시)
CREATE OR REPLACE FUNCTION deduct_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.product_type = 'dessert' AND NEW.dessert_id IS NOT NULL THEN
    UPDATE dessert_products
    SET stock_count = stock_count - NEW.quantity
    WHERE id = NEW.dessert_id AND stock_count >= NEW.quantity;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'STOCK_INSUFFICIENT';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deduct_stock
  AFTER INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION deduct_stock();

-- shop_capacity current_count 갱신 트리거
CREATE OR REPLACE FUNCTION increment_capacity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO shop_capacity (date, current_count)
  VALUES (NEW.pickup_date, 1)
  ON CONFLICT (date) DO UPDATE
  SET current_count = shop_capacity.current_count + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_capacity
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION increment_capacity();

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cake_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE dessert_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulator_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_capacity ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_requests ENABLE ROW LEVEL SECURITY;

-- 익명 사용자: 공개 디자인/디저트 조회 가능
CREATE POLICY "Public read cake_designs"
  ON cake_designs FOR SELECT
  USING (display_status = 'visible' AND deleted_at IS NULL);

CREATE POLICY "Public read design_images"
  ON design_images FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM cake_designs cd
    WHERE cd.id = design_id AND cd.display_status = 'visible' AND cd.deleted_at IS NULL
  ));

CREATE POLICY "Public read dessert_products"
  ON dessert_products FOR SELECT
  USING (status = 'active' AND deleted_at IS NULL);

CREATE POLICY "Public read product_images"
  ON product_images FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM dessert_products dp
    WHERE dp.id = product_id AND dp.status = 'active' AND dp.deleted_at IS NULL
  ));

CREATE POLICY "Public read shop_capacity"
  ON shop_capacity FOR SELECT
  USING (TRUE);

-- 시뮬레이터 세션: 본인 토큰으로만 조회 (익명 토큰은 앱에서 관리)
CREATE POLICY "Service role only simulator_sessions"
  ON simulator_sessions FOR ALL
  USING (auth.role() = 'service_role');

-- 주문/고객/결제: service_role만 접근 (API Route Handler에서 service client 사용)
CREATE POLICY "Service role only orders"
  ON orders FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role only customers"
  ON customers FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role only order_items"
  ON order_items FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role only order_images"
  ON order_images FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role only payments"
  ON payments FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role only reviews"
  ON reviews FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role only otp_requests"
  ON otp_requests FOR ALL
  USING (auth.role() = 'service_role');
