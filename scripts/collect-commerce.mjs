// 지역별 생활 인프라(상가업소) 업종 대분류 집계 — 로컬에서 주기적으로(월 1회 정도) 실행.
// 소상공인시장진흥공단 상가업소정보는 분기 단위 스냅샷이라 자주 바뀌지 않으므로
// 매 페이지 로드 때 호출하지 않고 이 스크립트로 미리 집계해서 DB에 저장해둡니다.
//
// 실행: node --env-file=.env.local scripts/collect-commerce.mjs
import { createClient } from "@supabase/supabase-js";

const ENDPOINT = "https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInRadius";
const RADIUS_M = 3000;
const PAGE_SIZE = 1000;
const DELAY_MS = 200;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// src/lib/regions.ts와 동일한 목록 (좌표 포함) — ESM 스크립트라 TS를 직접 import 못해서 복사
const REGIONS = [
  { code: "11110", city: "서울", district: "종로구", lat: 37.573, lng: 126.979 },
  { code: "11140", city: "서울", district: "중구", lat: 37.560, lng: 126.998 },
  { code: "11170", city: "서울", district: "용산구", lat: 37.532, lng: 126.990 },
  { code: "11200", city: "서울", district: "성동구", lat: 37.563, lng: 127.036 },
  { code: "11215", city: "서울", district: "광진구", lat: 37.538, lng: 127.082 },
  { code: "11230", city: "서울", district: "동대문구", lat: 37.574, lng: 127.039 },
  { code: "11260", city: "서울", district: "중랑구", lat: 37.606, lng: 127.093 },
  { code: "11290", city: "서울", district: "성북구", lat: 37.589, lng: 127.016 },
  { code: "11305", city: "서울", district: "강북구", lat: 37.639, lng: 127.025 },
  { code: "11320", city: "서울", district: "도봉구", lat: 37.668, lng: 127.047 },
  { code: "11350", city: "서울", district: "노원구", lat: 37.654, lng: 127.056 },
  { code: "11380", city: "서울", district: "은평구", lat: 37.602, lng: 126.929 },
  { code: "11410", city: "서울", district: "서대문구", lat: 37.579, lng: 126.936 },
  { code: "11440", city: "서울", district: "마포구", lat: 37.566, lng: 126.901 },
  { code: "11470", city: "서울", district: "양천구", lat: 37.517, lng: 126.866 },
  { code: "11500", city: "서울", district: "강서구", lat: 37.550, lng: 126.850 },
  { code: "11530", city: "서울", district: "구로구", lat: 37.495, lng: 126.888 },
  { code: "11545", city: "서울", district: "금천구", lat: 37.456, lng: 126.895 },
  { code: "11560", city: "서울", district: "영등포구", lat: 37.526, lng: 126.896 },
  { code: "11590", city: "서울", district: "동작구", lat: 37.512, lng: 126.939 },
  { code: "11620", city: "서울", district: "관악구", lat: 37.478, lng: 126.951 },
  { code: "11650", city: "서울", district: "서초구", lat: 37.483, lng: 127.032 },
  { code: "11680", city: "서울", district: "강남구", lat: 37.517, lng: 127.047 },
  { code: "11710", city: "서울", district: "송파구", lat: 37.514, lng: 127.106 },
  { code: "11740", city: "서울", district: "강동구", lat: 37.530, lng: 127.124 },
  { code: "26110", city: "부산", district: "중구", lat: 35.106, lng: 129.032 },
  { code: "26230", city: "부산", district: "부산진구", lat: 35.163, lng: 129.053 },
  { code: "26260", city: "부산", district: "동래구", lat: 35.204, lng: 129.084 },
  { code: "26290", city: "부산", district: "남구", lat: 35.136, lng: 129.084 },
  { code: "26350", city: "부산", district: "해운대구", lat: 35.163, lng: 129.163 },
  { code: "26500", city: "부산", district: "수영구", lat: 35.145, lng: 129.113 },
  { code: "27110", city: "대구", district: "중구", lat: 35.869, lng: 128.606 },
  { code: "27260", city: "대구", district: "수성구", lat: 35.858, lng: 128.630 },
  { code: "27290", city: "대구", district: "달서구", lat: 35.830, lng: 128.532 },
  { code: "28110", city: "인천", district: "중구", lat: 37.474, lng: 126.621 },
  { code: "28185", city: "인천", district: "연수구", lat: 37.410, lng: 126.678 },
  { code: "28200", city: "인천", district: "남동구", lat: 37.447, lng: 126.731 },
  { code: "28237", city: "인천", district: "부평구", lat: 37.507, lng: 126.721 },
  { code: "29110", city: "광주", district: "동구", lat: 35.146, lng: 126.923 },
  { code: "29140", city: "광주", district: "서구", lat: 35.152, lng: 126.890 },
  { code: "29155", city: "광주", district: "남구", lat: 35.133, lng: 126.902 },
  { code: "30170", city: "대전", district: "서구", lat: 36.354, lng: 127.383 },
  { code: "30200", city: "대전", district: "유성구", lat: 36.362, lng: 127.356 },
  { code: "31110", city: "울산", district: "중구", lat: 35.569, lng: 129.333 },
  { code: "31140", city: "울산", district: "남구", lat: 35.544, lng: 129.330 },
  { code: "36110", city: "세종", district: "세종시", lat: 36.480, lng: 127.289 },
  { code: "41111", city: "수원", district: "장안구", lat: 37.298, lng: 127.010 },
  { code: "41113", city: "수원", district: "권선구", lat: 37.263, lng: 126.971 },
  { code: "41115", city: "수원", district: "팔달구", lat: 37.281, lng: 127.019 },
  { code: "41117", city: "수원", district: "영통구", lat: 37.259, lng: 127.058 },
  { code: "41465", city: "용인", district: "수지구", lat: 37.322, lng: 127.097 },
  { code: "41597", city: "화성", district: "동탄구", lat: 37.201, lng: 127.075 },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchAllCategories(lat, lng) {
  const counts = new Map();
  let pageNo = 1;
  const key = process.env.MOLIT_API_KEY; // 공공데이터포털 일반 인증키 재사용 (실거래가 API와 동일 키)

  for (;;) {
    const url = `${ENDPOINT}?serviceKey=${key}&radius=${RADIUS_M}&cx=${lng}&cy=${lat}&type=json&numOfRows=${PAGE_SIZE}&pageNo=${pageNo}`;
    const res = await fetch(url);
    const json = await res.json();

    if (json?.header?.resultCode && json.header.resultCode !== "00") {
      throw new Error(`${json.header.resultCode} ${json.header.resultMsg}`);
    }

    const items = json?.body?.items ?? [];
    if (items.length === 0) break;

    for (const it of items) {
      const cat = it.indsLclsNm;
      if (!cat) continue;
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }

    const totalCount = json?.body?.totalCount ?? 0;
    if (pageNo * PAGE_SIZE >= totalCount) break;
    pageNo++;
    await sleep(DELAY_MS);
  }

  return counts;
}

async function main() {
  let totalUpserted = 0;
  for (const [i, region] of REGIONS.entries()) {
    try {
      const counts = await fetchAllCategories(region.lat, region.lng);
      const rows = Array.from(counts.entries()).map(([category, cnt]) => ({
        region_code: region.code,
        category,
        cnt,
        radius_m: RADIUS_M,
        collected_at: new Date().toISOString(),
      }));
      if (rows.length > 0) {
        const { error } = await supabase
          .from("region_commerce_summary")
          .upsert(rows, { onConflict: "region_code,category" });
        if (error) throw new Error(error.message);
        totalUpserted += rows.length;
      }
      console.log(
        `[${i + 1}/${REGIONS.length}] ${region.city} ${region.district} — 업종 ${rows.length}개 카테고리`
      );
    } catch (e) {
      console.error(`  [ERR] ${region.city} ${region.district}: ${e instanceof Error ? e.message : e}`);
    }
    await sleep(DELAY_MS);
  }
  console.log(`\n완료: ${totalUpserted}개 행 upsert`);
}

main();
