type Tone = "teal" | "amber" | "rust" | "slate";

const STATUS_TONE: Record<string, Tone> = {
  ACTIVE: "teal",
  CONFIRMED: "teal",
  LEAD: "amber",
  DRAFT: "amber",
  INACTIVE: "slate",
  CANCELLED: "rust",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? "slate";
  return (
    <span className={`badge badge-${tone}`}>
      <span className="dot" />
      {status}
    </span>
  );
}
