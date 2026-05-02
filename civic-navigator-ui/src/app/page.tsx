"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import MapContainer from "@/components/MapContainer";
import ChatPanel from "@/components/ChatPanel";
import InsightCardComponent from "@/components/InsightCard";
import TimelineCard from "@/components/TimelineCard";
import { INSIGHT_CARDS, TIMELINE_EVENTS, NEXT_ELECTION } from "@/lib/mockData";
import type { PollingStation } from "@/types";
import { useLanguage } from "@/components/LanguageProvider";

export default function HomePage() {
  const [searchLocation, setSearchLocation] = useState("");
  const [selectedStation, setSelectedStation] =
    useState<PollingStation | null>(null);
  const { t } = useLanguage();

  const handleSearch = (query: string, location?: string) => {
    if (location) setSearchLocation(location);
    // ChatPanel handles query internally via QuickChips / direct search
    // If you want the search bar to send to chat, lift state or use context
  };

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "var(--bg-base)" }}>
      {/* ── Navbar ── */}
      <Navbar />

      {/* ── Hero + Search ── */}
      <div className="pt-16">
        <div
          className="relative overflow-hidden bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--bg-base)]"
        >
          {/* Background ambient */}
          <div
            aria-hidden="true"
            className="absolute inset-0 overflow-hidden pointer-events-none"
          >
            <div
              className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-20 blur-[80px]"
              style={{ background: "radial-gradient(circle,#4f7ef8,transparent)" }}
            />
            <div
              className="absolute top-4 right-1/4 w-64 h-64 rounded-full opacity-15 blur-[60px]"
              style={{ background: "radial-gradient(circle,#a78bfa,transparent)" }}
            />
          </div>

          <div className="relative max-w-screen-2xl mx-auto px-4 sm:px-6 py-10">
            {/* Hero text */}
            <div className="text-center mb-7">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#7ba3ff] bg-[#4f7ef8]/10 border border-[#4f7ef8]/20 px-3 py-1.5 rounded-full mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4f7ef8] animate-blink" />
                {t("chat.subtitle")}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#f0f4ff] leading-tight">
                {t("hero.title")}{" "}
                <span
                  className="gradient-text"
                >
                  {t("hero.subtitle")}
                </span>
              </h1>
              <p className="mt-2 text-sm text-[#8b99b8] max-w-xl mx-auto">
                {t("hero.desc")}
              </p>
            </div>

            {/* Sticky search bar */}
            <div className="max-w-3xl mx-auto">
              <SearchBar onSearch={handleSearch} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <main
        id="main-content"
        className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 pb-6"
      >
        {/* Two-column layout */}
        <div className="flex gap-4 mt-4 h-[calc(100dvh-340px)] min-h-[520px]">
          {/* Left: Map panel */}
          <div className="flex-1 min-w-0 overflow-y-auto pr-1">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-[#f0f4ff]">
                🗺️ {t("map.title")}
              </h2>
              <p className="text-xs text-[#8b99b8] mt-0.5">
                {searchLocation
                  ? `${t("map.showingResults")} ${searchLocation}`
                  : t("map.subtitle")}
              </p>
            </div>
            <MapContainer
              selectedStation={selectedStation}
              onStationSelect={setSelectedStation}
              className="h-[420px]"
            />
          </div>

          {/* Right: Chat panel */}
          <div className="w-[400px] xl:w-[440px] flex-shrink-0">
            <ChatPanel location={searchLocation} className="h-full" />
          </div>
        </div>

        {/* ── Bottom insight strip ── */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#f0f4ff]">
              📊 {t("insights.title")}
            </h2>
            <span className="text-xs text-[#4a5578]">
              {t("insights.updated")} {NEXT_ELECTION.name}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Timeline card (spans 2 cols on lg) */}
            <div className="col-span-2 sm:col-span-1 lg:col-span-2">
              <TimelineCard
                events={TIMELINE_EVENTS}
                electionName={NEXT_ELECTION.name}
                daysUntil={NEXT_ELECTION.daysUntil}
                className="h-full"
              />
            </div>

            {/* Insight cards */}
            {INSIGHT_CARDS.map((card, idx) => (
              <InsightCardComponent key={card.id} card={card} index={idx} />
            ))}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/6 px-4 sm:px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-[#4a5578]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-[#1e3a8a] to-[#4f7ef8] flex items-center justify-center">
              <span className="text-[9px]">🗳️</span>
            </div>
            <span className="font-medium text-[#8b99b8]">
              CivicNavigator AI
            </span>
            <span>·</span>
            <span>{t("footer.nonpartisan")}</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://vote.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#4f7ef8] transition-colors"
            >
              vote.gov
            </a>
            <a
              href="https://www.usa.gov/absentee-voting"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#4f7ef8] transition-colors"
            >
              Absentee Voting
            </a>
            <span>
              © {new Date().getFullYear()} CivicNavigator AI
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
