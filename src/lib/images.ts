import sharp from "sharp";

export const MAX_PHOTOS = 6;

// Normalizes an upload to a rotated, resized JPEG.
export async function toJpeg(input: Buffer, max = 1280) {
  return sharp(input).rotate().resize(max, max, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
}

export async function filesFrom(form: FormData, field = "photos") {
  const files = form.getAll(field).filter((f): f is File => typeof f === "object" && "arrayBuffer" in f && f.size > 0);
  if (files.some((f) => f.size > 15 * 1024 * 1024)) throw new Error("Each photo must be under 15 MB.");
  return Promise.all(files.slice(0, MAX_PHOTOS).map(async (f) => toJpeg(Buffer.from(await f.arrayBuffer()))));
}
