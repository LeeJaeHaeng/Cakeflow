import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16 text-center text-foreground">
      <div className="w-full max-w-sm space-y-5">
        <div>
          <p className="text-sm font-semibold text-primary">404</p>
          <h1 className="mt-2 text-xl font-bold">페이지를 찾을 수 없습니다</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            주소가 바뀌었거나 삭제된 페이지입니다.
          </p>
        </div>
        <Link
          href="/"
          className="mx-auto flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
        >
          <Home size={16} />
          홈으로 돌아가기
        </Link>
      </div>
    </main>
  );
}
