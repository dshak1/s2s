import { cn } from "@/lib/utils";

// Passes through the rest of the div's attributes so a card can carry an `id`
// for in-page anchors — /profile/[id] links to #experimental, which did not
// typecheck when the props were only className/children.
export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cn("rounded-3xl bg-felt shadow-sm border border-black/5 p-5", className)}>
      {children}
    </div>
  );
}

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold", className)}>
      {children}
    </span>
  );
}
