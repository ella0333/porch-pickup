export default function Stars({ value, count }: { value: number | null; count?: number }) {
  if (value === null || count === 0) return <span className="text-sm text-muted">No reviews yet</span>;
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className="inline-flex items-center gap-1 text-sm" aria-label={`${rounded} out of 5 stars`}>
      <span className="text-amber-500">{"★".repeat(Math.round(rounded))}{"☆".repeat(5 - Math.round(rounded))}</span>
      <span className="text-muted">
        {rounded.toFixed(1)}
        {count !== undefined && ` (${count})`}
      </span>
    </span>
  );
}
