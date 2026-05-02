"use client";

import { useState, useRef, type FormEvent } from "react";
import { Search, MapPin, Mic, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";

interface SearchBarProps {
  onSearch?: (query: string, location?: string) => void;
  className?: string;
}

export default function SearchBar({ onSearch, className }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [focused, setFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const queryRef = useRef<HTMLInputElement>(null);
  const { t, language } = useLanguage();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSearch?.(query.trim(), location.trim() || undefined);
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
          if (apiKey) {
            const res = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${pos.coords.latitude},${pos.coords.longitude}&key=${apiKey}`
            );
            const data = await res.json();
            
            if (data.status === "OK") {
              const addr = data?.results?.[0]?.formatted_address;
              if (addr) setLocation(addr);
            } else {
              console.error("Geocoding failed:", data.status, data.error_message);
              setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
            }
          } else {
            setLocation(
              `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`
            );
          }
        } catch (error) {
          console.error("Error in handleDetectLocation:", error);
          setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error.code, error.message);
        setIsLocating(false);
        alert(`Location access denied or unavailable: ${error.message}`);
      }
    );
  };

  const handleListen = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) return;

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(prev => prev + (prev ? " " : "") + transcript);
    };
    
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const clearQuery = () => {
    setQuery("");
    queryRef.current?.focus();
  };

  const suggestions = [
    { key: "search.suggestion.polling", fallback: "Where is my polling place?" },
    { key: "search.suggestion.register", fallback: "How do I register to vote?" },
    { key: "search.suggestion.id", fallback: "What ID do I need to vote?" },
    { key: "search.suggestion.election", fallback: "When is the next election?" },
  ];

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("w-full", className)}
      aria-label="Search civic questions"
      role="search"
    >
      <div
        className={cn(
          "flex items-center gap-3 glass-strong rounded-2xl px-4 py-3 transition-all duration-200",
          focused
            ? "border-[#4f7ef8]/60 shadow-[0_0_0_3px_rgba(79,126,248,0.15),0_8px_32px_rgba(0,0,0,0.4)]"
            : "border-white/12 shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
        )}
      >
        {/* Search icon */}
        <Search
          className={cn(
            "w-5 h-5 flex-shrink-0 transition-colors duration-200",
            focused ? "text-[#4f7ef8]" : "text-[#4a5578]"
          )}
        />

        {/* Query input */}
        <input
          ref={queryRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={t("search.placeholder")}
          className="flex-1 bg-transparent border-none outline-none text-[#f0f4ff] text-sm placeholder-[#4a5578] min-w-0"
          aria-label="Search query"
          autoComplete="off"
          spellCheck="false"
        />

        {/* Mic button */}
        <button
          type="button"
          onClick={handleListen}
          className={cn(
            "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors",
            isListening ? "bg-[#ff4757]/20 text-[#ff4757] animate-pulse" : "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
          )}
          aria-label="Voice input"
        >
          <Mic className="w-3.5 h-3.5" />
        </button>

        {/* Clear button */}
        {query && (
          <button
            type="button"
            onClick={clearQuery}
            className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Clear search"
          >
            <X className="w-3 h-3 text-[#8b99b8]" />
          </button>
        )}

        {/* Divider */}
        <div className="h-5 w-px bg-[var(--border-subtle)] flex-shrink-0" />

        {/* Location input */}
        <div className="flex items-center gap-2 min-w-0 flex-1 max-w-52">
          <MapPin
            className={cn(
              "w-4 h-4 flex-shrink-0 transition-colors",
              location ? "text-[#10d06e]" : "text-[#4a5578]"
            )}
          />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t("search.location")}
            className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)] min-w-0"
            aria-label="Your location for personalised results"
          />
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={isLocating}
            className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#10d06e]/10 border border-[#10d06e]/20 hover:bg-[#10d06e]/20 flex items-center justify-center transition-all duration-200 hover:scale-105 disabled:opacity-50"
            aria-label={t("search.useMyLocation")}
            title={t("search.useMyLocation")}
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 text-[#10d06e] animate-spin-slow" />
            ) : (
              <svg
                className="w-3.5 h-3.5 text-[#10d06e]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                <circle cx="12" cy="12" r="8" strokeDasharray="4 2" />
              </svg>
            )}
          </button>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={!query.trim()}
          className={cn(
            "flex-shrink-0 h-9 px-4 rounded-xl text-sm font-semibold transition-all duration-200",
            query.trim()
              ? "bg-gradient-to-r from-[#1e3a8a] to-[#4f7ef8] text-white shadow-[0_2px_12px_rgba(79,126,248,0.4)] hover:shadow-[0_4px_20px_rgba(79,126,248,0.6)] hover:-translate-y-0.5"
              : "bg-[#111827] text-[#4a5578] cursor-not-allowed"
          )}
          aria-label="Search"
        >
          {t("search.button")}
        </button>
      </div>

      {/* Suggestion pills */}
      <div className="flex flex-wrap gap-2 mt-2.5 px-1">
        {suggestions.map((s) => {
          const label = t(s.key) !== s.key ? t(s.key) : s.fallback;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                setQuery(label);
                onSearch?.(label, location || undefined);
              }}
              className="text-[10px] text-[#8b99b8] hover:text-[#4f7ef8] transition-colors border border-white/8 hover:border-[#4f7ef8]/30 rounded-full px-2.5 py-1 hover:bg-[#4f7ef8]/8"
            >
              {label}
            </button>
          );
        })}
      </div>
    </form>
  );
}
