"use client";

// "Insert pictures" — the bit of a game's design mode where a kid replaces the
// drawn scenery with their own photos and drawings, adds pieces of their own,
// and drags the whole thing into place.
//
// Three storage paths already existed for kid art and this reuses all three
// rather than inventing a fourth:
//   - the sky is a whole-field background   -> store.setGameBackground
//   - the runner is the profile's character -> store.addArtifact("runner")
//   - everything else is a scene piece      -> store.putScenePiece
// A slot declares which one it writes to, so the panel is one grid of tiles
// over three different destinations and the kid never has to know.

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionValue } from "framer-motion";
import { ImagePlus, Move, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resizeImageFile, shrinkDataUrl } from "@/lib/client-image";
import { store, useProfile, type ScenePiece } from "@/lib/store";

export type SceneSlot = {
  key: string;
  label: string;
  /** One line telling the kid what this picture stands in for. */
  hint: string;
  /** Where a freshly uploaded picture lands, as % of the scene box. */
  x: number;
  y: number;
  /** On-screen width at scale 1, in px. */
  width: number;
  /**
   * Where the picture is written. "scene" pieces are free sprites the kid can
   * drag. "background" and "runner" go to the pre-existing profile fields, and
   * "ground" is stored as a scene piece but painted by the game across a whole
   * band - none of those three have a position of their own to drag.
   */
  target: "scene" | "background" | "ground" | "runner";
  /**
   * A scene slot whose position the game controls (the horse gallops across on
   * a timeline, so only its artwork is the kid's to change). The game draws
   * these itself, exactly as it draws the ground and the runner, so they never
   * appear in the draggable layer.
   */
  anchored?: boolean;
};

/** Largest stored edge, per destination. Scene sprites render at ~150px, so
 *  300 is retina-generous; a dozen of them still has to fit the localStorage
 *  budget alongside everything else the profile holds. */
const SPRITE_MAX_EDGE = 300;
const BACKGROUND_MAX_EDGE = 1400;
/** The ground is a band stretched the full width of the field, so it needs
 *  more pixels than a sprite but nothing like a full backdrop. */
const GROUND_MAX_EDGE = 900;
/** A piece the kid adds themselves, with no slot to take a size from. */
export const ADDED_PIECE_WIDTH = 96;

export function pieceForSlot(pieces: ScenePiece[], slot: string): ScenePiece | undefined {
  return pieces.find((p) => p.slot === slot);
}

/**
 * The state a game's design mode needs, in one place. Two games now open the
 * same editor over two very different play fields — a runner's steppe and a
 * colour quiz — and only their slots differ, so the four pieces of state and
 * the bounds ref are worth sharing rather than re-declaring per page.
 */
export function useSceneDesign(slug: string) {
  const profile = useProfile();
  const [designing, setDesigning] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // The box a drag is measured against — every stored position is a percentage
  // of it, so the same arrangement holds from a phone to a projector.
  const sceneRef = useRef<HTMLDivElement>(null);
  const pieces = profile.scenePieces[slug] ?? [];

  const start = useCallback(() => setDesigning(true), []);
  // Leaving always drops the selection, so design mode never reopens with the
  // size slider pointed at a piece from the last visit.
  const stop = useCallback(() => {
    setSelectedId(null);
    setDesigning(false);
  }, []);

  return { designing, selectedId, setSelectedId, sceneRef, pieces, start, stop };
}

function widthForPiece(piece: ScenePiece, slots: SceneSlot[]): number {
  const slot = piece.slot ? slots.find((s) => s.key === piece.slot) : undefined;
  return (slot?.width ?? ADDED_PIECE_WIDTH) * piece.scale;
}

/**
 * The pictures themselves, painted over the game's own scenery. Rendered
 * during play (`editing` false, purely decorative) and during design mode
 * (`editing` true, draggable and selectable) from the same list, so what a kid
 * arranges is exactly what they then play in.
 */
export function ScenePieceLayer({
  slug,
  slots,
  pieces,
  editing = false,
  selectedId,
  onSelect,
  boundsRef,
}: {
  slug: string;
  slots: SceneSlot[];
  pieces: ScenePiece[];
  editing?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  boundsRef?: React.RefObject<HTMLDivElement | null>;
}) {
  // Slots the game paints itself (the sky, the ground, the runner, and any
  // anchored piece like the galloping horse) are not free sprites and never
  // appear here — drawing them would double them up with the game's own copy.
  const spriteSlots = new Set(
    slots.filter((s) => s.target === "scene" && !s.anchored).map((s) => s.key),
  );
  const sprites = pieces.filter((p) => p.slot === null || spriteSlots.has(p.slot));

  return (
    <>
      {sprites.map((piece) => {
        const slot = piece.slot ? slots.find((s) => s.key === piece.slot) : undefined;
        return (
          <ScenePieceView
            key={piece.id}
            slug={slug}
            piece={piece}
            width={widthForPiece(piece, slots)}
            label={slot?.label ?? "Your picture"}
            draggable={editing}
            editing={editing}
            selected={selectedId === piece.id}
            onSelect={onSelect}
            boundsRef={boundsRef}
          />
        );
      })}
    </>
  );
}

function ScenePieceView({
  slug,
  piece,
  width,
  label,
  draggable,
  editing,
  selected,
  onSelect,
  boundsRef,
}: {
  slug: string;
  piece: ScenePiece;
  width: number;
  label: string;
  draggable: boolean;
  editing: boolean;
  selected: boolean;
  onSelect?: (id: string) => void;
  boundsRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Framer leaves the drag transform on the element after a drag. The store
  // update below moves the piece via left/top instead, so the transform has to
  // go back to zero or the two offsets would stack.
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  // Zero the drag offset whenever the stored position changes, so the reset
  // lands in the same commit as the new left/top. Resetting only inside
  // onDragEnd writes the DOM before React re-renders, which paints one frame
  // at (old position + no offset) - a visible snap back to where the piece
  // started before it jumps to where it was dropped. onDragEnd still resets
  // too, for the drag that ends on the same spot it began and so never
  // changes the stored values.
  useEffect(() => {
    dragX.set(0);
    dragY.set(0);
  }, [piece.x, piece.y, dragX, dragY]);

  // Two elements, not one: the outer div owns the placement (left/top plus the
  // -50%/-50% that centres the piece on them) and the inner motion.div owns
  // only the drag offset. Tailwind v4 centres via the standalone `translate`
  // property and Framer writes `transform`, so the two would in fact compose
  // on a single element — but keeping placement out of the element Framer
  // rewrites every frame means a drag can never disturb where the piece is
  // anchored, and `ref` measures the dragged position directly.
  return (
    <div
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${piece.x}%`, top: `${piece.y}%`, width }}
    >
      <motion.div
        ref={ref}
        drag={draggable}
        dragMomentum={false}
        style={{ x: dragX, y: dragY }}
        onPointerDown={(event) => {
          if (!editing) return;
          // Selecting a piece must not also reach whatever clears the
          // selection behind it — a board that puts its own "tapped nothing"
          // handler on the container would otherwise deselect this piece in
          // the same gesture that picked it.
          event.stopPropagation();
          onSelect?.(piece.id);
        }}
        onDragEnd={() => {
          const box = boundsRef?.current?.getBoundingClientRect();
          const me = ref.current?.getBoundingClientRect();
          if (box && me) {
            store.moveScenePiece(
              slug,
              piece.id,
              ((me.left + me.width / 2 - box.left) / box.width) * 100,
              ((me.top + me.height / 2 - box.top) / box.height) * 100,
            );
          }
          // The store now holds the new left/top, so the drag offset has to go
          // back to zero or the piece would sit at the sum of the two.
          dragX.set(0);
          dragY.set(0);
        }}
        className={`${draggable ? "cursor-grab active:cursor-grabbing" : ""} ${
          editing ? "" : "pointer-events-none"
        } ${selected ? "rounded-lg outline outline-2 outline-offset-2 outline-gold" : ""}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={piece.src} alt={label} draggable={false} className="w-full select-none" />
      </motion.div>
    </div>
  );
}

/**
 * The tile grid: one tile per scene element plus one for adding a new piece.
 * Tapping a tile opens the file picker and the picture goes straight in — no
 * confirm step, because the kid can see the result behind the panel and undo
 * it with the tile's reset button.
 */
export function InsertPicturesPanel({
  slug,
  slots,
  pieces,
  background,
  runnerImage = null,
  copy,
  onArrange,
}: {
  slug: string;
  slots: SceneSlot[];
  pieces: ScenePiece[];
  background: string | null;
  /** Only a game with a "runner" slot has one of these. */
  runnerImage?: string | null;
  /** Overrides the line under the heading, for a game whose scene is not a
   *  steppe with things standing on it. */
  copy?: string;
  /** The way into drag-things-around mode. Omitted when the panel is already
   *  being shown *inside* design mode, where dragging is live anyway. */
  onArrange?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  // Which tile opened the picker, or "new" for the add-your-own tile.
  const pending = useRef<SceneSlot | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addedCount = pieces.filter((p) => p.slot === null).length;

  function previewFor(slot: SceneSlot): string | null {
    if (slot.target === "background") return background;
    if (slot.target === "runner") return runnerImage;
    return pieceForSlot(pieces, slot.key)?.src ?? null;
  }

  function open(target: SceneSlot | "new") {
    pending.current = target;
    fileRef.current?.click();
  }

  async function onFile(file: File | undefined) {
    const target = pending.current;
    pending.current = null;
    if (!file || !target) return;
    setBusy(true);
    setError(null);
    try {
      if (target === "new") {
        const src = await shrinkDataUrl(await resizeImageFile(file, SPRITE_MAX_EDGE), SPRITE_MAX_EDGE);
        // New pieces land in the middle of the sky, where nothing else is, so
        // one is never dropped underneath another and lost.
        store.putScenePiece(slug, { slot: null, src, x: 50, y: 38 });
      } else if (target.target === "background") {
        store.setGameBackground(slug, await resizeImageFile(file, BACKGROUND_MAX_EDGE));
      } else if (target.target === "runner") {
        store.addArtifact("runner", await shrinkDataUrl(await resizeImageFile(file, SPRITE_MAX_EDGE)));
      } else {
        // "scene" and "ground" both live in scenePieces; only who paints them
        // differs, so the write is the same either way.
        const edge = target.target === "ground" ? GROUND_MAX_EDGE : SPRITE_MAX_EDGE;
        const src = await shrinkDataUrl(await resizeImageFile(file, edge), edge);
        const existing = pieceForSlot(pieces, target.key);
        // Replacing a picture keeps wherever the kid had dragged it to.
        store.putScenePiece(slug, {
          slot: target.key,
          src,
          x: existing?.x ?? target.x,
          y: existing?.y ?? target.y,
          scale: existing?.scale ?? 1,
        });
      }
    } catch {
      setError("That image would not load. Try a PNG or JPEG.");
    } finally {
      setBusy(false);
    }
  }

  function reset(slot: SceneSlot) {
    if (slot.target === "background") store.clearGameBackground(slug);
    else if (slot.target === "runner") store.clearRunner();
    else {
      const existing = pieceForSlot(pieces, slot.key);
      if (existing) store.removeScenePiece(slug, existing.id);
    }
  }

  return (
    <div
      // Same reasoning as the design bar: every tile here is a control, so a
      // tap on one must not reach a scene that treats stray pointerdowns as
      // "you tapped nothing".
      onPointerDown={(event) => event.stopPropagation()}
      className="rounded-lg border border-steppe/10 p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black text-steppe">Insert pictures</p>
          <p className="mt-1 text-xs font-bold text-steppe/55">
            {copy ??
              "Tap a piece of the scene to swap in your own photo or drawing. Add extra pieces too, then drag everything where you want it."}
          </p>
        </div>
        {onArrange && (
          <Button variant="outline" size="sm" onClick={onArrange}>
            <Move size={14} /> Drag things around
          </Button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(event) => {
          void onFile(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />

      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {slots.map((slot) => {
          const preview = previewFor(slot);
          return (
            <div key={slot.key} className="relative">
              <button
                type="button"
                onClick={() => open(slot)}
                disabled={busy}
                title={slot.hint}
                className="flex w-full flex-col items-center gap-1 rounded-lg border-2 border-dashed border-steppe/25 bg-[#f4f8fb] p-2 text-steppe transition hover:border-steppe/50 disabled:opacity-50"
              >
                <span className="grid h-12 w-full place-items-center overflow-hidden rounded-md bg-white/70">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="" className="max-h-12 max-w-full object-contain" />
                  ) : (
                    <ImagePlus size={18} className="text-steppe/40" />
                  )}
                </span>
                <span className="text-[11px] font-black leading-tight">{slot.label}</span>
              </button>
              {preview && (
                <button
                  type="button"
                  onClick={() => reset(slot)}
                  title={`Put the drawn ${slot.label.toLowerCase()} back`}
                  aria-label={`Put the drawn ${slot.label.toLowerCase()} back`}
                  className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-white text-steppe shadow-sm ring-1 ring-steppe/15 hover:bg-[#fff3cf]"
                >
                  <RotateCcw size={12} />
                </button>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => open("new")}
          disabled={busy}
          className="flex flex-col items-center gap-1 rounded-lg border-2 border-dashed border-steppe/25 bg-[#fff8df] p-2 text-steppe transition hover:border-steppe/50 disabled:opacity-50"
        >
          <span className="grid h-12 w-full place-items-center rounded-md bg-white/70">
            <ImagePlus size={18} className="text-[#c99a1a]" />
          </span>
          <span className="text-[11px] font-black leading-tight">
            {addedCount > 0 ? `Add another (${addedCount})` : "Add your own"}
          </span>
        </button>
      </div>

      {busy && <p className="mt-2 text-xs font-bold text-steppe/50">Adding your picture…</p>}
      {error && <p role="alert" className="mt-2 text-xs font-bold text-[#b44736]">{error}</p>}
    </div>
  );
}

/**
 * Design mode's own controls, floated over the scene while the ready panel is
 * out of the way. Everything here acts on the selected piece; with nothing
 * selected it is just the way back out.
 */
export function SceneDesignBar({
  slug,
  slots,
  pieces,
  selectedId,
  onSelect,
  onDone,
}: {
  slug: string;
  slots: SceneSlot[];
  pieces: ScenePiece[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDone: () => void;
}) {
  // Only pieces the layer actually renders can be selected, so anything that
  // reaches here is draggable and resizable.
  const selected = pieces.find((p) => p.id === selectedId) ?? null;
  const selectedSlot = selected?.slot ? slots.find((s) => s.key === selected.slot) : undefined;

  return (
    <div
      // The bar is a control surface, not board background. A game whose scene
      // clears the selection on pointerdown (Kazakh Colours does — an overlay
      // would have covered its cards) would otherwise deselect on the way
      // *down* on Remove, unmounting the button before its click could land.
      onPointerDown={(event) => event.stopPropagation()}
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-40 flex flex-wrap items-center justify-between gap-2 bg-white/92 p-2.5 shadow-[0_-6px_18px_rgba(19,62,90,.12)] backdrop-blur"
    >
      <p className="px-1 text-xs font-black text-steppe">
        {selected
          ? `Dragging ${selectedSlot?.label ?? "your picture"}`
          : "Drag any picture. Tap one to resize it."}
      </p>

      <div className="flex items-center gap-2">
        {selected && (
          <label className="flex items-center gap-1.5 text-xs font-black text-steppe">
            Size
            <input
              type="range"
              min={0.25}
              max={4}
              step={0.05}
              value={selected.scale}
              onChange={(event) => store.scaleScenePiece(slug, selected.id, Number(event.target.value))}
              className="w-24 accent-[#c8513e]"
              aria-label="Picture size"
            />
          </label>
        )}
        {selected && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              store.removeScenePiece(slug, selected.id);
              onSelect(null);
            }}
          >
            <Trash2 size={14} /> Remove
          </Button>
        )}
        <Button variant="gold" size="sm" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}
