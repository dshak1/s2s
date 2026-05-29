"use client";

import { motion } from "framer-motion";

// Stylized yurt whose pieces reveal independently as the kid masters letters.
// `mastered` is the count of mastered Kazakh letters (0–36+).
const PIECES: { id: string; need: number; label: string }[] = [
  { id: "ground", need: 0, label: "Ground" },
  { id: "door", need: 3, label: "Door (esik)" },
  { id: "kerege", need: 9, label: "Kerege lattice walls" },
  { id: "uyq", need: 18, label: "Uyq roof poles" },
  { id: "felt", need: 27, label: "Felt cover (tündik)" },
  { id: "shanyrak", need: 33, label: "Shanyrak crown" },
  { id: "fire", need: 36, label: "Fire pit" },
];

export function YurtSVG({ mastered, className }: { mastered: number; className?: string }) {
  const has = (id: string) => mastered >= (PIECES.find((p) => p.id === id)?.need ?? 99);
  const piece = (show: boolean, children: React.ReactNode) =>
    show ? (
      <motion.g initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        {children}
      </motion.g>
    ) : null;

  return (
    <svg viewBox="0 0 300 220" className={className} role="img" aria-label="yurt progress">
      {/* ground */}
      <ellipse cx="150" cy="200" rx="130" ry="14" fill="#E8DDC1" />

      {/* felt cover (dome + walls) */}
      {piece(has("felt"), (
        <>
          <path d="M40 150 Q150 -10 260 150 Z" fill="#FAF6E9" stroke="#A0826D" strokeWidth="3" />
          <rect x="40" y="150" width="220" height="48" fill="#FAF6E9" stroke="#A0826D" strokeWidth="3" />
        </>
      ))}

      {/* kerege lattice walls (shown if no felt yet, or as outline) */}
      {piece(has("kerege") && !has("felt"), (
        <g stroke="#A0826D" strokeWidth="2">
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={`a${i}`} x1={50 + i * 24} y1={150} x2={74 + i * 24} y2={198} />
          ))}
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={`b${i}`} x1={74 + i * 24} y1={150} x2={50 + i * 24} y2={198} />
          ))}
        </g>
      ))}

      {/* uyq roof poles (shown if no felt yet) */}
      {piece(has("uyq") && !has("felt"), (
        <g stroke="#A0826D" strokeWidth="2">
          {Array.from({ length: 7 }).map((_, i) => (
            <line key={i} x1={150} y1={70} x2={50 + i * 33} y2={150} />
          ))}
        </g>
      ))}

      {/* shanyrak crown */}
      {piece(has("shanyrak"), (
        <g>
          <ellipse cx="150" cy="62" rx="34" ry="12" fill="#FFD700" stroke="#1E4D8C" strokeWidth="3" />
          <line x1="120" y1="62" x2="180" y2="62" stroke="#1E4D8C" strokeWidth="2" />
          <line x1="135" y1="54" x2="165" y2="70" stroke="#1E4D8C" strokeWidth="2" />
          <line x1="165" y1="54" x2="135" y2="70" stroke="#1E4D8C" strokeWidth="2" />
        </g>
      ))}

      {/* door */}
      {piece(has("door"), (
        <rect x="132" y="158" width="36" height="40" rx="3" fill="#C8102E" stroke="#1E4D8C" strokeWidth="3" />
      ))}

      {/* fire pit */}
      {piece(has("fire"), (
        <g>
          <ellipse cx="150" cy="196" rx="14" ry="5" fill="#5B6770" />
          <path d="M150 196 q-6 -12 0 -20 q6 8 0 20" fill="#FFD700" />
        </g>
      ))}

      {/* empty-state hint */}
      {mastered < 3 && (
        <text x="150" y="120" textAnchor="middle" fontSize="13" fill="#5B6770" fontWeight="700">
          Master letters to build your yurt
        </text>
      )}
    </svg>
  );
}

export const YURT_TOTAL = 36;
