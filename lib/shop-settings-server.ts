import { createServiceClient } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS, mergeShopSettings, type ShopSettings } from "@/lib/shop-settings";

type ShopSettingsRow = { key: string; value: unknown };
type ShopSettingsClient = {
  from(table: "shop_settings"): {
    select(columns: "*"): Promise<{ data: ShopSettingsRow[] | null; error: { message: string } | null }>;
  };
};

export async function getShopSettings(): Promise<ShopSettings> {
  const supabase = await createServiceClient();
  const { data, error } = await (supabase as unknown as ShopSettingsClient).from("shop_settings").select("*");

  if (error) {
    console.error("[shop-settings]", error.message);
    return DEFAULT_SETTINGS;
  }

  const settings: Record<string, unknown> = {};
  (data ?? []).forEach((row) => {
    settings[row.key] = row.value;
  });

  return mergeShopSettings(settings);
}
