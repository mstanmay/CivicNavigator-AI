"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sun, Moon, Menu, X, ExternalLink, Vote, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";
import { LANGUAGES, LanguageCode } from "@/lib/translations";

interface NavbarProps {
  className?: string;
}

export default function Navbar({ className }: NavbarProps) {
  const [isDark, setIsDark] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { t, language, setLanguage } = useLanguage();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleTheme = () => {
    setIsDark((v) => !v);
    // Toggle `.light` on <body> for CSS variable switching
    document.body.classList.toggle("light", isDark);
  };

  const navLinks = [
    { label: t("nav.elections"), href: "#" },
    { label: t("nav.registration"), href: "#" },
    { label: t("nav.about"), href: "#" },
    {
      label: "vote.gov",
      href: "https://vote.gov",
      external: true,
    },
  ];

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled
          ? "glass-strong border-b border-[var(--border-subtle)] shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
          : "bg-transparent",
        className
      )}
    >
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        {/* Skip to main content (accessibility) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#4f7ef8] focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold"
        >
          Skip to main content
        </a>

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 mr-2 group"
          aria-label="CivicNavigator AI — Home"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#4f7ef8] flex items-center justify-center shadow-[0_4px_16px_rgba(79,126,248,0.4)] group-hover:shadow-[0_4px_24px_rgba(79,126,248,0.6)] transition-shadow duration-200">
            <Vote className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight">
              CivicNavigator{" "}
              <span
                style={{
                  background: "linear-gradient(90deg,#4f7ef8,#a78bfa)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                AI
              </span>
            </span>
            <span className="text-[10px] text-[var(--text-muted)] mt-0.5">
              Election Assistant
            </span>
          </div>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1 ml-2">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all duration-200"
            >
              {t(link.label)}
              {link.external && (
                <ExternalLink className="w-3 h-3 opacity-60" />
              )}
            </a>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Status badge */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#10d06e] font-medium bg-[#10d06e]/10 border border-[#10d06e]/20 px-3 py-1.5 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10d06e] animate-blink" />
          {t("nav.aiOnline")}
        </div>

        {/* Language selector */}
        <div className="relative">
          <button
            onClick={() => setLangMenuOpen((v) => !v)}
            aria-label="Select Language"
            className="w-9 h-9 rounded-xl glass border-white/12 hover:border-white/25 flex items-center justify-center transition-all duration-200 hover:scale-105"
          >
            <Globe className="w-4 h-4 text-[#4f7ef8]" />
          </button>
          
          {langMenuOpen && (
            <div className="absolute right-0 mt-2 w-40 glass-strong border border-white/12 rounded-xl py-2 shadow-xl z-50 animate-slide-up">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code as LanguageCode);
                    setLangMenuOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm transition-colors",
                    language === lang.code
                      ? "text-[#4f7ef8] bg-[#4f7ef8]/10 font-medium"
                      : "text-[#8b99b8] hover:text-[#f0f4ff] hover:bg-white/5"
                  )}
                >
                  {lang.nativeName} <span className="text-[10px] opacity-60 ml-1">({lang.name})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="w-9 h-9 rounded-xl glass border-white/12 hover:border-white/25 flex items-center justify-center transition-all duration-200 hover:scale-105"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-[#f5a623]" />
          ) : (
            <Moon className="w-4 h-4 text-[#8b99b8]" />
          )}
        </button>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="md:hidden w-9 h-9 rounded-xl glass border-white/12 flex items-center justify-center transition-colors"
        >
          {menuOpen ? (
            <X className="w-4 h-4 text-[#f0f4ff]" />
          ) : (
            <Menu className="w-4 h-4 text-[#8b99b8]" />
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden glass-strong border-t border-white/8 px-4 py-3 animate-slide-up">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="flex items-center justify-between w-full py-2.5 text-sm text-[#8b99b8] hover:text-[#f0f4ff] border-b border-white/6 last:border-0"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
              {link.external && <ExternalLink className="w-3.5 h-3.5 opacity-60" />}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
