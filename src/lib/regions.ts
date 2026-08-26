// 법정동 코드(5자리 시군구 코드) 목록
// 국토교통부 실거래가 API의 LAWD_CD 파라미터로 사용됩니다.
// 1단계 범위: 서울 전체 25개 구 + 주요 광역시 대표 구 몇 곳.
// 나중에 관심 단지/지역을 추가하려면 이 배열에 항목을 추가하면 됩니다.

export type Region = {
  code: string; // 5자리 법정동 코드
  city: string; // 시/도
  district: string; // 시/군/구
};

export const REGIONS: Region[] = [
  // 서울특별시 (25개 구 전체)
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

  // 부산광역시 (주요 구)
  { code: "26110", city: "부산", district: "중구" },
  { code: "26230", city: "부산", district: "부산진구" },
  { code: "26260", city: "부산", district: "동래구" },
  { code: "26290", city: "부산", district: "남구" },
  { code: "26350", city: "부산", district: "해운대구" },
  { code: "26500", city: "부산", district: "수영구" },

  // 대구광역시
  { code: "27110", city: "대구", district: "중구" },
  { code: "27260", city: "대구", district: "수성구" },
  { code: "27290", city: "대구", district: "달서구" },

  // 인천광역시
  { code: "28110", city: "인천", district: "중구" },
  { code: "28185", city: "인천", district: "연수구" },
  { code: "28200", city: "인천", district: "남동구" },
  { code: "28237", city: "인천", district: "부평구" },

  // 광주광역시
  { code: "29110", city: "광주", district: "동구" },
  { code: "29140", city: "광주", district: "서구" },
  { code: "29155", city: "광주", district: "남구" },

  // 대전광역시
  { code: "30170", city: "대전", district: "서구" },
  { code: "30200", city: "대전", district: "유성구" },

  // 울산광역시
  { code: "31110", city: "울산", district: "중구" },
  { code: "31140", city: "울산", district: "남구" },

  // 세종특별자치시
  { code: "36110", city: "세종", district: "세종시" },
];
