// 국토교통부 아파트 매매 실거래자료 API 클라이언트
// https://www.data.go.kr/data/15057511/openapi.do
import { XMLParser } from "fast-xml-parser";

const ENDPOINT =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade";

export type AptTrade = {
  regionCode: string; // sggCd
  dong: string; // umdNm
  jibun: string;
  aptName: string; // aptNm
  buildYear: number | null;
  exclusiveArea: number; // excluUseAr (전용면적, m^2)
  floor: number | null;
  dealYear: number;
  dealMonth: number;
  dealDay: number;
  dealAmount: number; // 만원 단위
  cancelDate: string | null; // cdealDay, 계약 해제일 (YYYY-MM-DD), 없으면 null
  dealingType: string | null; // dealingGbn: 중개거래 | 직거래
  estateAgentLocation: string | null; // estateAgentSggNm: 중개사무소 소재지
  buildingNo: string | null; // aptDong: 동(건물) 번호. 호수는 개인정보라 공공데이터에 없음
};

const parser = new XMLParser();

function toNumber(v: unknown): number {
  if (v === undefined || v === null) return NaN;
  const s = String(v).trim().replace(/,/g, "");
  return s === "" ? NaN : Number(s);
}

function toTrimmedStringOrNull(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

// cdealDay는 "26.08.20" (YY.MM.DD) 형식으로 내려옵니다. 비어있으면 해제되지 않은 거래입니다.
function parseShortDate(v: unknown): string | null {
  const s = toTrimmedStringOrNull(v);
  if (!s) return null;
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (!m) return null;
  const [, yy, mm, dd] = m;
  return `20${yy}-${mm}-${dd}`;
}

/**
 * 특정 지역(법정동 5자리 코드) x 계약년월(YYYYMM)의 아파트 매매 실거래 목록을 가져옵니다.
 * 공공데이터포털은 한 번에 최대 1000건까지 조회 가능합니다.
 */
export async function fetchAptTrades(
  lawdCd: string,
  dealYm: string
): Promise<AptTrade[]> {
  const serviceKey = process.env.MOLIT_API_KEY;
  if (!serviceKey) {
    throw new Error("MOLIT_API_KEY 환경변수가 설정되어 있지 않습니다.");
  }

  const url =
    `${ENDPOINT}?serviceKey=${serviceKey}` +
    `&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYm}&numOfRows=1000&pageNo=1`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`실거래가 API 호출 실패: HTTP ${res.status}`);
  }
  const xml = await res.text();
  const parsed = parser.parse(xml);

  const header = parsed?.response?.header;
  // fast-xml-parser는 "000" 같은 숫자처럼 보이는 문자열을 자동으로 숫자로 변환하므로
  // 문자열로 다시 변환해서 비교해야 합니다.
  const resultCode = String(header?.resultCode ?? "").padStart(3, "0");
  if (resultCode !== "000") {
    throw new Error(
      `실거래가 API 오류: ${header?.resultCode} ${header?.resultMsg ?? ""}`
    );
  }

  const rawItems = parsed?.response?.body?.items?.item;
  if (!rawItems) return [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];

  return items
    .map((it: Record<string, unknown>): AptTrade => ({
      regionCode: String(it.sggCd ?? lawdCd),
      dong: String(it.umdNm ?? "").trim(),
      jibun: String(it.jibun ?? "").trim(),
      aptName: String(it.aptNm ?? "").trim(),
      buildYear: Number.isFinite(toNumber(it.buildYear))
        ? toNumber(it.buildYear)
        : null,
      exclusiveArea: toNumber(it.excluUseAr),
      floor: Number.isFinite(toNumber(it.floor)) ? toNumber(it.floor) : null,
      dealYear: toNumber(it.dealYear),
      dealMonth: toNumber(it.dealMonth),
      dealDay: toNumber(it.dealDay),
      dealAmount: toNumber(it.dealAmount),
      cancelDate: parseShortDate(it.cdealDay),
      dealingType: toTrimmedStringOrNull(it.dealingGbn),
      estateAgentLocation: toTrimmedStringOrNull(it.estateAgentSggNm),
      buildingNo: toTrimmedStringOrNull(it.aptDong),
    }))
    .filter((t) => Number.isFinite(t.dealAmount) && t.aptName !== "");
}

/** YYYYMM 문자열의 배열을 만듭니다. 최근 달부터 과거로 monthsBack개월 */
export function recentDealYm(monthsBack: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
    result.push(ym);
  }
  return result;
}
