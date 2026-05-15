"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            fontFamily: "system-ui, sans-serif",
            background: "#fffaf8",
            color: "#1f1a17",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: 360 }}>
            <h1 style={{ margin: 0, fontSize: 22 }}>서비스 오류가 발생했습니다</h1>
            <p style={{ margin: "12px 0 20px", color: "#6b625c", lineHeight: 1.6 }}>
              화면을 다시 불러오거나 잠시 후 다시 접속해 주세요.
            </p>
            <button
              onClick={reset}
              style={{
                height: 44,
                padding: "0 18px",
                borderRadius: 12,
                border: 0,
                background: "#c8534a",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              다시 시도
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
