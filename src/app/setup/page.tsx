import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import SetupForm from "@/components/SetupForm";

export default async function SetupPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/setup");
  const spot = user.pickupSpot;
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Pickup setup</h1>
      <p className="mt-1 text-muted">
        Your address stays private until you confirm a sale, so buyers only see roughly how far away you are.
      </p>
      <SetupForm
        initial={{
          address: spot?.address ?? "",
          instructions: spot?.instructions ?? "",
          dates: spot?.dates ?? [],
          startMinute: spot?.startMinute ?? 540,
          endMinute: spot?.endMinute ?? 1260,
          timezone: spot?.timezone ?? "",
          payoutWallet: user.payoutWallet,
          payoutReceiver: user.payoutReceiver ?? user.email,
        }}
      />
    </div>
  );
}
