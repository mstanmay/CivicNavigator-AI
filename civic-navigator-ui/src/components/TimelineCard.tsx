"use client";

import { cn } from "@/lib/utils";
import type { TimelineEvent } from "@/types";
import { CheckCircle2, Clock, Circle } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

interface TimelineCardProps {
  events: TimelineEvent[];
  electionName: string;
  daysUntil: number;
  className?: string;
}

const STATUS_STYLES = {
  completed: {
    dot: "bg-[#10d06e] border-[#10d06e]",
    label: "text-[#10d06e]",
    Icon: CheckCircle2,
    line: "bg-[#10d06e]/50",
  },
  current: {
    dot: "bg-[#4f7ef8] border-[#4f7ef8] animate-pulse-glow",
    label: "text-[#4f7ef8] font-semibold",
    Icon: Clock,
    line: "bg-[#4f7ef8]/30",
  },
  upcoming: {
    dot: "bg-transparent border-white/20",
    label: "text-[#8b99b8]",
    Icon: Circle,
    line: "bg-white/10",
  },
};

export default function TimelineCard({
  events,
  electionName,
  daysUntil,
  className,
}: TimelineCardProps) {
  const { t } = useLanguage();

  return (
    <div className={cn("glass rounded-2xl p-4", className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)] leading-tight">
            🗓️ {electionName}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t("timeline.deadlines")}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-[#4f7ef8] leading-none">
            {daysUntil}
          </p>
          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{t("timeline.daysLeft")}</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {events.map((event, i) => {
          const styles = STATUS_STYLES[event.status];
          const isLast = i === events.length - 1;

          return (
            <div key={event.id} className="flex gap-3 relative">
              {/* Dot + line */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-3 h-3 rounded-full border-2 flex-shrink-0 z-10 mt-0.5",
                    styles.dot
                  )}
                />
                {!isLast && (
                  <div className={cn("w-0.5 flex-1 min-h-4 mt-1", styles.line)} />
                )}
              </div>

              {/* Content */}
              <div className={cn("pb-3", isLast ? "pb-0" : "")}>
                <p
                  className={cn(
                    "text-xs leading-tight",
                    styles.label
                  )}
                >
                  {t(event.label)}
                  {event.status === "current" && (
                    <span className="ml-2 text-[9px] bg-[#4f7ef8]/15 border border-[#4f7ef8]/25 text-[#4f7ef8] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                      {t("timeline.now")}
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-[#4a5578] mt-0.5">
                  {event.date}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
