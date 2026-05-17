import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "온라인 결제 검증은 사용하지 않습니다. 계좌이체 입금은 관리자 화면에서 수동 확인합니다." },
    { status: 410 }
  );
}
