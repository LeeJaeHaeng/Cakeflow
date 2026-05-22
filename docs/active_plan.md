# CakeFlow 실서비스 보안/운영 개선 진행 계획

## 진행 원칙

- 현재 소스, DB migration, 환경변수 문서를 먼저 확인한 뒤 수정한다.
- 기존 Next.js App Router 구조와 Supabase service-role BFF 패턴을 유지한다.
- 실서비스에서 바로 터질 수 있는 공개 API 보안 경계부터 최소 변경으로 막는다.
- 각 단계 후 `npm.cmd run lint`, `npx.cmd tsc --noEmit`, `npm.cmd run build`로 검증한다.

## 1차 작업 범위

1. 휴대폰 인증 우회 기본값 수정
2. 주문 조회를 주문번호+휴대폰 조합으로 제한
3. 공개 디자인 API의 숨김 데이터 노출 차단
4. 리뷰 작성 API를 review token 기반으로 제한
5. 공개 업로드에 rate limit과 실제 이미지 검증 추가
6. 작업지시서 PDF의 외부 이미지 fetch를 Supabase Storage allowlist로 제한
7. 관리자 로그인 rate limit과 기본 보안 헤더 추가
8. 변경된 운영 정책과 문서 불일치 정리

## 현재 상태

- `codex.md` 확인 완료
- Next.js 16 Route Handlers, headers, proxy 문서 확인 완료
- 공통 rate limit/image 보안 helper 추가 완료
- 휴대폰 인증 우회가 production에서 무시되도록 수정 완료
- 주문 조회 API를 주문번호+휴대폰 필수로 변경 완료
- 숨김 디자인 API 노출 차단 완료
- 리뷰 작성 API를 review token 기반으로 제한 완료
- 공개 업로드와 시뮬레이터 세션 저장 제한 완료
- 작업지시서 이미지 fetch allowlist 적용 완료
- 관리자 로그인 rate limit, production env-admin 차단, 보안 헤더 추가 완료
- DB 보안 보강 migration 추가 완료
- parity 검증 스크립트의 주문 조회 요청을 주문번호+휴대폰 조합으로 정합화 완료
- 검증 완료: `npm.cmd run lint`, `npx.cmd tsc --noEmit`, `npm.cmd run build`, `npm.cmd run verify:parity`

## 2차 작업 범위

1. 완료 주문의 리뷰 토큰 발급/재사용 로직 추가
2. 리뷰 요청 알림에 실제 작성 링크 연결
3. 고객용 리뷰 작성 페이지 추가
4. 리뷰 API의 토큰 조회, 내용 길이, 이미지 URL 검증 보강
5. 리뷰 조회/작성에 필요한 DB migration 정합화

## 2차 현재 상태

- 리뷰 토큰 helper 추가 완료
- 관리자 주문 상태가 `completed`로 처음 전환될 때 리뷰 요청 알림 발송 연결 완료
- 수동 알림 API의 `review_request`도 주문 기준 리뷰 링크를 생성하도록 수정 완료
- 고객용 `/orders/review?token=...` 작성 화면 추가 완료
- `reviews.design_id` migration 보강 완료
- 검증 완료: `npm.cmd run lint`, `npx.cmd tsc --noEmit`, `npm.cmd run build`, `npm.cmd run verify:parity`, `git diff --check`

## 3차 작업 범위

1. `shop_capacity` 단순 증가 트리거를 DB row lock 기반 검증/동기화 트리거로 교체
2. 주문 생성, 픽업일 변경, 취소/환불/삭제 시 `current_count`를 실제 주문 수와 동기화
3. 휴무일/마감일 DB 오류를 API에서 409 응답으로 매핑
4. 운영 문서와 migration 목록 최신화

## 3차 현재 상태

- `supabase/migrations/20260522090000_capacity_hardening.sql` 추가 완료
- 주문 생성 API의 DB capacity 오류 매핑 완료
- 관리자 주문 수정/상태/견적 확정 API의 DB capacity 오류 매핑 완료
- README, 운영 handoff, Supabase preview 문서 갱신 완료
- 검증 완료: `npm.cmd run lint`, `npx.cmd tsc --noEmit`, `npm.cmd run build`, `npm.cmd run verify:parity`, `git diff --check`
