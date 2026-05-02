"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { InsightCard } from "@/types";
import { useLanguage } from "@/components/LanguageProvider";

interface InsightCardProps {
  card: InsightCard;
  index?: number;
}

export default function InsightCardComponent({
  card,
  index = 0,
}: InsightCardProps) {
  const [hovered, setHovered] = useState(false);
  const { t } = useLanguage();

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "glass rounded-2xl p-4 flex flex-col gap-2.5 cursor-default",
        "border border-[var(--border-subtle)] transition-all duration-250",
        "animate-slide-up",
        hovered
          ? "border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)] -translate-y-1"
          : "shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-transform duration-200"
        style={{
          background: `${card.color}15`,
          border: `1px solid ${card.color}30`,
          transform: hovered ? "scale(1.08) rotate(-2deg)" : "scale(1)",
        }}
      >
        {card.icon}
      </div>

      {/* Text */}
      <div>
        <h3
          className="text-sm font-semibold leading-tight"
          style={{ color: card.color }}
        >
          {t(card.title)}
        </h3>
        <p className="text-xs text-[#8b99b8] mt-1 leading-relaxed">
          {t(card.description)}
        </p>
      </div>

      {/* Type badge */}
      <span
        className="self-start text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border"
        style={{
          background: `${card.color}10`,
          borderColor: `${card.color}25`,
          color: card.color,
        }}
      >
        {card.type}
      </span>
    </div>
  );
}
