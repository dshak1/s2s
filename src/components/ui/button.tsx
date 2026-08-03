"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "gold" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

// Solid flat color + a hard, unblurred offset shadow instead of a gradient —
// reads as a felt tile you press, not a generic SaaS CTA pill. No gradients
// anywhere in this file, on purpose.
const variants: Record<Variant, string> = {
  primary: "bg-steppe text-white hover:brightness-110 shadow-[3px_4px_0_0_#122e57]",
  gold: "bg-gold text-steppe-700 hover:brightness-105 shadow-[3px_4px_0_0_#b8960a]",
  ghost: "bg-transparent text-steppe hover:bg-steppe/10",
  outline: "bg-white text-steppe border-2 border-steppe hover:bg-steppe/5",
  danger: "bg-terra text-white hover:brightness-110 shadow-[3px_4px_0_0_#7c0a1f]",
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
        "inline-flex items-center justify-center gap-2 rounded-2xl font-extrabold transition active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});
