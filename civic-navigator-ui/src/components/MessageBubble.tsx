"use client";

import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils";
import type { Message } from "@/types";
import StepList from "@/components/StepList";
import { Sparkles, User, Lightbulb, Volume2, Square } from "lucide-react";
import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageProvider";

interface MessageBubbleProps {
  message: Message;
  isFirst?: boolean;
}

function parseMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br/>");
}

export default function MessageBubble({ message, isFirst }: MessageBubbleProps) {
  const isBot = message.role === "assistant";
  const [isPlaying, setIsPlaying] = useState(false);
  const { language, t } = useLanguage();

  useEffect(() => {
    return () => {
      if (isPlaying) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isPlaying]);

  const handleSpeech = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    // Strip markdown formatting for cleaner speech
    const cleanText = message.content.replace(/[*_#]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = language;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  if (message.isLoading) {
    return (
      <div className="flex gap-3 animate-fade-in" role="status" aria-label="AI is typing">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#4f7ef8] flex items-center justify-center flex-shrink-0 shadow-[0_4px_16px_rgba(79,126,248,0.3)]">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="bg-[#1a2234] border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#4f7ef8] animate-typing-1" />
          <div className="w-2 h-2 rounded-full bg-[#4f7ef8] animate-typing-2" />
          <div className="w-2 h-2 rounded-full bg-[#4f7ef8] animate-typing-3" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-3 animate-slide-up",
        isBot ? "flex-row" : "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md mt-0.5",
          isBot
            ? "bg-gradient-to-br from-[#1e3a8a] to-[#4f7ef8] shadow-[0_4px_16px_rgba(79,126,248,0.3)]"
            : "bg-[#1a2234] border border-white/12"
        )}
      >
        {isBot ? (
          <Sparkles className="w-3.5 h-3.5 text-white" />
        ) : (
          <User className="w-3.5 h-3.5 text-[#8b99b8]" />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          "flex flex-col gap-1.5 max-w-[85%]",
          isBot ? "items-start" : "items-end"
        )}
      >
        {/* Main bubble */}
        <div
          className={cn(
            "px-4 py-3 rounded-2xl text-sm leading-relaxed message-prose transition-colors duration-200",
            isBot
              ? "bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-tl-sm text-[var(--text-primary)]"
              : "bg-gradient-to-br from-[#1e3a8a] to-[#3b6def] border border-[#4f7ef8]/30 rounded-tr-sm text-white shadow-lg"
          )}
        >
          <div
            dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
          />
        </div>

        {/* TTS Button (Bot only) */}
        {isBot && !message.isLoading && (
          <button
            onClick={handleSpeech}
            className={cn(
              "self-start -mt-1 ml-1 text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors",
              isPlaying ? "text-[#4f7ef8] bg-[#4f7ef8]/10" : "text-[#4a5578] hover:text-[#8b99b8] hover:bg-white/5"
            )}
            title="Read aloud"
          >
            {isPlaying ? <Square className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            {isPlaying ? "Stop" : "Listen"}
          </button>
        )}

        {/* Structured response section */}
        {isBot && message.structured && !isFirst && (
          <div className="w-full space-y-2.5 mt-1">
            {/* Steps */}
            {message.structured.steps && message.structured.steps.length > 0 && (
              <StepList steps={message.structured.steps} />
            )}

            {/* Tips */}
            {message.structured.tips && message.structured.tips.length > 0 && (
              <div className="bg-[#f5a623]/6 border border-[#f5a623]/20 rounded-xl p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-[#f5a623] mb-2">
                  <Lightbulb className="w-3.5 h-3.5" />
                  {t("chat.proTips") || "Pro Tips"}
                </p>
                <ul className="space-y-1.5">
                  {message.structured.tips.map((tip, i) => (
                    <li
                      key={i}
                      className="text-xs text-[#8b99b8] leading-relaxed flex gap-2"
                    >
                      <span className="text-[#f5a623] flex-shrink-0 mt-0.5">
                        ›
                      </span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Welcome message steps (first message special case) */}
        {isBot && message.structured && isFirst && message.structured.steps && (
          <div className="bg-[#4f7ef8]/6 border border-[#4f7ef8]/15 rounded-xl p-3 w-full">
            <p className="text-xs font-semibold text-[#7ba3ff] mb-2">
              {t("chat.whatIcanHelpWith") || "What I can help with:"}
            </p>
            <ul className="space-y-1">
              {message.structured.steps.map((step, i) => (
                <li
                  key={i}
                  className="text-xs text-[#8b99b8] flex items-start gap-2"
                >
                  <span className="w-4 h-4 rounded-full bg-[#4f7ef8]/20 text-[#4f7ef8] flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Timestamp — suppressHydrationWarning prevents SSR/client date mismatch */}
        <time
          className="text-[10px] text-[#4a5578]"
          dateTime={message.timestamp.toISOString()}
          suppressHydrationWarning
        >
          {formatTime(message.timestamp)}
        </time>
      </div>
    </div>
  );
}
