"use client";

import { useProfile } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Avatar({ size = 48, className }: { size?: number; className?: string }) {
  const p = useProfile();
  const art = p.artifacts.find((a) => a.id === p.avatarArtifactId);
  return (
    <div
      className={cn("overflow-hidden rounded-full bg-gold ring-2 ring-gold", className)}
      style={{ width: size, height: size }}
    >
      {art ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={art.dataUrl} alt="avatar" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-steppe text-warm font-black" style={{ fontSize: size * 0.45 }}>
          {(p.displayName?.[0] ?? "K").toUpperCase()}
        </div>
      )}
    </div>
  );
}
