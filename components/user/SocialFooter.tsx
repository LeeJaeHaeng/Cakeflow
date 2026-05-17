import { BrandLogo } from "@/components/brand/BrandLogo";
import { BUSINESS_INFO, LEGAL_LINKS } from "@/lib/legal";
import { getShopSettings } from "@/lib/shop-settings-server";

export async function SocialFooter() {
  const { shop_info: shopInfo } = await getShopSettings();

  return (
    <footer className="mb-24 border-t border-border bg-background px-4 py-6 md:mb-0">
      <div className="flex flex-col items-center gap-4 text-center">
        <BrandLogo className="h-12 max-w-[196px]" />
        <div className="space-y-1 text-xs leading-relaxed text-muted-foreground">
          <p>{BUSINESS_INFO.businessName} | 대표자: {BUSINESS_INFO.representative}</p>
          <p>사업자등록번호: {BUSINESS_INFO.businessNumber}</p>
          <p>유선번호/대표 연락처: {BUSINESS_INFO.contact}</p>
          <p>{BUSINESS_INFO.address}</p>
        </div>

        <div className="flex items-center gap-4">
          <a
            href={shopInfo.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-xl transition-colors hover:border-primary"
            aria-label="인스타그램"
          >
            📷
          </a>
          <a
            href={shopInfo.kakao_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-xl transition-colors hover:border-primary"
            aria-label="카카오톡 채널"
          >
            💬
          </a>
          <a
            href={`tel:${BUSINESS_INFO.contact}`}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-xl transition-colors hover:border-primary"
            aria-label="전화 문의"
          >
            📞
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {LEGAL_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="underline-offset-2 hover:text-foreground hover:underline">
              {link.label}
            </a>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          © 2025 앙금앤케이크. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
