# 2026-05-18 CakeFlow 운영 변경 인수인계

## 현재 운영 결정

- 온라인 카드결제와 PortOne 연동은 현재 운영 범위에서 제외한다.
- 고객은 주문서만 먼저 접수한다.
- 사장님이 주문 내용을 확인한 뒤 카카오톡, 문자, 전화로 확정 금액과 계좌이체 안내를 전달한다.
- 예약 확정은 관리자 주문 상세에서 계좌이체 입금 확인 후 처리한다.
- 휴대폰 문자인증은 임시 비활성화한다. 기능 코드는 유지하고 환경변수로 즉시 재활성화할 수 있게 둔다.

## 결제 플로우 변경 내용

- 고객 주문서 `/cake/order`
  - 결제수단 선택 UI를 제거했다.
  - 제출 버튼은 `주문서 접수하기`로 동작한다.
  - 주문 완료 안내는 계좌이체 안내 대기 상태로 표시한다.
  - 주문 데이터에는 `cake_details.payment_method = "bank_transfer"`를 저장한다.

- 주문 API `/api/orders`
  - PortOne 결제 준비/검증을 하지 않는다.
  - 신규 주문은 `requires_consultation = true`, `quote_status = pending_quote`, `payment_status = unpaid`, `deposit_amount = 0` 기준으로 접수한다.
  - 응답은 `payment_required: false`, `payment: null`을 반환한다.
  - 주문서 상세 텍스트의 결제 표기는 `계좌이체`와 `예상 주문금액` 기준으로 정리했다.

- 결제 API
  - `/api/payments/prepare`는 410 응답으로 온라인 결제 미사용을 반환한다.
  - `/api/payments/complete`는 410 응답으로 온라인 결제 검증 미사용을 반환한다.
  - `/api/payments/webhook`은 요청을 무시하고 `{ ok: true, ignored: true }`로 반환한다.
  - 고객용 `/payments/complete` 화면은 온라인 결제 미사용 안내와 주문 조회 이동 버튼만 표시한다.

- PortOne 제거
  - `@portone/browser-sdk`, `@portone/server-sdk` 의존성을 제거했다.
  - `lib/payments/portone.ts`를 삭제했다.
  - README와 `.env.example`에서 PortOne 환경변수를 제거했다.

## 문자인증 임시 비활성화

환경변수:

```env
NEXT_PUBLIC_PHONE_AUTH_DISABLED=true
```

- `true`: 고객 주문서에서 인증번호 발송/확인 UI를 숨기고, 이름과 010 휴대폰 번호만 입력하면 다음 단계로 이동한다. 주문 API도 고객 토큰 검증을 건너뛴다.
- `false` 또는 미설정: 기존 OTP 발송/확인 로직을 다시 사용한다.

현재 로컬 `.env.local`에는 `NEXT_PUBLIC_PHONE_AUTH_DISABLED=true`가 추가되어 있다.
Vercel Production/Preview/Development에도 같은 값을 설정해야 배포 환경에서 인증이 우회된다.

## PG 심사 대응 페이지

PG 계약은 보류하기로 했지만 사이트 심사 대응용 기본 페이지와 사업자 정보는 유지한다.

- `/terms`: 이용약관
- `/privacy`: 개인정보처리방침
- `/refund`: 환불정책

사업자 정보:

- 상호: 앙금앤케이크
- 대표: 김은숙
- 사업자등록번호: 753-08-01579
- 연락처: 010-2790-0539
- 주소: 경기도 수원시 팔달구 정자천로14번길 40, 1층 101호(화서동)

## 알림톡/SMS 상태

- Aligo 알림톡/SMS 모듈은 유지한다.
- 템플릿 코드가 없거나 실패하면 SMS fallback으로 동작한다.
- 결제 완료 템플릿 문구는 온라인 결제가 아니라 `입금 확인` 기준으로 수정했다.

## 데이터베이스와 마이그레이션

- `supabase/migrations/0002_production_ops.sql`에는 운영 테이블, 결제/상태 이력, 알림 템플릿 seed가 포함되어 있다.
- 이번 변경으로 새 마이그레이션은 만들지 않았다.
- 기존 `payments` 테이블은 관리자 수동 입금/환불 기록 용도로 남겨둔다.

## 검증 명령

변경 후 아래 검증이 통과해야 한다.

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run verify:parity
```

이번 작업 중 확인된 결과:

- `npm run lint`: 통과
- `npx tsc --noEmit`: 통과
- `npm run build`: 통과
- `npm run verify:parity`: 통과

## 나중에 다시 활성화할 때

문자인증 재활성화:

1. Vercel과 로컬에서 `NEXT_PUBLIC_PHONE_AUTH_DISABLED=false`로 바꾸거나 값을 제거한다.
2. `SMS_MOCK_MODE=false`와 Aligo SMS 환경변수가 실제 발송 가능한지 확인한다.
3. `/cake/order`에서 인증번호 발송, 인증번호 확인, 주문 접수까지 테스트한다.

카드결제 재도입:

1. PortOne 계약과 심사를 먼저 완료한다.
2. `@portone/browser-sdk`, `@portone/server-sdk` 의존성을 다시 추가한다.
3. 결제 준비, 완료 검증, 웹훅, 환불 API를 재구현한다.
4. 고객 주문서에 결제수단 선택 UI를 다시 열기 전에 실제 결제 sandbox와 webhook 검증을 완료한다.
