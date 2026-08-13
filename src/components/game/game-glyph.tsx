import { cn } from "@/lib/utils";

export function GameGlyph({
  slug,
  className,
  size = 56,
}: {
  slug: string;
  className?: string;
  size?: number;
}) {
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const fill = { fill: "currentColor", stroke: "none" };
  const soundGlyph = (
    <g>
      <path d="M20 42 H32 L48 28 V72 L32 58 H20 Z" {...stroke} />
      <path d="M58 38 Q68 50 58 62" {...stroke} />
      <path d="M68 28 Q86 50 68 72" {...stroke} />
    </g>
  );
  const art: Record<string, React.ReactNode> = {
    "sound-it-out": soundGlyph,
    "learn": soundGlyph,
    "sozdik-match": (
      <g>
        <rect x="10" y="32" width="32" height="28" rx="6" {...stroke} />
        <line x1="18" y1="42" x2="34" y2="42" {...stroke} />
        <line x1="18" y1="50" x2="30" y2="50" {...stroke} />
        <rect x="56" y="36" width="34" height="34" rx="6" {...stroke} />
        <circle cx="80" cy="48" r="4" {...stroke} />
        <path d="M58 68 L70 54 L78 62 L86 50" {...stroke} />
      </g>
    ),
    "memory-match": (
      <g>
        <rect x="12" y="26" width="30" height="46" rx="6" {...stroke} />
        <rect x="50" y="26" width="30" height="46" rx="6" {...stroke} />
        <circle cx="27" cy="49" r="8" {...stroke} />
        <circle cx="65" cy="49" r="8" {...stroke} />
      </g>
    ),
    "falling-sozder": (
      <g>
        <path d="M28 60 H72 L64 84 H36 Z" {...stroke} />
        <line x1="24" y1="60" x2="76" y2="60" {...stroke} />
        <circle cx="44" cy="20" r="4" {...fill} />
        <circle cx="58" cy="34" r="4" {...fill} />
        <circle cx="50" cy="48" r="4" {...fill} />
      </g>
    ),
    "where-kz": (
      <g>
        <path d="M50 20 C36 20 28 31 28 44 C28 60 50 80 50 80 C50 80 72 60 72 44 C72 31 64 20 50 20 Z" {...stroke} />
        <circle cx="50" cy="43" r="8" {...stroke} />
        <path d="M22 86 H78" strokeDasharray="2 8" {...stroke} />
      </g>
    ),
    bazaar: (
      <g>
        <path d="M50 18 L82 42 H18 Z" {...stroke} />
        <path d="M26 42 V74 H74 V42" {...stroke} />
        <path d="M42 74 V58 H58 V74" {...stroke} />
        <circle cx="35" cy="52" r="3.5" {...fill} />
        <circle cx="65" cy="52" r="3.5" {...fill} />
      </g>
    ),
    "snow-leopard": (
      <g>
        <ellipse cx="50" cy="64" rx="15" ry="12" {...fill} />
        <circle cx="30" cy="44" r="6.5" {...fill} />
        <circle cx="44" cy="34" r="6.5" {...fill} />
        <circle cx="58" cy="34" r="6.5" {...fill} />
        <circle cx="72" cy="44" r="6.5" {...fill} />
      </g>
    ),
    "steppe-sprint": (
      <g>
        <path d="M18 76 L38 26 H62 L82 76" {...stroke} />
        <path d="M50 26 V82" strokeDasharray="5 9" {...stroke} />
        <circle cx="50" cy="20" r="8" {...fill} />
        <path d="M40 52 H60" {...stroke} />
      </g>
    ),
    "say-and-shift": (
      <g>
        <rect x="38" y="14" width="24" height="38" rx="12" {...stroke} />
        <path d="M26 44 Q26 68 50 68 Q74 68 74 44" {...stroke} />
        <path d="M50 68 V82" {...stroke} />
        <path d="M34 82 H66" {...stroke} />
        <path d="M82 34 Q90 42 82 50" {...stroke} />
        <path d="M90 27 Q98 42 90 57" {...stroke} />
      </g>
    ),
    "jaryq-hunter": (
      <g>
        <rect x="42" y="64" width="18" height="20" rx="4" {...stroke} />
        <path d="M44 64 L28 30" {...stroke} />
        <path d="M58 64 L74 30" {...stroke} />
        <path d="M28 30 Q51 18 74 30" {...stroke} />
        <circle cx="51" cy="44" r="4" {...fill} />
      </g>
    ),
    "tanba-studio": (
      <g>
        <path d="M40 78 C18 78 16 46 40 44 C58 42 60 64 46 66 C38 67 36 56 44 54" {...stroke} />
        <line x1="60" y1="40" x2="80" y2="20" {...stroke} strokeWidth="8" />
        <circle cx="58" cy="42" r="3.5" {...fill} />
      </g>
    ),
    "story-maker": (
      <g>
        <rect x="16" y="22" width="68" height="56" rx="7" {...stroke} />
        <line x1="50" y1="22" x2="50" y2="78" {...stroke} />
        <line x1="16" y1="50" x2="84" y2="50" {...stroke} />
        <path d="M33 34 l3 6 6 1 -4.5 4 1 6 -5.5 -3 -5.5 3 1 -6 -4.5 -4 6 -1 z" {...fill} />
      </g>
    ),
  };

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      {art[slug] ?? art["sozdik-match"]}
    </svg>
  );
}
