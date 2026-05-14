# CakeFlow

앙금앤케이크의 케이크/디저트 주문과 매장 운영 관리를 위한 Next.js 기반 웹 애플리케이션입니다.

## 주요 기능

- 고객용 주문 흐름: 디자인 탐색, 케이크 주문서 작성, 전화번호 OTP 인증, 주문 조회
- 주문서 분기: 일반 디자인케이크와 앙금플라워 떡케이크 주문 양식 분리
- 케이크 시뮬레이터: 이미지/스티커/텍스트 편집, 배경색 선택, 미리보기 저장
- 디저트 상품 페이지: 상품 목록, 품절 상태, 카카오톡/전화 문의 CTA
- 관리자: 대시보드, 주문관리, 일정 캘린더, 고객관리, 디자인 관리, 디저트 상품 관리
- Phase 4 관리자 기능: 통계 분석, 운영 설정, 리뷰 관리 API, SNS 캡션 생성/초안 저장

## 기술 스택

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Supabase
- Framer Motion
- Konva / react-konva
- lucide-react

## 실행 방법

```bash
npm install
npm run dev
```

기본 개발 서버는 `http://localhost:3000`에서 실행됩니다.

## 환경 변수

`.env.local`에 다음 값을 설정합니다. 예시는 `.env.example`을 기준으로 합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ADMIN_JWT_SECRET=

ALIGO_API_KEY=
ALIGO_USER_ID=
ALIGO_SENDER=
SMS_MOCK_MODE=true

OPENAI_API_KEY=
```

`OPENAI_API_KEY`가 없으면 SNS 캡션 생성은 샘플 모드로 동작합니다.

## 주요 경로

- `/` 고객 홈
- `/cake/designs` 케이크 디자인 목록
- `/cake/order` 케이크 주문
- `/cake/order?cakeType=rice` 앙금플라워 떡케이크 주문서 직접 진입
- `/cake/simulator` 케이크 시뮬레이터
- `/dessert` 디저트 상품
- `/orders/track` 주문 조회
- `/admin` 관리자 대시보드
- `/admin/orders` 주문관리
- `/admin/calendar` 일정 캘린더
- `/admin/customers` 고객관리
- `/admin/designs` 디자인 관리
- `/admin/products` 디저트 상품 관리
- `/admin/analytics` 통계 분석
- `/admin/settings` 운영 설정
- `/admin/sns` SNS 자동화

## 검증 명령

```bash
npx tsc --noEmit
npm run lint
npm run build
```

현재 기준으로 타입체크, lint, production build가 통과해야 커밋 가능한 상태로 봅니다.

## Supabase

초기 스키마는 `supabase/migrations/0001_initial.sql`에 있습니다. 주요 테이블은 `customers`, `cake_designs`, `dessert_products`, `orders`, `order_items`, `reviews`, `sns_posts`, `analytics_daily`, `otp_requests`입니다.

운영 설정은 Phase 4에서 사용하는 `shop_settings` 테이블을 전제로 합니다. 배포/신규 환경 구성 시 Supabase 실제 스키마와 로컬 migration의 정합성을 확인해야 합니다.
