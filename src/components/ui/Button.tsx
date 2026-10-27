import Link from "next/link";
import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "money";
type Size = "lg" | "md" | "sm";

const base =
  "pressable inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold tracking-[-0.01em] disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-glass",
  ghost: "text-ink-soft hover:text-ink",
  money: "btn-primary",
};

const sizes: Record<Size, string> = {
  lg: "h-[54px] px-6 text-[17px]",
  md: "h-11 px-5 text-[15px]",
  sm: "h-11 px-4 text-[14px]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "lg", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "lg",
  className,
  children,
  ...rest
}: { variant?: Variant; size?: Size; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "lg",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}
