const PYEONG = 3.3058;

export type AreaBucket = {
  key: string;
  label: string;
  min?: number; // 전용면적(m²) 하한
  max?: number; // 전용면적(m²) 상한 (미만)
};

export const AREA_BUCKETS: AreaBucket[] = [
  { key: "", label: "전체 평형" },
  { key: "~10", label: "10평대 이하", max: 10 * PYEONG },
  { key: "10", label: "10평대", min: 10 * PYEONG, max: 20 * PYEONG },
  { key: "20", label: "20평대", min: 20 * PYEONG, max: 30 * PYEONG },
  { key: "30", label: "30평대", min: 30 * PYEONG, max: 40 * PYEONG },
  { key: "40", label: "40평대", min: 40 * PYEONG, max: 50 * PYEONG },
  { key: "50~", label: "50평대 이상", min: 50 * PYEONG },
];

export function bucketToRange(key: string | undefined): { min?: number; max?: number } {
  const bucket = AREA_BUCKETS.find((b) => b.key === (key ?? ""));
  return { min: bucket?.min, max: bucket?.max };
}
