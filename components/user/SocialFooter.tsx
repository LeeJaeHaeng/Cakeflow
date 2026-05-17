import { BrandLogo } from "@/components/brand/BrandLogo";
import { getShopSettings } from "@/lib/shop-settings-server";

export async function SocialFooter() {
  const { shop_info: shopInfo } = await getShopSettings();

  return (
    <footer className="mb-24 border-t border-border bg-background px-4 py-6 md:mb-0">
      <div className="flex flex-col items-center gap-4 text-center">
        <BrandLogo className="h-12 max-w-[196px]" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          {shopInfo.address}
        </p>

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
            href={`tel:${shopInfo.phone}`}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-xl transition-colors hover:border-primary"
            aria-label="전화 문의"
          >
            📞
          </a>
        </div>

        <p className="text-xs text-muted-foreground">
          © 2025 앙금앤케이크. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
