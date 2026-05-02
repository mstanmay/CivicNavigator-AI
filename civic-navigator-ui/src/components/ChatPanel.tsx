"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Message } from "@/types";
import { WELCOME_MESSAGE, QUICK_CHIPS, getMockResponse } from "@/lib/mockData";
import { generateId, formatTime, sleep } from "@/lib/utils";
import { cn } from "@/lib/utils";
import MessageBubble from "@/components/MessageBubble";
import QuickChips from "@/components/QuickChips";
import { Send, Sparkles, Mic } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

interface ChatPanelProps {
  location?: string;
  className?: string;
}

export default function ChatPanel({ location, className }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { t, language } = useLanguage();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
      setInput(prev => prev + (prev ? " " : "") + transcript);
    };
    
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const handleSend = async (text?: string) => {
    const query = (text ?? input).trim();
    if (!query || isLoading) return;

    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    // Add user message
    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content: query,
      timestamp: new Date(),
    };

    // Add loading placeholder
    const loadingId = generateId();
    const loadingMsg: Message = {
      id: loadingId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setIsLoading(true);

    try {
      // Call real API if available, otherwise use mock
      const apiBase = process.env.NEXT_PUBLIC_API_URL;
      let responseData: { content: string; structured: Message["structured"] };

      if (apiBase) {
        const res = await fetch(`${apiBase}/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: query,
            location: location || null,
            language: language,
          }),
        });
        responseData = await res.json();
      } else {
        // Simulate network delay
        await sleep(900 + Math.random() * 600);
        responseData = getMockResponse(query);
      }

      const assistantMsg: Message = {
        id: generateId(),
        role: "assistant",
        content: responseData.content,
        timestamp: new Date(),
        structured: responseData.structured,
      };

      setMessages((prev) =>
        prev.map((m) => (m.id === loadingId ? assistantMsg : m))
      );
    } catch {
      const errMsg: Message = {
        id: loadingId,
        role: "assistant",
        content:
          "⚠️ I couldn't reach the AI service. Please check the server is running and try again.",
        timestamp: new Date(),
      };
      setMessages((prev) =>
        prev.map((m) => (m.id === loadingId ? errMsg : m))
      );
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const canSend = input.trim().length > 0 && !isLoading;

  return (
    <div
      className={cn(
        "flex flex-col h-full glass rounded-2xl overflow-hidden",
        className
      )}
    >
      {/* Panel header */}
      <div className="flex-shrink-0 px-4 py-3.5 border-b border-[var(--border-subtle)] flex items-center gap-3 bg-gradient-to-r from-[#4f7ef8]/8 to-transparent">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#4f7ef8] flex items-center justify-center shadow-[0_4px_16px_rgba(79,126,248,0.4)] animate-pulse-glow">
          <Sparkles className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-sm text-[var(--text-primary)] leading-tight">
            {t("chat.title")}
          </h2>
          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
            {t("chat.subtitle")}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[10px] text-[#10d06e] font-medium bg-[#10d06e]/10 border border-[#10d06e]/20 px-2.5 py-1 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10d06e] animate-blink" />
          {t("nav.aiOnline")}
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4"
        role="log"
        aria-live="polite"
        aria-label="AI conversation"
      >
        {messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isFirst={idx === 0}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick chips */}
      <div className="flex-shrink-0 px-4 pb-2">
        <QuickChips
          chips={QUICK_CHIPS}
          onSelect={handleSend}
          disabled={isLoading}
        />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 px-4 pb-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          aria-label="Send a message"
          className="flex items-end gap-2 bg-[#1a2234] border border-white/12 rounded-2xl px-4 py-3 focus-within:border-[#4f7ef8]/60 focus-within:shadow-[0_0_0_3px_rgba(79,126,248,0.15)] transition-all duration-200"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={t("chat.placeholder")}
            rows={1}
            maxLength={1000}
            disabled={isLoading}
            aria-label="Your civic question"
            className="flex-1 bg-transparent border-none outline-none resize-none text-[#f0f4ff] text-sm placeholder-[#4a5578] leading-relaxed max-h-28 overflow-y-auto disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleListen}
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0",
              isListening ? "bg-[#ff4757]/20 text-[#ff4757] animate-pulse" : "bg-[#1a2234] text-[#8b99b8] hover:bg-white/10"
            )}
            aria-label="Voice input"
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0",
              canSend
                ? "bg-gradient-to-br from-[#1e3a8a] to-[#4f7ef8] text-white shadow-[0_2px_12px_rgba(79,126,248,0.4)] hover:scale-105 hover:shadow-[0_4px_20px_rgba(79,126,248,0.6)]"
                : "bg-[#111827] text-[#4a5578] cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
        <p className="text-center text-[10px] text-[#4a5578] mt-2">
          {t("chat.subtitle")} ·{" "}
          <a
            href="https://vote.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#4f7ef8] hover:underline"
          >
            vote.gov
          </a>
          · ⌨️ Enter to send
        </p>
      </div>
    </div>
  );
}
