interface TraitBadgeProps {
  category: string;
  value: string;
}

export default function TraitBadge({ category, value }: TraitBadgeProps) {
  if (!value || value === "None") return null;

  return (
    <span className="trait-badge inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.05em]">
      <span className="opacity-50 text-[10px]">{category}</span>
      <span>{value}</span>
    </span>
  );
}
