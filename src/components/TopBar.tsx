export default function TopBar({ title, subtitle }: { title: string; subtitle?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between px-9 pt-7 pb-5 border-b border-rule">
      <div>
        <div className="font-serif text-[26px] text-ink">{title}</div>
        {subtitle && <div className="text-[13.5px] text-inkFaint mt-1">{subtitle}</div>}
      </div>
    </div>
  );
}
