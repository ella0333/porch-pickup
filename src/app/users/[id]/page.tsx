import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { ratingFor } from "@/lib/reviews";
import { feed } from "@/lib/listings";
import Stars from "@/components/Stars";
import ListingCard from "@/components/ListingCard";
import ReportButton from "@/components/ReportButton";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await db.user.findUnique({
    where: { id },
    select: { id: true, name: true, banned: true, createdAt: true },
  });
  if (!profile || profile.banned) notFound();
  const me = await currentUser();
  const [rating, reviews, completed, items] = await Promise.all([
    ratingFor(id),
    db.review.findMany({
      where: { targetId: id },
      include: { author: { select: { name: true } }, order: { select: { sellerId: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.order.count({ where: { OR: [{ sellerId: id }, { buyerId: id }], status: "COMPLETED" } }),
    feed(null, { sellerId: id }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-2xl font-bold text-brand-dark">
          {profile.name[0]?.toUpperCase()}
        </span>
        <div>
          <h1 className="text-2xl font-bold">{profile.name}</h1>
          <Stars value={rating.avg} count={rating.count} />
          <p className="text-sm text-muted">
            {completed} completed pickup{completed === 1 ? "" : "s"} · Joined{" "}
            {profile.createdAt.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </div>
        {me && me.id !== id && (
          <div className="ml-auto">
            <ReportButton userId={id} />
          </div>
        )}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold">Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-muted">No reviews yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {reviews.map((r) => (
              <div key={r.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <Stars value={r.stars} />
                  <span className="text-xs text-muted">
                    {r.order.sellerId === id ? "As seller" : "As buyer"} · from {r.author.name}
                  </span>
                </div>
                {r.text && <p className="mt-2 text-sm">{r.text}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {items.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">Listings</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => <ListingCard key={item.id} item={item} />)}
          </div>
        </section>
      )}
    </div>
  );
}
