# CakeFlow

앙금앤케이크의 케이크/디저트 주문과 매장 운영 관리를 위한 Next.js 기반 웹 애플리케이션입니다.

## 주요 기능

- 고객용 주문 흐름: 디자인 탐색, 케이크 주문서 작성, 전화번호 OTP 인증, 주문 조회
- 주문서 분기: 매장 메뉴 7종 기준 상품 선택, 옵션 입력, 100% 선입금 안내
- 가격 계산: 확정 추가금 즉시 합산, 상담 필요 추가금 별도 표기, 주문 저장 시 총액/선입금액 반영
- 케이크 시뮬레이터: 실제 메뉴 기반 선택, 원형 케이크 캔버스, 메뉴별 예시 사진, 이미지/꽃배치/레터링 편집, 미리보기 저장
- 디저트 상품 페이지: 상품 목록, 품절 상태, 카카오톡/전화 문의 CTA
- 관리자: 대시보드, 주문관리, 일정 캘린더, 고객관리, 디자인 관리, 시뮬레이터 예시 사진 관리, 디저트 상품 관리
- Phase 4 관리자 기능: 통계 분석, 운영 설정, 리뷰 관리 API, SNS 캡션 생성/초안 저장, 로컬 이미지 업로드

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
ADMIN_EMAIL=
ADMIN_PASSWORD=

ALIGO_API_KEY=
ALIGO_USER_ID=
ALIGO_SENDER=
ALIGO_KAKAO_SENDER_KEY=
ALIGO_TPL_ORDER_RECEIVED=
ALIGO_TPL_PAYMENT_PAID=
ALIGO_TPL_QUOTE_NEEDED=
ALIGO_TPL_CONFIRMED=
ALIGO_TPL_PRODUCING=
ALIGO_TPL_READY=
ALIGO_TPL_COMPLETED=
ALIGO_TPL_CANCELLED=
ALIGO_TPL_REVIEW_REQUEST=
SMS_MOCK_MODE=true

NEXT_PUBLIC_PORTONE_STORE_ID=
NEXT_PUBLIC_PORTONE_CHANNEL_KEY=
PORTONE_API_SECRET=
PORTONE_WEBHOOK_SECRET=

OPENAI_API_KEY=
```

`OPENAI_API_KEY`가 없으면 SNS 캡션 생성은 샘플 모드로 동작합니다.

## 주요 경로

- `/` 고객 홈
- `/cake/designs` 케이크 디자인 목록
- `/cake/order` 케이크 주문
- `/cake/order?cakeType=rice` 앙금플라워 떡케이크 주문서 직접 진입
- `/cake/simulator` 케이크 시뮬레이터
- `/cake/simulator?cakeType=rice&productKey=rice_flower` 앙금떡케이크 계열 시뮬레이터
- `/cake/simulator?cakeType=design&productKey=design_cake` 빵케이크 계열 시뮬레이터
- `/dessert` 디저트 상품
- `/orders/track` 주문 조회
- `/admin` 관리자 대시보드
- `/admin/orders` 주문관리
- `/admin/orders/[id]` 주문 상세 운영 콘솔
- `/admin/calendar` 일정 캘린더
- `/admin/customers` 고객관리
- `/admin/designs` 디자인 관리
- `/admin/simulator` 시뮬레이터 예시 사진 관리
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

## 현재 진행상황

### 2026-05-17

- 실서비스 운영 레이어를 추가했습니다.
  - PortOne V2 브라우저/서버 SDK를 추가하고 카드 100% 선결제 주문의 결제 요청, 결제 검증, 웹훅, 환불 API를 구성했습니다.
  - 상담 필요 주문은 온라인 결제 없이 `pending_quote`로 접수하고, 관리자 주문 상세에서 사장님이 확정 금액/계좌이체 입금 확인 후 예약 확정할 수 있습니다.
  - Aligo 알림톡 발송 모듈을 추가하고 템플릿 코드가 없거나 실패하면 SMS로 fallback하도록 구성했습니다.
  - 주문 상태 변경, 알림 발송, 결제 이벤트를 DB에 이력으로 남기는 운영 테이블 마이그레이션을 추가했습니다.
  - `/admin/orders/[id]` 상세 화면에서 주문서 원문, 시뮬레이터 이미지, 결제/상태/알림 이력, 작업지시서 다운로드를 확인할 수 있습니다.
  - `/orders/track`는 주문번호 조회, 결제상태, 상담/온라인 결제 구분, 사장님 메모를 보여주도록 확장했습니다.

### 2026-05-16

- 케이크 시뮬레이터를 주문시안형 2D 편집기로 고도화했습니다.
  - `/cake/simulator`에서 앙금떡케이크와 디자인케이크를 선택합니다.
  - 두 모드 모두 원형 케이크 표면을 기본 캔버스로 사용합니다.
  - 앙금떡케이크는 참고사진, 설기색, 사이즈, 크레센트/리스/반달/돔형/프리스타일 꽃배치 프리셋을 제공합니다.
  - 디자인케이크는 원형 케이크 위 이미지, 스티커, 케이크색, 자유 레터링 편집을 제공합니다.
  - 레터링은 추가/수정, 글자수, 폰트, 색상, 크기, 회전, 직선/곡선, 위치 프리셋을 지원합니다.
- 시뮬레이터 미리보기 저장 안정성을 보강했습니다.
  - `simulator-previews` Supabase Storage 버킷이 없으면 자동 생성 후 업로드를 재시도합니다.
  - 업로드 실패 시에도 같은 브라우저 주문 흐름에서는 `sessionStorage` 백업 이미지로 주문서 3단계 디자인 확인 화면을 표시합니다.
- 주문서 메뉴/가격 구조를 매장 실제 메뉴 기준으로 개편했습니다.
  - 앙금플라워떡케이크, 높은1호 케이크, 나이프플라워케이크, 피규어케이크, 디자인케이크, 앙금플라워 숫자떡 케이크, 디저트류를 선택할 수 있습니다.
  - 확정 추가금은 즉시 합산합니다: 리스/블라썸 스타일 `+7,000원`, 문구 추가 `+3,000원`, 숫자떡케이크 숫자 1개당 `40,000원`.
  - 디자인 난이도, 피규어 가격, 2단/높이 추가, 디저트 변동가격 등 메뉴상 미확정 항목은 `상담 후 확정`으로 표시합니다.
  - 최종확인 단계에서 기본금액, 확정 추가금, 상담 필요 추가금, 선입금 결제금액을 고객이 확인합니다.
- 결제 흐름을 100% 선입금 기준으로 정리했습니다.
  - 카드결제와 계좌이체 선택 UI를 추가했습니다.
  - 주문 API는 동일한 가격 계산 모듈을 사용해 `total_price`와 `deposit_amount`에 선입금 기준 금액을 저장합니다.
  - 카드결제 선택 시 현재는 결제 링크 안내 상태로 주문을 접수합니다. 실제 PG 결제 승인/웹훅 연동은 다음 단계 작업입니다.
- App Router 루트 에러 컴포넌트를 추가했습니다.
  - `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`를 추가해 dev 서버의 required error components refresh 문제를 해결했습니다.
- 시뮬레이터와 관리자 UX를 추가 정리했습니다.
  - `/cake/simulator` 첫 화면은 실제 메뉴 기준으로 앙금떡케이크 계열과 빵케이크 계열을 묶어 선택합니다.
  - `나이프플라워케이크`는 앙금떡케이크 계열로 분류해 원형 앙금떡케이크 시뮬레이터와 주문서 흐름으로 연결합니다.
  - 시뮬레이터 페이지는 고객 홈/주문서와 동일한 밝은 카드형 UI 톤으로 정리했습니다.
  - 각 메뉴 카드와 편집 화면에서 해당 케이크 예시 사진을 표시합니다.
- 관리자 시뮬레이터 관리 화면을 추가했습니다.
  - `/admin/simulator`에서 메뉴별 예시 사진을 관리합니다.
  - 예시 사진은 로컬 파일 업로드로 Supabase Storage에 저장하고, `shop_settings.simulator_examples`에 URL을 저장합니다.
  - 예시 데이터가 없거나 API 오류가 있어도 기본 예시 이미지로 fallback합니다.
- 관리자 이미지 업로드 흐름을 보강했습니다.
  - 디자인 관리, 디저트 상품, SNS 포스트, 시뮬레이터 예시 사진에서 로컬 이미지 업로드를 사용합니다.
  - `/api/upload`는 `cake-designs`, `simulator-previews` 버킷이 없을 경우 자동 생성 후 업로드를 재시도합니다.
  - `jpg`, `jpeg`, `png`, `webp`, `heic`, `heif` 이미지를 허용하고, 업로드 실패 시 관리자 화면에 오류를 표시합니다.
- 관리자 로그인 fallback을 추가했습니다.
  - 기존 Supabase `verify_admin_password` RPC 로그인을 유지합니다.
  - Supabase Auth/RPC 구성이 불안정한 환경에서도 `ADMIN_EMAIL`, `ADMIN_PASSWORD` 환경변수 기반 관리자 로그인이 가능합니다.
  - 로컬 개발 기본 계정은 `.env.local`에 설정된 값을 사용합니다.
- 관리자 표시 정보를 수정했습니다.
  - 관리자 프로필 이름을 `김은숙 사장님`으로 변경했습니다.

최근 검증 결과:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

위 3개 명령이 통과한 상태입니다.

## Supabase

초기 스키마는 `supabase/migrations/0001_initial.sql`에 있습니다. 주요 테이블은 `customers`, `cake_designs`, `dessert_products`, `orders`, `order_items`, `reviews`, `sns_posts`, `analytics_daily`, `otp_requests`입니다.

운영 설정은 Phase 4에서 사용하는 `shop_settings` 테이블을 전제로 합니다. 배포/신규 환경 구성 시 Supabase 실제 스키마와 로컬 migration의 정합성을 확인해야 합니다.
