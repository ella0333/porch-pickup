import Link from "next/link";
import { CONDITION_LABEL, money } from "@/lib/format";
import type { FeedItem } from "@/lib/listings";

export default function ListingCard({ item }: { item: FeedItem }) {
  return (
    <Link href={`/listings/${item.id}`} className="group block">
      <div className="aspect-square overflow-hidden rounded-xl border border-line bg-card">
        {item.photoId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/photos/${item.photoId}`}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted">No photo</div>
        )}
      </div>
      <div className="mt-2 px-0.5">
        <p className="font-semibold">{money(item.price)}</p>
        <p className="line-clamp-2 text-sm">{item.title}</p>
        <p className="mt-0.5 text-xs text-muted">
          {CONDITION_LABEL[item.condition]}
          {item.miles !== null && ` · ${item.miles} mi`}
        </p>
      </div>
    </Link>
  );
}
