import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "온라인 결제는 사용하지 않습니다. 주문 접수 후 계좌이체 안내로 예약을 확정합니다." },
    { status: 410 }
  );
}
