import { NextResponse } from "next/server";

const UNLOCK_PASSWORD = process.env.UNLOCK_PASSWORD ?? "";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const password = body?.password ?? "";
    if (!UNLOCK_PASSWORD) {
      return NextResponse.json({ ok: true });
    }
    if (password === UNLOCK_PASSWORD) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false }, { status: 401 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
