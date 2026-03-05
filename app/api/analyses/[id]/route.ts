import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!supabaseServer) {
    return NextResponse.json(
      { error: "Supabase 未配置" },
      { status: 500 }
    );
  }
  const { error } = await supabaseServer.from("analyses").delete().eq("id", id);
  if (error) {
    console.error(error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
