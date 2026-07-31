// Chart primitives for the internal tools. Same visual language as
// src/components/admin/shell.tsx: cool grey, small type, real borders, no
// gradients, no rounded-everything.
//
// Palette is a single-hue slate ramp validated against a white card surface:
// monotone lightness, adjacent dL >= 0.06, light end 2.56:1 contrast, hue
// spread 9 degrees. Status colours are the reserved good/warning/critical
// steps and always ship with a word, never colour alone.

export const RAMP = ["#94a3b8", "#64748b", "#475569", "#0f172a"] as const;
export const INK = RAMP[3];

export const STATUS = {
  good: "#15803d",
  warning: "#a16207",
  critical: "#b91c1c",
} as const;

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "good" | "warning" | "critical";
}) {
  const color = tone === "neutral" ? undefined : STATUS[tone as keyof typeof STATUS];
  return (
    <div className="rounded-lg border border-[#e2e5ea] bg-white px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[#94a3b8]">
        {label}
      </p>
      <p
        className="mt-0.5 text-[22px] font-semibold tabular-nums tracking-tight"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[12px] text-[#94a3b8]">{hint}</p>}
    </div>
  );
}

/** Horizontal bars, one series, values direct-labelled. */
export function BarRows({
  rows,
}: {
  rows: Array<{ label: string; value: number; sub?: string; tooltip?: string }>;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.label} className="group relative">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-[13px] font-medium">{row.label}</span>
            <span className="shrink-0 text-[13px] font-semibold tabular-nums">
              {row.value.toLocaleString()}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-[#eef1f5]">
            <div
              className="h-full rounded"
              style={{ width: `${Math.max((row.value / max) * 100, 2)}%`, backgroundColor: INK }}
            />
          </div>
          {row.sub && <p className="mt-0.5 text-[12px] text-[#94a3b8]">{row.sub}</p>}
          {row.tooltip && (
            <span className="pointer-events-none absolute -top-1 left-0 z-10 hidden -translate-y-full whitespace-nowrap rounded-md bg-[#0f172a] px-2 py-1 text-[11px] text-white shadow-lg group-hover:block">
              {row.tooltip}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Columns over time, one series. */
export function Columns({
  points,
  valueLabel,
}: {
  points: Array<{ label: string; value: number; tooltip: string }>;
  valueLabel: string;
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <div>
      <div className="flex h-32 items-end gap-1.5">
        {points.map((p) => (
          <div
            key={p.label}
            className="group relative flex flex-1 flex-col items-center justify-end"
          >
            <span className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-md bg-[#0f172a] px-2 py-1 text-[11px] text-white shadow-lg group-hover:block">
              {p.tooltip}
            </span>
            <div
              className="w-full rounded-t-sm"
              style={{
                height: `${Math.max((p.value / max) * 100, 2)}%`,
                backgroundColor: INK,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {points.map((p) => (
          <span
            key={p.label}
            className="flex-1 truncate text-center text-[10px] text-[#94a3b8]"
          >
            {p.label}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[12px] text-[#94a3b8]">{valueLabel}</p>
    </div>
  );
}

export function StatusChip({
  tone,
  label,
}: {
  tone: keyof typeof STATUS;
  label: string;
}) {
  const bg =
    tone === "good" ? "#f0fdf4" : tone === "warning" ? "#fefce8" : "#fef2f2";
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium"
      style={{ color: STATUS[tone], backgroundColor: bg }}
    >
      {label}
    </span>
  );
}
