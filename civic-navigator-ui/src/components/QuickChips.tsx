"use client";

import { cn } from "@/lib/utils";
import type { QuickChip } from "@/types";
import { useLanguage } from "@/components/LanguageProvider";

interface QuickChipsProps {
  chips: QuickChip[];
  onSelect: (query: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function QuickChips({
  chips,
  onSelect,
  disabled,
  className,
}: QuickChipsProps) {
  const { t } = useLanguage();

  return (
    <div
      className={cn("flex flex-wrap gap-2", className)}
      role="group"
      aria-label="Quick action buttons"
    >
      {chips.map((chip) => (
        <button
          key={chip.id}
          onClick={() => onSelect(chip.query)}
          disabled={disabled}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200",
            "bg-[#4f7ef8]/8 border-[#4f7ef8]/20 text-[#7ba3ff]",
            "hover:bg-[#4f7ef8]/18 hover:border-[#4f7ef8]/45 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(79,126,248,0.15)]",
            "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
          )}
          aria-label={`Quick action: ${t(chip.label)}`}
        >
          <span>{chip.icon}</span>
          {t(chip.label)}
        </button>
      ))}
    </div>
  );
}
