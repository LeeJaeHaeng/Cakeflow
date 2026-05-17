import type { Metadata } from "next";
import { DAY_KEYS, DAY_LABELS, type OperatingHours } from "@/lib/shop-settings";
import { getShopSettings } from "@/lib/shop-settings-server";

export const metadata: Metadata = {
  title: "매장정보",
};

function formatOperatingHours(operatingHours: OperatingHours) {
  return DAY_KEYS.map((day) => {
    const hour = operatingHours[day];
    const value = hour?.closed ? "휴무" : `${hour?.open ?? "10:00"} - ${hour?.close ?? "19:00"}`;
    return `${DAY_LABELS[day]} ${value}`;
  }).join(" / ");
}

export default async function StorePage() {
  const settings = await getShopSettings();
  const { shop_info: shopInfo, operating_hours: operatingHours } = settings;
  const mapQuery = encodeURIComponent(shopInfo.address || shopInfo.name);

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="mb-6 text-2xl font-bold text-foreground">{shopInfo.name}</h1>

      <div className="space-y-4">
        {/* 지도 */}
        <div className="aspect-video w-full overflow-hidden rounded-[var(--radius-lg)] bg-muted">
          <iframe
            src={`https://map.kakao.com/link/search/${mapQuery}`}
            className="w-full h-full"
            title={`${shopInfo.name} 지도`}
          />
        </div>

        {/* 정보 카드 */}
        <div className="divide-y divide-border rounded-[var(--radius-lg)] border border-border">
          <InfoRow label="주소" value={shopInfo.address} />
          <InfoRow label="운영시간" value={formatOperatingHours(operatingHours)} />
          <InfoRow label="전화" value={shopInfo.phone || "문의는 카카오톡 채널을 이용해주세요"} />
        </div>

        {/* 연락처 버튼 */}
        <div className="flex flex-col gap-3">
          <a
            href={shopInfo.kakao_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[#FEE500] font-semibold text-[#3A1D1D]"
          >
            💬 카카오톡 문의하기
          </a>
          <a
            href={shopInfo.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border font-medium text-foreground"
          >
            📷 인스타그램 팔로우
          </a>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          운영시간 외 문의는 인스타 DM 또는 카카오톡으로 남겨주세요.
        </p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}
