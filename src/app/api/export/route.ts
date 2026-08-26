import { NextRequest, NextResponse } from "next/server";
import { getRegionTradesForExport } from "@/lib/queries";
import { REGIONS } from "@/lib/regions";

function csvEscape(v: string | number | null): string {
  if (v === null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const regionCode = req.nextUrl.searchParams.get("region");
  const startDate = req.nextUrl.searchParams.get("start") ?? undefined;
  const endDate = req.nextUrl.searchParams.get("end") ?? undefined;

  if (!regionCode) {
    return NextResponse.json({ error: "region 파라미터가 필요합니다." }, { status: 400 });
  }

  const region = REGIONS.find((r) => r.code === regionCode);
  const trades = await getRegionTradesForExport(regionCode, startDate, endDate);

  const header = [
    "동",
    "단지명",
    "전용면적(m2)",
    "층",
    "건축년도",
    "계약일",
    "거래금액(만원)",
    "해제일",
    "거래유형",
    "중개소재지",
  ];
  const lines = [header.map(csvEscape).join(",")];
  for (const t of trades) {
    lines.push(
      [
        t.dong,
        t.apt_name,
        t.exclusive_area,
        t.floor ?? "",
        t.build_year ?? "",
        t.deal_date,
        t.deal_amount,
        t.cancel_date ?? "",
        t.dealing_type ?? "",
        t.estate_agent_location ?? "",
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  // 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM 추가
  const csv = "﻿" + lines.join("\n");

  const filename = `${region?.city ?? "region"}_${region?.district ?? regionCode}_실거래가.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
