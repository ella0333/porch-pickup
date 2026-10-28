import { db } from "@/lib/db";
import { HttpError, requireUser } from "@/lib/auth";
import { route } from "@/lib/api";
import { filesFrom, toJpeg } from "@/lib/images";
import { draftListing } from "@/lib/ai";
import { suggestPrice } from "@/lib/pricing";
import { allow } from "@/lib/ratelimit";

export const maxDuration = 60;

// Photos in, editable listing draft out: AI text and condition grade, then a market price.
export const POST = route(async (req: Request) => {
  const user = await requireUser();
  if (!allow(`draft:${user.id}`, 15, 60 * 60 * 1000)) {
    throw new HttpError(429, "That's a lot of listings in an hour. Fill this one in by hand or try again later.");
  }
  const photos = await filesFrom(await req.formData());
  if (!photos.length) throw new HttpError(400, "Add at least one photo.");

  const saved = await Promise.all(
    photos.map((data, position) => db.photo.create({ data: { data: new Uint8Array(data), position }, select: { id: true } })),
  );

  // Smaller copies for the model keep the call cheap; the first four photos are plenty.
  const small = await Promise.all(photos.slice(0, 4).map((p) => toJpeg(p, 768)));

  let draft;
  try {
    draft = await draftListing(small);
  } catch (err) {
    console.error(err);
    return { photoIds: saved.map((p) => p.id), draft: null, price: null, error: "The AI couldn't read these photos. Fill in the listing yourself." };
  }
  const price = await suggestPrice(draft, small[0]);
  return {
    photoIds: saved.map((p) => p.id),
    draft,
    price: { cents: price.cents, reason: price.reason },
  };
});
