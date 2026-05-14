import Image from "next/image";
import { cn } from "@/lib/utils/cn";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ className, priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/brand/anggeum-cake-logo.svg"
      alt="앙금앤케이크 로고"
      width={260}
      height={105}
      priority={priority}
      className={cn("block h-auto w-auto object-contain", className)}
    />
  );
}
