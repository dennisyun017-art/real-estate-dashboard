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

-- 아래 두 함수는 대시보드 집계용입니다. Supabase(PostgREST)는 select 결과를
-- 기본 1000행으로 제한하기 때문에, 거래량이 많은 지역/기간에서는 클라이언트에서
-- 직접 집계하면 값이 잘립니다. DB 안에서 GROUP BY로 집계해서 반환합니다.

create or replace function city_month_summary(p_start date, p_end date)
returns table(city text, cnt bigint, avg_price_per_pyeong numeric) as $$
  select
    city,
    count(*) as cnt,
    round(avg(deal_amount / (exclusive_area / 3.3058))) as avg_price_per_pyeong
  from apt_trades
  where deal_date >= p_start and deal_date < p_end
  group by city;
$$ language sql stable;

create or replace function region_monthly_trend(p_region text, p_start date)
returns table(month text, cnt bigint, avg_price_per_pyeong numeric) as $$
  select
    to_char(deal_date, 'YYYY-MM') as month,
    count(*) as cnt,
    round(avg(deal_amount / (exclusive_area / 3.3058))) as avg_price_per_pyeong
  from apt_trades
  where region_code = p_region and deal_date >= p_start
  group by to_char(deal_date, 'YYYY-MM')
  order by month;
$$ language sql stable;
