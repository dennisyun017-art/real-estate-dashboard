-- Supabase SQL 에디터에서 한 번 실행하세요.

create table if not exists apt_trades (
  id bigint generated always as identity primary key,
  region_code text not null,
  city text not null,
  district text not null,
  dong text not null,
  jibun text not null,
  apt_name text not null,
  build_year integer,
  exclusive_area numeric not null,
  floor integer,
  deal_date date not null,
  deal_amount integer not null, -- 만원 단위
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 같은 거래가 중복 저장되지 않도록 자연키로 유니크 제약
  unique (region_code, dong, jibun, apt_name, exclusive_area, floor, deal_date, deal_amount)
);

create index if not exists idx_apt_trades_region_date
  on apt_trades (region_code, deal_date desc);

create index if not exists idx_apt_trades_apt_name
  on apt_trades (apt_name);

-- 수집 실행 이력 (배치가 언제 마지막으로 성공했는지 대시보드에 표시하기 위함)
create table if not exists collect_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running', -- running | success | error
  regions_processed integer default 0,
  rows_upserted integer default 0,
  error_message text
);
