"use client";

import { useActionState, useRef, useState } from "react";
import { Loader2, Paperclip, Plus, Send, X } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { submitIdea, decideIdea, pushToLinear, type ActionResult } from "./actions";

const EMPTY: ActionResult = { ok: false };

const CATEGORY_LABELS: Record<string, string> = {
  feature: "✨ Feature",
  bug: "🐛 Bug",
  content: "📚 Content",
  ux: "🎨 UX/Design",
};

const DECISION_LABELS: Record<string, string> = {
  planned: "📋 Planned — we're doing this",
  building: "🔨 Building now",
  shipped: "✅ Shipped",
  "wont-do": "❌ Not doing this",
};

export function NewIdeaForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(submitIdea, EMPTY);

  if (!open) {
    return (
      <Button variant="gold" onClick={() => setOpen(true)}>
        <Plus size={16} /> Add idea
      </Button>
    );
  }

  // Confirm rather than auto-collapse: the idea is already in the list below,
  // and an explicit close beats a form that vanishes under the cursor.
  if (state.ok) {
    return (
      <div className="w-full rounded-2xl bg-white p-5 text-center shadow ring-1 ring-black/5">
        <p className="font-black text-steppe">Idea submitted.</p>
        <p className="mt-1 text-sm font-semibold text-wolf">
          It is in the list below with your vote on it. Someone has to answer it.
        </p>
        <div className="mt-3 flex justify-center gap-2">
          <Button variant="gold" size="sm" onClick={() => setOpen(true)}>
            Add another
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      action={action}
      className="w-full rounded-2xl bg-white p-5 shadow ring-1 ring-black/5"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="font-black text-steppe">New idea</span>
        <button type="button" onClick={() => setOpen(false)} className="text-wolf hover:text-steppe">
          <X size={18} />
        </button>
      </div>
      <div className="space-y-3">
        <input
          name="title"
          required
          placeholder="What should we build? *"
          className="w-full rounded-xl border-2 border-felt bg-warm px-3 py-2 font-black text-steppe outline-none focus:border-steppe"
        />
        <textarea
          name="description"
          rows={3}
          placeholder="How would it work? What made you think of it?"
          className="w-full resize-none rounded-xl border-2 border-felt bg-warm px-3 py-2 text-sm font-semibold outline-none focus:border-steppe"
        />
        <select
          name="category"
          defaultValue="feature"
          className="rounded-xl border-2 border-felt bg-warm px-3 py-2 text-sm font-bold outline-none focus:border-steppe"
        >
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        {state.error && <p className="text-sm font-bold text-terra">{state.error}</p>}
        <Button variant="gold" type="submit" disabled={pending} className="w-full">
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Submit idea
        </Button>
      </div>
    </form>
  );
}

export function DecisionForm({
  ideaId,
  currentStatus,
  currentNote,
  currentPreview,
}: {
  ideaId: string;
  currentStatus: string;
  currentNote: string | null;
  currentPreview: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(decideIdea, EMPTY);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-steppe px-3 py-1.5 text-xs font-black text-white transition hover:bg-steppe-700"
      >
        {currentStatus === "idea" ? "Respond" : "Change decision"}
      </button>
    );
  }

  return (
    <form action={action} className="mt-3 w-full rounded-xl bg-warm p-3">
      <input type="hidden" name="idea_id" value={ideaId} />
      <p className="mb-2 text-xs font-black uppercase tracking-wider text-wolf">
        The author sees this. Say why.
      </p>
      <select
        name="status"
        defaultValue={currentStatus === "idea" ? "planned" : currentStatus}
        className="mb-2 w-full rounded-lg border-2 border-felt bg-white px-3 py-2 text-sm font-bold outline-none focus:border-steppe"
      >
        {Object.entries(DECISION_LABELS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <textarea
        name="decision_note"
        rows={3}
        required
        defaultValue={currentNote ?? ""}
        placeholder="Why this call? If it's a no, what would change your mind?"
        className="mb-2 w-full resize-none rounded-lg border-2 border-felt bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-steppe"
      />
      <input
        name="preview_url"
        defaultValue={currentPreview ?? ""}
        placeholder="Draft link to try it (optional)"
        className="mb-2 w-full rounded-lg border-2 border-felt bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-steppe"
      />
      {state.error && <p className="mb-2 text-sm font-bold text-terra">{state.error}</p>}
      <div className="flex gap-2">
        <Button variant="primary" size="sm" type="submit" disabled={pending}>
          {pending ? <Loader2 size={14} className="animate-spin" /> : null} Save decision
        </Button>
        <Button variant="ghost" size="sm" type="button" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function PushToLinearButton({ ideaId }: { ideaId: string }) {
  const [state, action, pending] = useActionState(pushToLinear, EMPTY);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="idea_id" value={ideaId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border-2 border-steppe bg-white px-3 py-1.5 text-xs font-black text-steppe transition hover:bg-steppe/5 disabled:opacity-50"
      >
        {pending ? "Filing…" : "File in Linear"}
      </button>
      {state.error && <span className="ml-2 text-xs font-bold text-terra">{state.error}</span>}
    </form>
  );
}

/** Image attachment — uploads straight to storage, then records the row. */
export function ImageAttachment({ ideaId }: { ideaId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.currentTarget.value = "";
    if (!file) return;

    const sb = getSupabaseBrowser();
    if (!sb) {
      setError("Supabase is not configured.");
      return;
    }

    setBusy(true);
    setError(null);

    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      setError("Sign in again.");
      setBusy(false);
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${ideaId}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await sb.storage
      .from("idea-attachments")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (upErr) {
      setError(upErr.message);
      setBusy(false);
      return;
    }

    const { error: rowErr } = await sb.from("idea_attachments").insert({
      idea_id: ideaId,
      author_id: user.id,
      kind: "image",
      storage_path: path,
      title: file.name,
    });

    setBusy(false);
    if (rowErr) setError(rowErr.message);
    else window.location.reload();
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={upload}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className="inline-flex items-center gap-1 rounded-full bg-felt px-3 py-1.5 text-xs font-black text-wolf transition hover:bg-gold/20 hover:text-steppe-700 disabled:opacity-50"
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
        {busy ? "Uploading…" : "Attach image"}
      </button>
      {error && <span className="text-xs font-bold text-terra">{error}</span>}
    </>
  );
}
