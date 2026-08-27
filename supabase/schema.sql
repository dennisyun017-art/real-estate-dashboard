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

-- 이미 만들어진 테이블에도 안전하게 적용되도록 ALTER로 추가 (신규 설치 시에는 no-op)
alter table apt_trades add column if not exists cancel_date date;
alter table apt_trades add column if not exists dealing_type text;
alter table apt_trades add column if not exists estate_agent_location text;
-- 동(건물) 번호. 호수는 개인정보라 국토부 공개 API에 아예 없습니다.
alter table apt_trades add column if not exists building_no text;

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

-- 지도 시각화용: 모든 지역을 한 번에 집계 (지역 수만큼 46번 쿼리하지 않도록)
create or replace function all_regions_month_summary(p_start date, p_end date)
returns table(region_code text, cnt bigint, avg_price_per_pyeong numeric) as $$
  select
    region_code,
    count(*) as cnt,
    round(avg(deal_amount / (exclusive_area / 3.3058))) as avg_price_per_pyeong
  from apt_trades
  where deal_date >= p_start and deal_date < p_end
  group by region_code;
$$ language sql stable;

-- 관심 지역 즐겨찾기 (변동률 랭킹 TOP5에 안 들어도 항상 보고 싶은 지역을 고정)
create table if not exists favorite_regions (
  id bigint generated always as identity primary key,
  region_code text not null unique,
  city text not null,
  district text not null,
  created_at timestamptz not null default now()
);

-- 관심 단지 즐겨찾기 (가족/지인이 공유하는 단일 목록 — 계정별 구분 없음)
create table if not exists favorites (
  id bigint generated always as identity primary key,
  region_code text not null,
  city text not null,
  district text not null,
  dong text not null,
  apt_name text not null,
  created_at timestamptz not null default now(),
  unique (region_code, dong, apt_name)
);

-- 단지 이름 검색 (현재 선택된 지역과 무관하게 전체 수집 범위에서 검색해서 즐겨찾기 추가 가능하게)
create extension if not exists pg_trgm;

create index if not exists idx_apt_trades_apt_name_trgm
  on apt_trades using gin (apt_name gin_trgm_ops);

create or replace function search_apartments(p_query text, p_limit int default 20)
returns table(
  region_code text,
  city text,
  district text,
  dong text,
  apt_name text,
  cnt bigint,
  latest_deal_date date,
  latest_deal_amount integer
) as $$
  select distinct on (region_code, dong, apt_name)
    region_code,
    city,
    district,
    dong,
    apt_name,
    count(*) over (partition by region_code, dong, apt_name) as cnt,
    deal_date as latest_deal_date,
    deal_amount as latest_deal_amount
  from apt_trades
  where apt_name ilike '%' || p_query || '%'
  order by region_code, dong, apt_name, deal_date desc
  limit p_limit;
$$ language sql stable;

-- 최근 거래 내역 상세 (신고가 여부 + 기간 검색 + 페이지네이션).
-- 신고가 = 같은 단지·같은 전용면적에서 지금까지 수집된 거래 중 가장 높은 금액과 같거나 그보다 높은 경우.
drop function if exists region_recent_trades_detailed(text, int);
drop function if exists region_recent_trades_detailed(text, int, int, date, date);

-- CREATE OR REPLACE는 인자 목록이 정확히 같을 때만 "교체"입니다.
-- 인자를 추가할 때마다 이전 시그니처를 먼저 DROP해야 오버로드 충돌(ambiguous
-- function 오류)이 안 납니다. p_exclude_direct 추가하면서 8개짜리를 지웁니다.
drop function if exists region_recent_trades_detailed(text, int, int, date, date);
drop function if exists region_recent_trades_detailed(text, int, int, date, date, text, numeric, numeric);

create or replace function region_recent_trades_detailed(
  p_region text,
  p_limit int default 50,
  p_offset int default 0,
  p_start_date date default null,
  p_end_date date default null,
  p_query text default null,
  p_min_area numeric default null,
  p_max_area numeric default null,
  p_exclude_direct boolean default false
)
returns table(
  apt_name text,
  dong text,
  exclusive_area numeric,
  floor integer,
  build_year integer,
  deal_date date,
  deal_amount integer,
  historic_high integer,
  is_new_high boolean,
  cancel_date date,
  dealing_type text,
  estate_agent_location text,
  building_no text,
  total_count bigint
) as $$
  with filtered as (
    select *, count(*) over () as total_count
    from apt_trades
    where region_code = p_region
      and (p_start_date is null or deal_date >= p_start_date)
      and (p_end_date is null or deal_date <= p_end_date)
      and (p_query is null or apt_name ilike '%' || p_query || '%' or dong ilike '%' || p_query || '%')
      and (p_min_area is null or exclusive_area >= p_min_area)
      and (p_max_area is null or exclusive_area < p_max_area)
      and (not p_exclude_direct or dealing_type is distinct from '직거래')
  ),
  recent as (
    select *
    from filtered
    order by deal_date desc
    limit p_limit offset p_offset
  ),
  highs as (
    select dong, apt_name, exclusive_area, max(deal_amount) as historic_high
    from apt_trades
    where region_code = p_region
    group by dong, apt_name, exclusive_area
  )
  select
    r.apt_name, r.dong, r.exclusive_area, r.floor, r.build_year, r.deal_date, r.deal_amount,
    h.historic_high,
    (r.deal_amount >= h.historic_high) as is_new_high,
    r.cancel_date, r.dealing_type, r.estate_agent_location,
    r.building_no,
    r.total_count
  from recent r
  join highs h
    on h.dong = r.dong and h.apt_name = r.apt_name and h.exclusive_area = r.exclusive_area
  order by r.deal_date desc;
$$ language sql stable;

-- 최근 N개월 동안 거래량이 가장 많은 동(법정동) 순위 — "요즘 거래 활발한 동" 파악용
create or replace function region_dong_ranking(p_region text, p_start date, p_limit int default 5)
returns table(dong text, cnt bigint, avg_price_per_pyeong numeric) as $$
  select
    dong,
    count(*) as cnt,
    round(avg(deal_amount / (exclusive_area / 3.3058))) as avg_price_per_pyeong
  from apt_trades
  where region_code = p_region and deal_date >= p_start
  group by dong
  order by cnt desc
  limit p_limit;
$$ language sql stable;
