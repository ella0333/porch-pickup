"use client";

import { useState } from "react";

export default function Gallery({ photoIds }: { photoIds: string[] }) {
  const [active, setActive] = useState(0);
  if (!photoIds.length) return <div className="card grid aspect-[4/3] place-items-center text-muted">No photos</div>;
  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-line bg-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/photos/${photoIds[active]}`} alt="" className="aspect-[4/3] w-full object-contain" />
      </div>
      {photoIds.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {photoIds.map((id, i) => (
            <button
              key={id}
              onClick={() => setActive(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === active ? "border-brand" : "border-transparent"}`}
              aria-label={`Photo ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/photos/${id}`} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
