const ENDPOINT = "https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInRadius";
const PAGE_SIZE = 1000;
const DELAY_MS = 150;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type CommerceCategoryCount = { category: string; count: number };

/**
 * 좌표(lat, lng) 기준 반경(m) 내 상가업소를 업종 대분류(indsLclsNm)별로 집계합니다.
 * 소상공인시장진흥공단 상가(상권)정보 API — 개별 점포 단위로만 조회되므로 페이지네이션 전체를 순회합니다.
 */
export async function fetchCommerceCategoryCounts(
  lat: number,
  lng: number,
  radiusM: number
): Promise<CommerceCategoryCount[]> {
  const key = process.env.MOLIT_API_KEY;
  if (!key) throw new Error("MOLIT_API_KEY가 설정되어 있지 않습니다.");

  const counts = new Map<string, number>();
  let pageNo = 1;

  for (;;) {
    const url = `${ENDPOINT}?serviceKey=${key}&radius=${radiusM}&cx=${lng}&cy=${lat}&type=json&numOfRows=${PAGE_SIZE}&pageNo=${pageNo}`;
    const res = await fetch(url);
    const json = await res.json();

    if (json?.header?.resultCode && json.header.resultCode !== "00") {
      throw new Error(`${json.header.resultCode} ${json.header.resultMsg}`);
    }

    const items = (json?.body?.items ?? []) as { indsLclsNm?: string }[];
    if (items.length === 0) break;

    for (const it of items) {
      if (!it.indsLclsNm) continue;
      counts.set(it.indsLclsNm, (counts.get(it.indsLclsNm) ?? 0) + 1);
    }

    const totalCount = json?.body?.totalCount ?? 0;
    if (pageNo * PAGE_SIZE >= totalCount) break;
    pageNo++;
    await sleep(DELAY_MS);
  }

  return Array.from(counts.entries()).map(([category, count]) => ({ category, count }));
}
