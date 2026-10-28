export function money(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
}

export const CONDITION_LABEL: Record<string, string> = {
  NEW: "New",
  LIKE_NEW: "Like new",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
};

export const CATEGORIES = [
  "Furniture",
  "Home & Kitchen",
  "Electronics",
  "Clothing & Shoes",
  "Baby & Kids",
  "Toys & Games",
  "Sports & Outdoors",
  "Tools & Garden",
  "Books & Media",
  "Other",
];

export const STATUS_LABEL: Record<string, string> = {
  AWAITING_PAYMENT: "Waiting for payment",
  AWAITING_SELLER: "Waiting for the seller to confirm",
  CONFIRMED: "Confirmed and ready for pickup",
  COMPLETED: "Picked up",
  DECLINED: "Declined by the seller",
  EXPIRED: "Expired, the seller did not confirm",
  REPORTED_MISSING: "Reported missing",
  REFUNDED: "Cancelled, buyer not charged",
  DISPUTED: "Being looked into",
  CANCELLED: "Cancelled",
};
