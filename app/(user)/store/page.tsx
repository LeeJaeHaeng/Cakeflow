import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "매장정보",
};

export default function StorePage() {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="mb-6 text-2xl font-bold text-foreground">매장정보</h1>

      <div className="space-y-4">
        {/* 지도 */}
        <div className="aspect-video w-full overflow-hidden rounded-[var(--radius-lg)] bg-muted">
          <iframe
            src="https://map.kakao.com/link/map/앙금앤케이크,37.2883,127.0162"
            className="w-full h-full"
            title="앙금앤케이크 지도"
          />
        </div>

        {/* 정보 카드 */}
        <div className="divide-y divide-border rounded-[var(--radius-lg)] border border-border">
          <InfoRow label="주소" value="경기 수원시 팔달구 정자천로14번길 40" />
          <InfoRow label="운영시간" value="확인 중 (사장님 문의)" />
          <InfoRow label="휴무일" value="확인 중 (사장님 문의)" />
          <InfoRow label="전화" value="문의는 카카오톡 채널을 이용해주세요" />
        </div>

        {/* 연락처 버튼 */}
        <div className="flex flex-col gap-3">
          <a
            href="https://pf.kakao.com/_hXAiK"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[#FEE500] font-semibold text-[#3A1D1D]"
          >
            💬 카카오톡 문의하기
          </a>
          <a
            href="https://instagram.com/anggeumandcake"
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
