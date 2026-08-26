// 법정동 코드(5자리 시군구 코드) 목록
// 국토교통부 실거래가 API의 LAWD_CD 파라미터로 사용됩니다.
// 1단계 범위: 서울 전체 25개 구 + 주요 광역시 대표 구 몇 곳.
// 나중에 관심 단지/지역을 추가하려면 이 배열에 항목을 추가하면 됩니다.
// lat/lng은 지도 시각화용 대략적인 구청/중심가 좌표입니다 (행정구역 정확한 중심이 아닌 근사치).

export type Region = {
  code: string; // 5자리 법정동 코드
  city: string; // 시/도
  district: string; // 시/군/구
  lat: number;
  lng: number;
};

export const REGIONS: Region[] = [
  // 서울특별시 (25개 구 전체)
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

  // 부산광역시 (주요 구)
  { code: "26110", city: "부산", district: "중구", lat: 35.106, lng: 129.032 },
  { code: "26230", city: "부산", district: "부산진구", lat: 35.163, lng: 129.053 },
  { code: "26260", city: "부산", district: "동래구", lat: 35.204, lng: 129.084 },
  { code: "26290", city: "부산", district: "남구", lat: 35.136, lng: 129.084 },
  { code: "26350", city: "부산", district: "해운대구", lat: 35.163, lng: 129.163 },
  { code: "26500", city: "부산", district: "수영구", lat: 35.145, lng: 129.113 },

  // 대구광역시
  { code: "27110", city: "대구", district: "중구", lat: 35.869, lng: 128.606 },
  { code: "27260", city: "대구", district: "수성구", lat: 35.858, lng: 128.630 },
  { code: "27290", city: "대구", district: "달서구", lat: 35.830, lng: 128.532 },

  // 인천광역시
  { code: "28110", city: "인천", district: "중구", lat: 37.474, lng: 126.621 },
  { code: "28185", city: "인천", district: "연수구", lat: 37.410, lng: 126.678 },
  { code: "28200", city: "인천", district: "남동구", lat: 37.447, lng: 126.731 },
  { code: "28237", city: "인천", district: "부평구", lat: 37.507, lng: 126.721 },

  // 광주광역시
  { code: "29110", city: "광주", district: "동구", lat: 35.146, lng: 126.923 },
  { code: "29140", city: "광주", district: "서구", lat: 35.152, lng: 126.890 },
  { code: "29155", city: "광주", district: "남구", lat: 35.133, lng: 126.902 },

  // 대전광역시
  { code: "30170", city: "대전", district: "서구", lat: 36.354, lng: 127.383 },
  { code: "30200", city: "대전", district: "유성구", lat: 36.362, lng: 127.356 },

  // 울산광역시
  { code: "31110", city: "울산", district: "중구", lat: 35.569, lng: 129.333 },
  { code: "31140", city: "울산", district: "남구", lat: 35.544, lng: 129.330 },

  // 세종특별자치시
  { code: "36110", city: "세종", district: "세종시", lat: 36.480, lng: 127.289 },
];
