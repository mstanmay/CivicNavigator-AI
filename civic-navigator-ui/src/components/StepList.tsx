"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

interface StepListProps {
  steps: string[];
  className?: string;
}

export default function StepList({ steps, className }: StepListProps) {
  const { t } = useLanguage();
  return (
    <div
      className={cn(
        "bg-[#4f7ef8]/6 border border-[#4f7ef8]/15 rounded-xl p-3",
        className
      )}
    >
      <p className="text-xs font-semibold text-[#7ba3ff] mb-2.5 flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {t("chat.stepByStep") || "Step-by-Step"}
      </p>
      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li
            key={i}
            className="flex items-start gap-3 text-xs text-[#8b99b8] leading-relaxed animate-slide-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#4f7ef8] text-white text-[9px] font-bold flex items-center justify-center shadow-[0_2px_8px_rgba(79,126,248,0.3)] mt-0.5">
              {i + 1}
            </span>
            <span className="flex-1 pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
