// Dashboard primitives. Server-renderable — no client JS — with CSS-only hover
// tooltips, which is all an internal dashboard at this data volume needs.
//
// Palette: a single-hue sequential ramp ending on the app's steppe blue,
// validated against a white card surface (monotone lightness, adjacent ΔL ≥ 0.06,
// light end 2.21:1 contrast, hue spread 7°). Status colors are the reserved
// good/warning/critical steps and always ship with a label, never color alone.

export const RAMP = ["#8fb2d7", "#5f8bbd", "#3c669f", "#1e4d8c"] as const;
export const INK = RAMP[3];

export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  critical: "#d03b3b",
} as const;

export function Card({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl bg-white p-5 shadow ring-1 ring-black/5 ${className}`}>
      <header className="mb-4">
        <h2 className="text-sm font-black uppercase tracking-[0.14em] text-steppe">{title}</h2>
        {subtitle && <p className="mt-1 text-xs font-semibold text-wolf">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

export function StatTile({
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
  const color =
    tone === "neutral" ? undefined : STATUS[tone as keyof typeof STATUS];
  return (
    <div className="rounded-2xl bg-white p-4 shadow ring-1 ring-black/5">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-wolf">{label}</p>
      <p className="mt-1 text-3xl font-black tabular-nums text-steppe" style={color ? { color } : undefined}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs font-semibold text-wolf/70">{hint}</p>}
    </div>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl bg-warm px-4 py-6 text-center text-sm font-bold text-wolf">
      {children}
    </p>
  );
}

/** Horizontal bars, one series, sequential fill. Values direct-labeled. */
export function BarRows({
  rows,
  formatValue = (n: number) => String(n),
}: {
  rows: Array<{ label: string; value: number; sub?: string; tooltip?: string }>;
  formatValue?: (n: number) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((row) => {
        const pct = (row.value / max) * 100;
        return (
          <li key={row.label} className="group relative">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-bold text-steppe">{row.label}</span>
              <span className="shrink-0 text-sm font-black tabular-nums text-steppe">
                {formatValue(row.value)}
              </span>
            </div>
            <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-felt/60">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: INK }}
              />
            </div>
            {row.sub && <p className="mt-0.5 text-xs font-semibold text-wolf/70">{row.sub}</p>}
            {row.tooltip && (
              <span className="pointer-events-none absolute -top-1 left-0 z-10 hidden -translate-y-full rounded-lg bg-steppe px-2.5 py-1.5 text-xs font-bold text-white shadow-lg group-hover:block">
                {row.tooltip}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Columns over time, one series. Bars are 4px-rounded at the data end only. */
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
      <div className="flex h-40 items-end gap-2">
        {points.map((p) => (
          <div key={p.label} className="group relative flex flex-1 flex-col items-center justify-end">
            <span className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-lg bg-steppe px-2.5 py-1.5 text-xs font-bold text-white shadow-lg group-hover:block">
              {p.tooltip}
            </span>
            <div
              className="w-full rounded-t"
              style={{
                height: `${Math.max((p.value / max) * 100, 2)}%`,
                backgroundColor: INK,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {points.map((p) => (
          <span
            key={p.label}
            className="flex-1 truncate text-center text-[10px] font-bold text-wolf"
          >
            {p.label}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs font-semibold text-wolf/70">{valueLabel}</p>
    </div>
  );
}

/** A single ratio against its limit — same-ramp track, never a two-slice pie. */
export function Meter({
  label,
  value,
  total,
  hint,
}: {
  label: string;
  value: number;
  total: number;
  hint?: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold text-steppe">{label}</span>
        <span className="text-sm font-black tabular-nums text-steppe">
          {value}/{total}
          <span className="ml-1.5 text-xs font-bold text-wolf">{pct}%</span>
        </span>
      </div>
      <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-felt/60">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: RAMP[1] }} />
      </div>
      {hint && <p className="mt-0.5 text-xs font-semibold text-wolf/70">{hint}</p>}
    </div>
  );
}

/** Status chip — icon + word + color, so meaning never rides on hue alone. */
export function StatusChip({ tone, label }: { tone: keyof typeof STATUS; label: string }) {
  const glyph = tone === "good" ? "●" : tone === "warning" ? "▲" : "■";
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-warm px-2 py-0.5 text-[11px] font-black"
      style={{ color: STATUS[tone] }}
    >
      <span aria-hidden>{glyph}</span>
      {label}
    </span>
  );
}
