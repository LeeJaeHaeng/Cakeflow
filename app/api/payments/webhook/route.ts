import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ ok: true, ignored: true, reason: "online_payment_disabled" });
}
