"use client";

import { useMemo, useRef, useState } from "react";
import { api } from "@/lib/client";
import { CATEGORIES, CONDITION_LABEL, money } from "@/lib/format";

type Draft = {
  title: string;
  description: string;
  category: string;
  condition: keyof typeof CONDITION_LABEL;
  flaws: string[];
};

type DraftResponse = {
  photoIds: string[];
  draft: Draft | null;
  price: { cents: number | null; reason: string } | null;
  error?: string;
};

export default function SellForm() {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [stage, setStage] = useState<"pick" | "thinking" | "edit">("pick");
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const [condition, setCondition] = useState<Draft["condition"]>("GOOD");
  const [flaws, setFlaws] = useState("");
  const [price, setPrice] = useState("");
  const [suggested, setSuggested] = useState<{ cents: number | null; reason: string } | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((cur) => [...cur, ...Array.from(list)].slice(0, 6));
  }

  async function analyze() {
    setStage("thinking");
    setError("");
    const form = new FormData();
    files.forEach((f) => form.append("photos", f));
    try {
      const res = await api<DraftResponse>("/api/listings/draft", form);
      setPhotoIds(res.photoIds);
      if (res.draft) {
        setTitle(res.draft.title);
        setDescription(res.draft.description);
        setCategory(res.draft.category);
        setCondition(res.draft.condition);
        setFlaws(res.draft.flaws.join(", "));
      }
      if (res.price) {
        setSuggested(res.price);
        if (res.price.cents) setPrice(String(res.price.cents / 100));
      }
      setNotice(res.error || "");
      setStage("edit");
    } catch (err) {
      setError((err as Error).message);
      setStage("pick");
    }
  }

  async function post(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { id } = await api<{ id: string }>("/api/listings", {
        photoIds,
        title,
        description,
        category,
        condition,
        conditionNotes: flaws.split(",").map((s) => s.trim()).filter(Boolean),
        priceCents: Math.round(Number(price) * 100),
        suggestedPrice: suggested?.cents ?? null,
        priceReason: suggested?.reason ?? null,
      });
      window.location.href = `/listings/${id}`;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);

  if (stage !== "edit") {
    return (
      <div className="mt-6 space-y-4">
        <div
          className="card grid min-h-48 cursor-pointer place-items-center border-dashed p-6 text-center"
          onClick={() => input.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
        >
          <div>
            <p className="font-semibold">Add up to 6 photos</p>
            <p className="mt-1 text-sm text-muted">Show the whole item, any labels, and any damage up close.</p>
          </div>
          <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
        </div>
        {files.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {previews.map((src, i) => (
              <div key={src} className="relative aspect-square overflow-hidden rounded-lg border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-1 top-1 rounded bg-white/90 px-1.5 text-xs"
                  onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))}
                  aria-label="Remove photo"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        {error && <p className="text-sm text-bad">{error}</p>}
        <button className="btn-primary" disabled={!files.length || stage === "thinking"} onClick={analyze}>
          {stage === "thinking" ? "Reading your photos..." : "Write my listing"}
        </button>
        {stage === "thinking" && (
          <p className="text-sm text-muted">Writing the description, grading the condition and checking prices.</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={post} className="mt-6 grid gap-6 md:grid-cols-[1fr_280px]">
      <div className="card space-y-4 p-5">
        {notice && <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">{notice}</p>}
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input className="field" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={90} />
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea className="field min-h-28" id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="category">Category</label>
            <select className="field" id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="condition">Condition</label>
            <select className="field" id="condition" value={condition} onChange={(e) => setCondition(e.target.value as Draft["condition"])}>
              {Object.entries(CONDITION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="flaws">Visible wear or flaws</label>
          <input className="field" id="flaws" value={flaws} onChange={(e) => setFlaws(e.target.value)} placeholder="Separate with commas" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="card p-5">
          <label className="label" htmlFor="price">Price</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-2 text-sm text-muted">$</span>
            <input className="field pl-7" id="price" type="number" min="1" step="1" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </div>
          {suggested?.cents ? (
            <div className="mt-3 rounded-lg bg-brand-soft p-3 text-sm text-brand-dark">
              <p className="font-semibold">Suggested {money(suggested.cents)}</p>
              <p className="mt-1">{suggested.reason}</p>
            </div>
          ) : suggested ? (
            <p className="mt-3 text-sm text-muted">{suggested.reason}</p>
          ) : null}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {previews.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" className="aspect-square rounded-lg border border-line object-cover" />
          ))}
        </div>
        {error && <p className="text-sm text-bad">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>Post listing</button>
      </div>
    </form>
  );
}
