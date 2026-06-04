"use client";

import { useEffect, useRef, useState } from "react";
import { TopNav } from "@/components/top-nav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { store, useProfile } from "@/lib/store";
import { JOURNEY, normalizeCode } from "@/content/journey";
import { Upload } from "lucide-react";

// Single-password gate via env var (not a role system — see DECISIONS.md).
const PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "steppe";

export default function AdminContent() {
  const profile = useProfile();
  const [ok, setOk] = useState(false);
  const [pw, setPw] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [codes, setCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    setCodes(profile.weeklyCodes);
  }, [profile.weeklyCodes]);

  if (!ok) {
    return (
      <div className="min-h-dvh bg-warm font-admin">
        <TopNav />
        <main className="mx-auto max-w-sm px-4 py-10">
          <Card>
            <h1 className="text-lg font-black text-steppe">Facilitator content tools</h1>
            <p className="mt-1 text-sm text-wolf">Enter the workshop password.</p>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="mt-3 w-full rounded-2xl border-2 border-steppe/30 bg-white px-4 py-3 font-bold outline-none focus:border-steppe"
              placeholder="password"
            />
            <Button variant="gold" className="mt-3 w-full" onClick={() => setOk(pw === PASSWORD)}>
              Unlock
            </Button>
            {pw && pw !== PASSWORD && <p className="mt-2 text-sm text-terra">Wrong password.</p>}
          </Card>
        </main>
      </div>
    );
  }

  function uploadCanva(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    let done = 0;
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => {
        store.addArtifact("canva", String(reader.result));
        done++;
        if (done === files.length) setNote(`Imported ${files.length} Canva design(s) into the gallery.`);
      };
      reader.readAsDataURL(f);
    });
  }

  const canva = profile.artifacts.filter((a) => a.kind === "canva");

  function saveCodes() {
    JOURNEY.forEach((stop) => {
      store.setWeekCode(stop.id, codes[stop.id] ?? stop.defaultCode);
    });
    setNote("Weekly unlock codes saved.");
  }

  return (
    <div className="min-h-dvh bg-warm font-admin">
      <TopNav />
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-black text-steppe">Content tools</h1>
          <div className="flex gap-2">
            <a href="/admin/wishlist" className="rounded-full bg-gold px-4 py-2 text-sm font-black text-steppe-700">💡 Wishlist</a>
            <a href="/admin/feedback" className="rounded-full bg-steppe px-4 py-2 text-sm font-black text-warm">💬 Feedback</a>
          </div>
        </div>

        <Card>
          <h2 className="font-black text-steppe">Canva imports</h2>
          <p className="text-sm text-wolf">
            Upload the PNGs kids made in Canva. They appear in the kid&apos;s gallery,
            avatar picker, and Story Maker.
          </p>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={uploadCanva} />
          <Button variant="gold" className="mt-3" onClick={() => fileRef.current?.click()}>
            <Upload size={18} /> Upload PNGs
          </Button>
          {note && <p className="mt-2 text-sm font-bold text-steppe">{note}</p>}
          {canva.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {canva.map((a) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={a.id} src={a.dataUrl} alt="canva" className="h-16 w-16 rounded-xl object-cover" />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="font-black text-steppe">Silk Road weekly codes</h2>
          <p className="text-sm text-wolf">
            Kids unlock the next workshop stop by entering the code handed out in person.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {JOURNEY.map((stop) => (
              <label key={stop.id} className="rounded-2xl bg-white p-3">
                <span className="text-xs font-black uppercase tracking-wider text-wolf">
                  Week {stop.week} · {stop.name}
                </span>
                <input
                  value={codes[stop.id] ?? stop.defaultCode}
                  onChange={(event) => {
                    const value = normalizeCode(event.target.value);
                    setCodes((current) => ({ ...current, [stop.id]: value }));
                  }}
                  className="mt-1 w-full rounded-xl border-2 border-steppe/20 px-3 py-2 font-black uppercase tracking-widest text-steppe outline-none focus:border-steppe"
                />
              </label>
            ))}
          </div>
          <Button variant="gold" className="mt-3" onClick={saveCodes}>
            Save weekly codes
          </Button>
        </Card>

        <Card>
          <h2 className="font-black text-steppe">Elder video & word audio</h2>
          <p className="text-sm text-wolf">
            In production these upload to Supabase Storage and back the region clips and the
            per-word audio in the games. Here they&apos;re placeholder slots — wire to the
            <code className="mx-1 rounded bg-black/5 px-1">kid-art</code> bucket once Supabase is connected.
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" disabled><Upload size={18} /> Upload elder MP4</Button>
            <Button variant="outline" disabled><Upload size={18} /> Upload word audio</Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
