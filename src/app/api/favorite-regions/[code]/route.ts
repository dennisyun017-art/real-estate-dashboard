import { NextResponse } from "next/server";
import { removeFavoriteRegion } from "@/lib/queries";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  await removeFavoriteRegion(code);
  return NextResponse.json({ ok: true });
}
