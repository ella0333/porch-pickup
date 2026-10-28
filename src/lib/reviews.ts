import { db } from "./db";

export async function ratingFor(userId: string) {
  const agg = await db.review.aggregate({ where: { targetId: userId }, _avg: { stars: true }, _count: true });
  return { avg: agg._avg.stars ?? null, count: agg._count };
}

export async function ratingsFor(userIds: string[]) {
  const rows = await db.review.groupBy({
    by: ["targetId"],
    where: { targetId: { in: userIds } },
    _avg: { stars: true },
    _count: true,
  });
  return new Map(rows.map((r) => [r.targetId, { avg: r._avg.stars ?? null, count: r._count }]));
}
