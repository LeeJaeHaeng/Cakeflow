# Supabase Preview 체크 실패 대응

## 증상

GitHub 커밋 체크에서 `Supabase / Supabase Preview`가 실패하고 아래 메시지가 나온다.

```text
Remote migration versions not found in local migrations directory.
```

이 실패는 Next.js/Vercel 앱 빌드 실패가 아니다. Supabase GitHub integration이 원격 DB의 migration 기록과 repo의 `supabase/migrations` 폴더를 비교하다가 멈춘 상태다.

## 원인

Supabase 원격 DB의 `supabase_migrations.schema_migrations`에는 적용된 migration version이 기록된다. 이 version과 같은 prefix를 가진 SQL 파일이 repo의 `supabase/migrations`에 있어야 한다.

기존 repo에는 timestamp가 아닌 다음 2개 migration 파일이 있었다.

```text
supabase/migrations/0001_initial.sql
supabase/migrations/0002_production_ops.sql
```

Supabase GitHub integration은 timestamp version 기준으로 migration history를 맞추므로, 원격 DB에 timestamp version이 있는데 로컬 파일명이 `0001`, `0002`이면 Preview 체크가 실패한다. 흔한 원인은 다음과 같다.

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
- 원격 migration list에서 아래 4개 version이 `Remote`에만 존재하는 것으로 확인됐다.
- `0001_initial.sql`은 원격 첫 migration version에 맞춰 `20260507081739_initial.sql`로 변경했다.
- 원본 SQL이 repo 히스토리에 남아 있지 않은 나머지 원격 version 3개는 no-op history marker migration으로 복원했다.
- 기존 `0002_production_ops.sql`은 원격 history보다 앞선 local-only version으로 해석되지 않도록 `20260518005246_production_ops.sql`로 변경했다. 이 파일은 원격에 아직 적용되지 않은 운영 기능 migration으로 남긴다.

```text
Local          | Remote         | Time (UTC)
---------------|----------------|---------------------
20260507081739 | 20260507081739 | 2026-05-07 08:17:39
20260509074923 | 20260509074923 | 2026-05-09 07:49:23
20260509075058 | 20260509075058 | 2026-05-09 07:50:58
20260509120833 | 20260509120833 | 2026-05-09 12:08:33
```

추가된 로컬 marker 파일:

```text
supabase/migrations/20260509074923_remote_history.sql
supabase/migrations/20260509075058_remote_history.sql
supabase/migrations/20260509120833_remote_history.sql
```

현재 로컬 migration 파일:

```text
supabase/migrations/20260507081739_initial.sql
supabase/migrations/20260509074923_remote_history.sql
supabase/migrations/20260509075058_remote_history.sql
supabase/migrations/20260509120833_remote_history.sql
supabase/migrations/20260518005246_production_ops.sql
supabase/migrations/20260521090000_security_hardening.sql
supabase/migrations/20260522090000_capacity_hardening.sql
```
