"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QR({ value, size = 200, className }: { value: string; size?: number; className?: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    QRCode.toDataURL(value, { width: size, margin: 1, color: { dark: "#1E4D8C", light: "#FAF6E9" } })
      .then(setUrl)
      .catch(() => setUrl(""));
  }, [value, size]);
  if (!url) return <div style={{ width: size, height: size }} className="animate-pulse rounded-xl bg-steppe/20" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="QR code" width={size} height={size} className={className} />;
}
