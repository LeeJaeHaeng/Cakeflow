import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const pretendard = localFont({
  src: "../public/fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "앙금앤케이크 — CakeFlow",
    template: "%s | 앙금앤케이크",
  },
  description:
    "수원 앙금앤케이크에서 떡케이크와 수제디저트를 주문하세요. 케이크 시뮬레이터로 원하는 디자인을 직접 만들어보세요.",
  keywords: ["떡케이크", "앙금플라워", "수원케이크", "수제디저트", "케이크주문"],
  icons: {
    icon: "/brand/anggeum-cake-logo.png",
    apple: "/brand/anggeum-cake-logo.png",
  },
  openGraph: {
    siteName: "앙금앤케이크",
    locale: "ko_KR",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#d4a574",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-bg text-fg antialiased">
        {children}
      </body>
    </html>
  );
}
