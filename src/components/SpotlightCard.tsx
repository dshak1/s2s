"use client";

import { useRef, useState, type PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

type SpotlightCardProps = PropsWithChildren<{
  className?: string;
  spotlightColor?: `rgba(${number}, ${number}, ${number}, ${number})`;
}>;

// Installed from the free React Bits shadcn registry, then adapted to the
// project palette and tighter card radius.
export default function SpotlightCard({
  children,
  className,
  spotlightColor = "rgba(255, 216, 79, 0.28)",
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  function move(event: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current || focused) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={move}
      onFocus={() => {
        setFocused(true);
        setOpacity(1);
      }}
      onBlur={() => {
        setFocused(false);
        setOpacity(0);
      }}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={cn("relative overflow-hidden rounded-lg", className)}
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 72%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
