const MAP: Record<string, { bg: string; fg: string }> = {
  ELIGIBLE: { bg: "#E1EEE5", fg: "#1F7A4D" },
  PARTIALLY_ELIGIBLE: { bg: "#F1E9D6", fg: "#A67C1E" },
  NOT_ELIGIBLE: { bg: "#F3E2DE", fg: "#A8341F" },
  NEEDS_MANUAL_VERIFICATION: { bg: "#E4EAF1", fg: "#3D5A80" },
};

export default function StatusBadge({ status }: { status: string }) {
  const c = MAP[status] ?? { bg: "#EFEDE6", fg: "#7C879C" };
  return (
    <span
      className="text-[11.5px] font-medium px-2.5 py-1"
      style={{ background: c.bg, color: c.fg }}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
