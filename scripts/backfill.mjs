// 과거 실거래가 백필 스크립트 (로컬에서 1회성으로 실행).
// Vercel 서버리스 함수의 시간 제한 없이 로컬에서 오래 걸리는 작업을 처리하기 위함입니다.
//
// 실행: node --env-file=.env.local scripts/backfill.mjs [개월수]
// 기본 개월수: 36 (최근 3년)
import { createClient } from "@supabase/supabase-js";
import { XMLParser } from "fast-xml-parser";

const MONTHS_BACK = Number(process.argv[2]) || 36;
const ENDPOINT =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade";
const DELAY_MS = 150; // 공공데이터포털 초당 호출 제한을 피하기 위한 간격

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const REGIONS = [
  { code: "11110", city: "서울", district: "종로구" },
  { code: "11140", city: "서울", district: "중구" },
  { code: "11170", city: "서울", district: "용산구" },
  { code: "11200", city: "서울", district: "성동구" },
  { code: "11215", city: "서울", district: "광진구" },
  { code: "11230", city: "서울", district: "동대문구" },
  { code: "11260", city: "서울", district: "중랑구" },
  { code: "11290", city: "서울", district: "성북구" },
  { code: "11305", city: "서울", district: "강북구" },
  { code: "11320", city: "서울", district: "도봉구" },
  { code: "11350", city: "서울", district: "노원구" },
  { code: "11380", city: "서울", district: "은평구" },
  { code: "11410", city: "서울", district: "서대문구" },
  { code: "11440", city: "서울", district: "마포구" },
  { code: "11470", city: "서울", district: "양천구" },
  { code: "11500", city: "서울", district: "강서구" },
  { code: "11530", city: "서울", district: "구로구" },
  { code: "11545", city: "서울", district: "금천구" },
  { code: "11560", city: "서울", district: "영등포구" },
  { code: "11590", city: "서울", district: "동작구" },
  { code: "11620", city: "서울", district: "관악구" },
  { code: "11650", city: "서울", district: "서초구" },
  { code: "11680", city: "서울", district: "강남구" },
  { code: "11710", city: "서울", district: "송파구" },
  { code: "11740", city: "서울", district: "강동구" },
  { code: "26110", city: "부산", district: "중구" },
  { code: "26230", city: "부산", district: "부산진구" },
  { code: "26260", city: "부산", district: "동래구" },
  { code: "26290", city: "부산", district: "남구" },
  { code: "26350", city: "부산", district: "해운대구" },
  { code: "26500", city: "부산", district: "수영구" },
  { code: "27110", city: "대구", district: "중구" },
  { code: "27260", city: "대구", district: "수성구" },
  { code: "27290", city: "대구", district: "달서구" },
  { code: "28110", city: "인천", district: "중구" },
  { code: "28185", city: "인천", district: "연수구" },
  { code: "28200", city: "인천", district: "남동구" },
  { code: "28237", city: "인천", district: "부평구" },
  { code: "29110", city: "광주", district: "동구" },
  { code: "29140", city: "광주", district: "서구" },
  { code: "29155", city: "광주", district: "남구" },
  { code: "30170", city: "대전", district: "서구" },
  { code: "30200", city: "대전", district: "유성구" },
  { code: "31110", city: "울산", district: "중구" },
  { code: "31140", city: "울산", district: "남구" },
  { code: "36110", city: "세종", district: "세종시" },
  { code: "41111", city: "수원", district: "장안구" },
  { code: "41113", city: "수원", district: "권선구" },
  { code: "41115", city: "수원", district: "팔달구" },
  { code: "41117", city: "수원", district: "영통구" },
  { code: "41465", city: "용인", district: "수지구" },
  { code: "41597", city: "화성", district: "동탄구" },
];

const parser = new XMLParser();

function toNumber(v) {
  if (v === undefined || v === null) return NaN;
  const s = String(v).trim().replace(/,/g, "");
  return s === "" ? NaN : Number(s);
}
function toTrimmedStringOrNull(v) {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}
function parseShortDate(v) {
  const s = toTrimmedStringOrNull(v);
  if (!s) return null;
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (!m) return null;
  const [, yy, mm, dd] = m;
  return `20${yy}-${mm}-${dd}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchAptTrades(lawdCd, dealYm) {
  const serviceKey = process.env.MOLIT_API_KEY;
  const url = `${ENDPOINT}?serviceKey=${serviceKey}&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYm}&numOfRows=1000&pageNo=1`;
  const res = await fetch(url, { cache: "no-store" });
  const xml = await res.text();
  const parsed = parser.parse(xml);
  const header = parsed?.response?.header;
  const resultCode = String(header?.resultCode ?? "").padStart(3, "0");
  if (resultCode !== "000") {
    throw new Error(`${header?.resultCode} ${header?.resultMsg ?? ""}`);
  }
  const rawItems = parsed?.response?.body?.items?.item;
  if (!rawItems) return [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];
  return items
    .map((it) => ({
      dong: String(it.umdNm ?? "").trim(),
      jibun: String(it.jibun ?? "").trim(),
      aptName: String(it.aptNm ?? "").trim(),
      buildYear: Number.isFinite(toNumber(it.buildYear)) ? toNumber(it.buildYear) : null,
      exclusiveArea: toNumber(it.excluUseAr),
      floor: Number.isFinite(toNumber(it.floor)) ? toNumber(it.floor) : null,
      dealYear: toNumber(it.dealYear),
      dealMonth: toNumber(it.dealMonth),
      dealDay: toNumber(it.dealDay),
      dealAmount: toNumber(it.dealAmount),
      cancelDate: parseShortDate(it.cdealDay),
      dealingType: toTrimmedStringOrNull(it.dealingGbn),
      estateAgentLocation: toTrimmedStringOrNull(it.estateAgentSggNm),
    }))
    .filter((t) => Number.isFinite(t.dealAmount) && t.aptName !== "");
}

function recentDealYm(monthsBack) {
  const result = [];
  const now = new Date();
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return result;
}

function toDealDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

async function main() {
  const dealYms = recentDealYm(MONTHS_BACK);
  let totalUpserted = 0;
  let totalErrors = 0;
  const startedAt = Date.now();

  for (const [ri, region] of REGIONS.entries()) {
    for (const [mi, ym] of dealYms.entries()) {
      try {
        const trades = await fetchAptTrades(region.code, ym);
        if (trades.length > 0) {
          const rows = trades.map((t) => ({
            region_code: region.code,
            city: region.city,
            district: region.district,
            dong: t.dong,
            jibun: t.jibun,
            apt_name: t.aptName,
            build_year: t.buildYear,
            exclusive_area: t.exclusiveArea,
            floor: t.floor,
            deal_date: toDealDate(t.dealYear, t.dealMonth, t.dealDay),
            deal_amount: t.dealAmount,
            cancel_date: t.cancelDate,
            dealing_type: t.dealingType,
            estate_agent_location: t.estateAgentLocation,
            updated_at: new Date().toISOString(),
          }));
          const deduped = Array.from(
            new Map(
              rows.map((r) => [
                [r.region_code, r.dong, r.jibun, r.apt_name, r.exclusive_area, r.floor, r.deal_date, r.deal_amount].join("|"),
                r,
              ])
            ).values()
          );
          const { error } = await supabase.from("apt_trades").upsert(deduped, {
            onConflict: "region_code,dong,jibun,apt_name,exclusive_area,floor,deal_date,deal_amount",
            ignoreDuplicates: false,
          });
          if (error) {
            totalErrors++;
            console.error(`  [ERR] ${region.city} ${region.district} ${ym}: ${error.message}`);
          } else {
            totalUpserted += deduped.length;
          }
        }
      } catch (e) {
        totalErrors++;
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`  [ERR] ${region.city} ${region.district} ${ym}: ${msg}`);
        // 하루 호출 한도 초과로 보이면 더 진행해도 의미가 없으니 중단
        if (/LIMITED_NUMBER_OF_SERVICE_REQUESTS|traffic|quota|초과/i.test(msg)) {
          console.error("일일 호출 한도를 초과한 것으로 보입니다. 스크립트를 종료합니다. 내일 다시 실행하면 이어서 채워집니다.");
          printSummary(totalUpserted, totalErrors, startedAt);
          process.exit(1);
        }
      }
      await sleep(DELAY_MS);
    }
    const done = ri + 1;
    console.log(
      `[${done}/${REGIONS.length}] ${region.city} ${region.district} 완료 — 누적 upsert ${totalUpserted}건, 오류 ${totalErrors}건`
    );
  }

  printSummary(totalUpserted, totalErrors, startedAt);
}

function printSummary(totalUpserted, totalErrors, startedAt) {
  const minutes = ((Date.now() - startedAt) / 60000).toFixed(1);
  console.log(`\n완료: upsert ${totalUpserted}건, 오류 ${totalErrors}건, 소요 ${minutes}분`);
}

main();
