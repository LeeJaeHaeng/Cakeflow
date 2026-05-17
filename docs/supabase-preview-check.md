# Supabase Preview 체크 실패 대응

## 증상

GitHub 커밋 체크에서 `Supabase / Supabase Preview`가 실패하고 아래 메시지가 나온다.

```text
Remote migration versions not found in local migrations directory.
```

이 실패는 Next.js/Vercel 앱 빌드 실패가 아니다. Supabase GitHub integration이 원격 DB의 migration 기록과 repo의 `supabase/migrations` 폴더를 비교하다가 멈춘 상태다.

## 원인

Supabase 원격 DB의 `supabase_migrations.schema_migrations`에는 적용된 migration version이 기록된다. 이 version과 같은 prefix를 가진 SQL 파일이 repo의 `supabase/migrations`에 있어야 한다.

현재 repo에 있는 로컬 migration 파일은 다음 2개다.

```text
supabase/migrations/0001_initial.sql
supabase/migrations/0002_production_ops.sql
```

원격 DB에 위 두 version 외의 version이 남아 있으면 Supabase Preview 체크가 실패한다. 흔한 원인은 다음과 같다.

- Supabase Dashboard SQL Editor에서 수동으로 스키마를 바꾼 뒤 migration 기록만 남은 경우
- 예전에 다른 파일명이나 timestamp migration을 적용한 뒤 repo에서 해당 파일이 삭제된 경우
- 로컬 migration 파일명을 바꿨지만 원격 migration version 기록은 예전 이름으로 남은 경우

## 확인 명령

로컬에 Supabase CLI가 없으면 `npx supabase`를 사용한다.

```bash
npx supabase login
npx supabase link --project-ref bwphdfyaxeckrpmbxtew
npx supabase migration list
```

`migration list`에서 `Remote`에는 있는데 `Local`에는 없는 version이 문제다.

## 해결 방법

### 1. 원격 version이 실제로 필요한 migration이면

원격 version과 같은 prefix를 가진 SQL 파일을 `supabase/migrations`에 복원한다.

예:

```text
supabase/migrations/20260517120000_some_remote_change.sql
```

파일 내용은 원격 DB에 이미 적용된 변경을 재현할 수 있어야 한다.

### 2. 원격 version이 수동 작업 찌꺼기이고 현재 schema에 필요 없으면

Supabase migration repair로 원격 migration history를 정리한다.

```bash
npx supabase migration repair --status reverted <version>
npx supabase migration list
```

주의: `repair`는 DB schema를 되돌리는 명령이 아니라 migration history만 수정한다. 실제 schema가 현재 앱과 맞는지 먼저 확인해야 한다.

## 현재 repo 상태

- `supabase/config.toml`을 추가해 프로젝트 ref를 repo에 명시했다.
- 로컬에서 `npx supabase` CLI는 실행 가능하다.
- 현재 환경에는 Supabase access token이 없어서 원격 migration list를 직접 조회하지 못했다.
- 새 세션에서 Supabase CLI 로그인 또는 `SUPABASE_ACCESS_TOKEN`이 있으면 위 확인 명령으로 바로 원격 version을 확인하면 된다.
