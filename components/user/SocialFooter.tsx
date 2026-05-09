export function SocialFooter() {
  return (
    <footer className="border-t border-[var(--color-line)] bg-[var(--color-bg)] px-4 py-6 mb-16 md:mb-0">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm font-semibold text-[var(--color-fg)]">앙금앤케이크</p>
        <p className="text-xs text-[var(--color-muted)] leading-relaxed">
          경기 수원시 팔달구 정자천로14번길 40
        </p>

        <div className="flex items-center gap-4">
          <a
            href="https://instagram.com/anggeumandcake"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-line)] text-xl hover:border-[var(--color-primary)] transition-colors"
            aria-label="인스타그램"
          >
            📷
          </a>
          <a
            href="https://pf.kakao.com/_hXAiK"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-line)] text-xl hover:border-[var(--color-primary)] transition-colors"
            aria-label="카카오톡 채널"
          >
            💬
          </a>
          <a
            href="tel:031-0000-0000"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-line)] text-xl hover:border-[var(--color-primary)] transition-colors"
            aria-label="전화 문의"
          >
            📞
          </a>
        </div>

        <p className="text-xs text-[var(--color-muted)]">
          © 2025 앙금앤케이크. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
