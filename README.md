# 부동산 실거래가 대시보드

전국/주요 광역시 아파트 실거래가를 매일 1회 수집해서 보여주는 개인용 대시보드.
국토교통부 실거래가 공개 API → Supabase(Postgres) → Next.js 대시보드.

## 아키텍처

- **Next.js 16** (App Router) — 대시보드 UI + API Routes
- **Supabase (Postgres)** — 실거래 데이터 저장
- **Vercel Cron** — 매일 1회 `/api/collect` 호출해서 최근 2개월치 재수집
- **공유 비밀번호 로그인** — 회원가입 없이 서명된 쿠키 하나로 인증 (`src/lib/auth.ts`)

## 최초 설정

### 1. 환경변수

`.env.local.example`을 참고해서 `.env.local`을 채웁니다.

| 변수 | 설명 |
|---|---|
| `MOLIT_API_KEY` | 공공데이터포털에서 발급받은 국토부 실거래가 API 인증키 (Encoding 버전) |
| `SUPABASE_URL` | Supabase 프로젝트 URL (Project Settings > Data API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role 키 (Project Settings > API Keys) — 서버 전용, 절대 브라우저에 노출 금지 |
| `DASHBOARD_PASSWORD` | 가족/지인과 공유할 대시보드 비밀번호 |
| `SESSION_SECRET` | 세션 쿠키 서명용 임의의 긴 문자열 |
| `CRON_SECRET` | `/api/collect`를 Vercel Cron 이외에서 호출하지 못하도록 막는 값 |

### 2. Supabase 테이블 생성

Supabase 대시보드 → SQL Editor에서 [`supabase/schema.sql`](./supabase/schema.sql) 내용을 실행합니다.

### 3. 로컬 실행

```bash
npm run dev
```

`http://localhost:3000` 접속 → `DASHBOARD_PASSWORD`로 로그인.

데이터가 비어있다면 수집을 한 번 수동으로 실행합니다:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/collect
```

### 4. 배포 (Vercel)

1. GitHub 저장소에 push
2. Vercel에서 이 저장소 Import
3. Vercel 프로젝트의 Environment Variables에 위 6개 변수를 동일하게 등록
4. 배포 — `vercel.json`에 정의된 Cron이 자동으로 매일 03:00(KST)에 `/api/collect`를 실행합니다

## 관심 지역 추가하기

`src/lib/regions.ts`의 `REGIONS` 배열에 `{ code, city, district }` 형태로 법정동 5자리 코드를 추가하면 됩니다.
법정동 코드는 [공공데이터포털 법정동코드 조회](https://www.data.go.kr/data/15077871/openapi.do) 또는 국토교통부 자료에서 확인할 수 있습니다.

## 폴더 구조

```
src/
  app/
    page.tsx            # 대시보드 메인
    login/page.tsx       # 로그인 화면
    api/collect/route.ts # 실거래가 수집 배치 (Vercel Cron이 호출)
    api/login/route.ts   # 로그인 처리
    api/logout/route.ts  # 로그아웃 처리
  components/            # 클라이언트 컴포넌트 (차트, 지역선택, 로그아웃버튼)
  lib/
    molit.ts             # 국토부 실거래가 API 클라이언트
    regions.ts           # 수집 대상 지역 목록
    supabase.ts          # Supabase 서버 클라이언트
    queries.ts           # 대시보드용 집계 쿼리
    auth.ts              # 공유 비밀번호 세션 인증
  proxy.ts                # 인증 체크 (Next.js 16의 middleware → proxy 관례)
supabase/schema.sql       # DB 스키마
vercel.json               # Cron 스케줄 설정
```
