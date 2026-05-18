import type { Metadata } from "next";
import Link from "next/link";
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
  const mapQuery = encodeURIComponent(`${shopInfo.name} ${shopInfo.address}`.trim());
  const mapUrl = `https://map.kakao.com/link/search/${mapQuery}`;

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="mb-6 text-2xl font-bold text-foreground">{shopInfo.name}</h1>

      <div className="space-y-4">
        <div className="rounded-[var(--radius-lg)] border border-border bg-muted/40 p-4">
          <p className="text-sm font-semibold text-foreground">{shopInfo.name}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{shopInfo.address}</p>
          <div className="mt-4 flex gap-2">
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 flex-1 items-center justify-center rounded-[var(--radius-md)] bg-primary px-3 text-sm font-semibold text-primary-foreground"
            >
              카카오맵에서 보기
            </a>
            <Link
              href="/"
              className="flex h-11 items-center justify-center rounded-[var(--radius-md)] border border-border px-3 text-sm font-medium text-foreground"
            >
              홈
            </Link>
          </div>
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
