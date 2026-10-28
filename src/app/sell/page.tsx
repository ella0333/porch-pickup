import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import SellForm from "@/components/SellForm";
import { dateLabel, minuteLabel } from "@/lib/time";

export default async function SellPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/sell");
  if (!user.pickupSpot) redirect("/setup?next=/sell");
  const spot = user.pickupSpot;
  const upcoming = spot.dates.filter((d) => d >= new Date().toISOString().slice(0, 10));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Sell an item</h1>
      <p className="mt-1 text-muted">
        Add a few photos and we&apos;ll write the listing and suggest a fair price for you. You can change anything before
        posting.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-brand-soft px-4 py-3 text-sm text-brand-dark">
        <span>
          Pickup {minuteLabel(spot.startMinute)} to {minuteLabel(spot.endMinute % 1440)}
          {upcoming.length ? `, ${upcoming.length} days from ${dateLabel(upcoming[0])}` : ", no upcoming dates"}
        </span>
        <Link href="/setup?next=/sell" className="font-semibold underline">Change pickup setup</Link>
      </div>
      <SellForm />
    </div>
  );
}
