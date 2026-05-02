"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { PollingStation } from "@/types";
import { MOCK_POLLING_STATIONS } from "@/lib/mockData";
import { MapPin, Navigation, ExternalLink, X, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";

interface MapContainerProps {
  center?: { lat: number; lng: number };
  selectedStation?: PollingStation | null;
  onStationSelect?: (station: PollingStation | null) => void;
  className?: string;
}

// SVG marker factory
function createMarkerSVG(num: number, color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
    <filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.4"/></filter>
    <path d="M18 0C10.3 0 4 6.3 4 14c0 10.5 14 30 14 30S32 24.5 32 14C32 6.3 25.7 0 18 0z" fill="${color}" filter="url(#shadow)"/>
    <circle cx="18" cy="14" r="9" fill="white"/>
    <text x="18" y="18.5" text-anchor="middle" font-size="10" font-weight="700" fill="${color}" font-family="Arial">${num}</text>
  </svg>`;
}

const TYPE_COLORS: Record<string, string> = {
  polling: "#4f7ef8",
  earlyVoting: "#10d06e",
  dropbox: "#f5a623",
  registrar: "#a78bfa",
};

const getLocalizedTypeLabels = (t: (key: string) => string): Record<string, string> => ({
  polling: `🗳️ ${t("map.typePolling")}`,
  earlyVoting: `📅 ${t("map.typeEarly")}`,
  dropbox: `📦 ${t("map.typeDropbox")}`,
  registrar: `🏛️ ${t("map.typeOffice")}`,
});

export default function MapContainer({
  center,
  selectedStation,
  onStationSelect,
  className,
}: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [activeStation, setActiveStation] = useState<PollingStation | null>(
    selectedStation ?? null
  );
  const { t } = useLanguage();

  const defaultCenter = center ?? { lat: 38.9, lng: -77.03 };

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google) return;

    const map = new google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 13,
      disableDefaultUI: true,
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_CENTER,
      },
      gestureHandling: "greedy",
      styles: darkMapStyle,
    });

    mapInstance.current = map;

    // Plot mock stations
    MOCK_POLLING_STATIONS.forEach((station, idx) => {
      const color = TYPE_COLORS[station.type] ?? "#4f7ef8";
      const svgContent = encodeURIComponent(createMarkerSVG(idx + 1, color));
      const marker = new google.maps.Marker({
        position: { lat: station.lat, lng: station.lng },
        map,
        title: station.name,
        animation: google.maps.Animation.DROP,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${svgContent}`,
          scaledSize: new google.maps.Size(36, 44),
          anchor: new google.maps.Point(18, 44),
        },
      });

      marker.addListener("click", () => {
        setActiveStation(station);
        onStationSelect?.(station);
        map.panTo({ lat: station.lat, lng: station.lng });
      });

      markersRef.current.push(marker);
    });

    setMapLoaded(true);
  }, [defaultCenter, onStationSelect]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!apiKey) {
      setMapLoaded(true); // show placeholder
      return;
    }

    if (window.google?.maps) {
      initMap();
      return;
    }

    const scriptId = "gmaps-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.onload = initMap;
      document.head.appendChild(script);
    }
  }, [initMap]);

  const hasMapsKey = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  return (
    <div className={cn("relative w-full h-full flex flex-col", className)}>
      {/* Map surface */}
      <div className="relative flex-1 rounded-2xl overflow-hidden border border-white/8">
        {/* Actual Google Map div */}
        <div ref={mapRef} className="w-full h-full" />

        {/* Placeholder when no API key */}
        {!hasMapsKey && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d1b2e]">
            {/* Decorative grid */}
            <svg
              className="absolute inset-0 w-full h-full opacity-20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern
                  id="grid"
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="#4f7ef8"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Mock polling station dots */}
            {MOCK_POLLING_STATIONS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => {
                  setActiveStation(s);
                  onStationSelect?.(s);
                }}
                className={cn(
                  "absolute flex items-center justify-center w-10 h-10 rounded-full text-white font-bold text-sm shadow-lg transition-all duration-200 hover:scale-110 cursor-pointer animate-fade-in",
                  activeStation?.id === s.id ? "scale-125 ring-2 ring-white" : ""
                )}
                style={{
                  background: TYPE_COLORS[s.type],
                  top: `${20 + i * 15}%`,
                  left: `${15 + i * 18}%`,
                  animationDelay: `${i * 80}ms`,
                }}
                aria-label={`Select ${s.name}`}
              >
                {i + 1}
              </button>
            ))}

            {/* Center icon */}
            <div className="relative z-10 flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#1e3a8a]/60 border border-[#4f7ef8]/30 flex items-center justify-center animate-pulse-glow">
                <MapPin className="w-8 h-8 text-[#4f7ef8]" />
              </div>
              <p className="text-sm text-[#8b99b8] max-w-xs leading-relaxed">
                <span className="text-white font-semibold block mb-1">
                  {t("map.previewTitle")}
                </span>
                {t("map.previewDesc1")}{" "}
                <code className="text-[#4f7ef8] bg-[#4f7ef8]/10 px-1.5 py-0.5 rounded text-xs">
                  NEXT_PUBLIC_GOOGLE_MAPS_KEY
                </code>{" "}
                {t("map.previewDesc2")}
              </p>
            </div>
          </div>
        )}

        {/* Map overlay buttons */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          <button
            onClick={() => {
              if (mapInstance.current) {
                mapInstance.current.setCenter(defaultCenter);
                mapInstance.current.setZoom(13);
              }
            }}
            className="glass-strong px-3 py-2 rounded-xl text-xs font-semibold text-[#f0f4ff] flex items-center gap-2 hover:border-[#4f7ef8]/50 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            title={t("map.resetView")}
          >
            <Navigation className="w-3.5 h-3.5 text-[#4f7ef8]" />
            {t("map.resetView")}
          </button>

          <button
            onClick={() => setShowLegend((v) => !v)}
            className="glass-strong px-3 py-2 rounded-xl text-xs font-semibold text-[#f0f4ff] flex items-center gap-2 hover:border-[#4f7ef8]/50 transition-all duration-200 hover:-translate-y-0.5"
          >
            <Layers className="w-3.5 h-3.5 text-[#a78bfa]" />
            {t("map.legend")}
          </button>
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="absolute top-3 left-28 glass-strong rounded-xl p-3 z-10 animate-slide-up min-w-44 border border-[var(--border-subtle)]">
            <p className="text-xs font-semibold text-[var(--text-primary)] mb-2">
              {t("map.legend")}
            </p>
            {Object.entries(getLocalizedTypeLabels(t)).map(([type, label]) => (
              <div key={type} className="flex items-center gap-2 mb-1.5">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: TYPE_COLORS[type] }}
                />
                <span className="text-xs text-[#8b99b8]">{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Station count badge */}
        <div className="absolute top-3 right-3 glass-strong px-3 py-1.5 rounded-full text-xs font-semibold text-[#10d06e] flex items-center gap-1.5 z-10">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10d06e] animate-blink" />
          {MOCK_POLLING_STATIONS.length} {t("map.locationsFound")}
        </div>
      </div>

      {/* Station list below map */}
      <div className="mt-3 grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
        {MOCK_POLLING_STATIONS.map((station, idx) => (
          <button
            key={station.id}
            onClick={() => {
              setActiveStation(station);
              onStationSelect?.(station);
            }}
            className={cn(
              "text-left p-3 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 group",
              activeStation?.id === station.id
                ? "bg-[#4f7ef8]/15 border-[#4f7ef8]/40 shadow-[0_0_16px_rgba(79,126,248,0.2)]"
                : "glass border-white/8 hover:border-white/20 hover:bg-white/5"
            )}
          >
            <div className="flex items-start gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                style={{ background: TYPE_COLORS[station.type] }}
              >
                {idx + 1}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#f0f4ff] leading-tight truncate">
                  {station.name}
                </p>
                <p className="text-[10px] text-[#8b99b8] mt-0.5 truncate">
                  {station.distance} · {station.duration}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <div
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      station.isOpen ? "bg-[#10d06e]" : "bg-[#ff4757]"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-medium",
                      station.isOpen ? "text-[#10d06e]" : "text-[#ff4757]"
                    )}
                  >
                    {station.isOpen ? t("map.open") : t("map.closed")}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Selected station card */}
      {activeStation && (
        <div className="mt-3 glass rounded-2xl p-4 border-[#4f7ef8]/25 border animate-slide-up relative">
          <button
            onClick={() => {
              setActiveStation(null);
              onStationSelect?.(null);
            }}
            className="absolute top-3 right-3 w-6 h-6 rounded-lg bg-white/8 hover:bg-white/15 flex items-center justify-center transition-colors"
            aria-label="Close station card"
          >
            <X className="w-3.5 h-3.5 text-[#8b99b8]" />
          </button>

          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{ background: TYPE_COLORS[activeStation.type] }}
            >
              {MOCK_POLLING_STATIONS.indexOf(activeStation) + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#f0f4ff] text-sm leading-tight">
                {activeStation.name}
              </p>
              <p className="text-xs text-[#8b99b8] mt-0.5 leading-relaxed">
                {activeStation.address}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#1a2234] border border-white/8 text-[#8b99b8]">
                  📏 {activeStation.distance}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#1a2234] border border-white/8 text-[#8b99b8]">
                  🕒 {activeStation.duration}
                </span>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full border font-medium",
                    activeStation.isOpen
                      ? "bg-[#10d06e]/10 border-[#10d06e]/25 text-[#10d06e]"
                      : "bg-[#ff4757]/10 border-[#ff4757]/25 text-[#ff4757]"
                  )}
                >
                  {activeStation.isOpen ? `✅ ${t("map.open")}` : `🔴 ${t("map.closed")}`}
                </span>
              </div>
            </div>
          </div>

          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${activeStation.lat},${activeStation.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-[#1e3a8a] to-[#4f7ef8] text-white text-sm font-semibold hover:opacity-90 transition-all duration-200 hover:-translate-y-0.5 shadow-[0_4px_16px_rgba(79,126,248,0.4)]"
          >
            <ExternalLink className="w-4 h-4" />
            {t("map.getDirections")}
          </a>
        </div>
      )}
    </div>
  );
}

// ── Dark map style ──────────────────────────────────────────────────────────
const darkMapStyle: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0d1b2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0d1b2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b7fa3" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a2744" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#1e3a8a" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#4f7ef8" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a1628" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3a5278" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#111f38" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0c1e2e" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#12253c" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1a2744" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#8b9fc0" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#4f7ef8" }] },
];
