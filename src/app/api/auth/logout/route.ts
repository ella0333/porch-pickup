import { endSession } from "@/lib/auth";
import { route } from "@/lib/api";

export const POST = route(async () => {
  await endSession();
});
