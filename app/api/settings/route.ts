import { NextResponse } from "next/server";
import { getShopSettings } from "@/lib/shop-settings-server";

export async function GET() {
  const settings = await getShopSettings();
  return NextResponse.json({
    shop_info: settings.shop_info,
    operating_hours: settings.operating_hours,
  });
}
