import { NextResponse } from "next/server";
import { removeFavorite } from "@/lib/queries";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  await removeFavorite(numericId);
  return NextResponse.json({ ok: true });
}
