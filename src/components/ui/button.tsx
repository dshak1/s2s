"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "gold" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-steppe text-white hover:bg-steppe-700 shadow-md",
  gold: "bg-[linear-gradient(135deg,#ffd84f_0%,#ff9a4f_52%,#ff6f9f_100%)] text-steppe-700 hover:brightness-105 shadow-md shadow-orange-200/60",
  ghost: "bg-transparent text-steppe hover:bg-steppe/10",
  outline: "bg-white text-steppe border-2 border-steppe hover:bg-steppe/5",
  danger: "bg-terra text-white hover:brightness-95 shadow-md",
};
const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-base",
  lg: "px-7 py-4 text-lg",
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(function Button({ className, variant = "primary", size = "md", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-extrabold transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});
