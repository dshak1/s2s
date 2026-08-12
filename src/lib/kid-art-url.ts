// Public URL for anything in the kid-art bucket. Pure string-building, no
// browser API and no client-only dependency — kept in its own file
// (deliberately no "use client") so both client pages (game screens,
// character-gallery.ts) and server components (admin/characters) can call it
// directly. It used to live in supabase/sync.ts, which is "use client" for
// its other exports; a server component importing it from there compiled
// fine but threw at runtime — RSC doesn't allow calling a client-module
// export as a plain function from server code.
export function kidArtUrl(storagePath: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/kid-art/${storagePath}`;
}
