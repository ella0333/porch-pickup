import { HttpError, requireUser } from "@/lib/auth";
import { route } from "@/lib/api";
import { toJpeg } from "@/lib/images";
import * as orders from "@/lib/orders";

type Ctx = { params: Promise<{ id: string }> };

// One endpoint for every button on the order page. Contest is multipart for its optional photo.
export const POST = route(async (req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const isForm = (req.headers.get("content-type") || "").includes("multipart/form-data");
  const body: Record<string, any> = isForm ? Object.fromEntries((await req.formData()).entries()) : await req.json();
  const text = typeof body.text === "string" ? body.text.slice(0, 1000) : "";

  switch (body.action) {
    case "accept":
      return orders.sellerAccept(user, id, text);
    case "decline":
      return orders.sellerDecline(user, id);
    case "cancel":
      return orders.buyerCancel(user, id);
    case "gotit":
      return orders.gotIt(user, id);
    case "notthere":
      return orders.notThere(user, id, text);
    case "contest": {
      const file = body.photo as File | undefined;
      const photo =
        file && typeof file === "object" && file.size > 0 ? await toJpeg(Buffer.from(await file.arrayBuffer())) : undefined;
      return orders.contest(user, id, text, photo);
    }
    default:
      throw new HttpError(400, "Unknown action.");
  }
});
