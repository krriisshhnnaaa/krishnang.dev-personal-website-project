import React, { useState, useEffect } from "react";
import { PlasmaProvider, Plasma, usePlasma } from "@cruxgarden/plasma-ui";

// Key for saving panel positions in localStorage
const LAYOUT_STORAGE_KEY = "plasma-workspace-layout";

// Load saved offsets from localStorage
export function loadSavedPositions() {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

// Save offsets to localStorage
export function persistPositions(positions) {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(positions));
  } catch (e) {}
}

/**
 * Default hero panels (All hero sections EXCEPT terminal, blog posts, and education book):
 * 1. Hero Introduction / Profile
 * 2. GitHub Activity Feed
 * 3. Freelancing Services & Packages
 * 4. Freelancing Collaboration / CTA
 * 5. Connect & Social Links
 */
export const defaultHeroPanels = [
  {
    id: "hero-intro",
    title: "Introduction",
    badge: "Student & Systems Engineer",
    type: "hero-intro",
    offset: { x: 0, y: 0 }
  },
  {
    id: "github-activity",
    title: "GitHub Commits",
    badge: "Live Sync",
    type: "github-activity",
    offset: { x: 0, y: 0 }
  },
  {
    id: "freelance-services",
    title: "Services & Packages",
    badge: "Full-Stack & AI",
    type: "freelance-services",
    offset: { x: 0, y: 0 }
  },
  {
    id: "freelance-contact",
    title: "Let's Collaborate",
    badge: "Available",
    type: "freelance-contact",
    offset: { x: 0, y: 0 }
  },
  {
    id: "connect",
    title: "Connect Around The Internet",
    badge: "Socials",
    type: "connect",
    offset: { x: 0, y: 0 }
  }
];

/**
 * Header Content component rendered inside standard HTML <header>
 * Free of plasma-ui library functions
 */
export function HeaderContent({ mood, setMood, viewMode, setViewMode, onResetLayout }) {
  const handleMoodChange = (newMood) => {
    if (setMood) setMood(newMood);
  };

  return (
    <div className="max-w-7xl mx-auto h-full px-6 sm:px-8 flex items-center justify-between header-inner w-full">
      {/* Logo & Terminal Badge */}
      <div className="relative flex items-center gap-3">
        <button
          id="personal-logo"
          className="personal-logo group relative"
          type="button"
          aria-label="Personal Logo: </>, strike for metallic chime"
        >
          <span className="logo-glyph-open">&lt;</span>
          <span className="logo-glyph-slash">/</span>
          <span className="logo-glyph-close">&gt;</span>
        </button>

        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/60 border border-slate-800/80 text-xs font-mono text-slate-300">
          <span className="text-cyan-400 font-bold">&gt;</span> krishnang.dev
        </span>
      </div>

      {/* Navigation Links & Controls */}
      <nav className="site-nav flex items-center gap-1.5 sm:gap-3" aria-label="Primary navigation">
        <a
          href="#activity"
          className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-300 hover:text-cyan-300 hover:bg-slate-900/60 border border-transparent hover:border-slate-800 transition-all duration-200"
        >
          Activity
        </a>
        <a
          href="#blogs"
          className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-300 hover:text-cyan-300 hover:bg-slate-900/60 border border-transparent hover:border-slate-800 transition-all duration-200"
        >
          Writing
        </a>
        <a
          href="#freelance"
          className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-300 hover:text-cyan-300 hover:bg-slate-900/60 border border-transparent hover:border-slate-800 transition-all duration-200"
        >
          Services
        </a>
        <a
          href="#education"
          className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-300 hover:text-cyan-300 hover:bg-slate-900/60 border border-transparent hover:border-slate-800 transition-all duration-200"
        >
          Timeline
        </a>
        <a
          href="#connect"
          className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-300 hover:text-cyan-300 hover:bg-slate-900/60 border border-transparent hover:border-slate-800 transition-all duration-200"
        >
          Connect
        </a>

        {/* View Mode Toggle (Portfolio Page vs Workspace Grid) */}
        {setViewMode && (
          <button
            type="button"
            onClick={() => {
              setViewMode(viewMode === "page" ? "workspace" : "page");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-purple-300 bg-purple-950/40 border border-purple-500/30 hover:border-purple-400/60 hover:bg-purple-900/40 transition-all"
            title="Toggle between full page and floating workspace grid"
          >
            <span>{viewMode === "workspace" ? "📄 Portfolio View" : "🔮 Workspace Grid"}</span>
          </button>
        )}

        {/* Mood Selector Switcher */}
        {setMood && (
          <div className="hidden xl:flex items-center gap-1 p-1 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] font-mono">
            {["tidal", "aurora", "ember"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleMoodChange(m)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  mood === m
                    ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        {/* Reset Positions */}
        {onResetLayout && (
          <button
            type="button"
            onClick={() => {
              onResetLayout();
            }}
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-slate-200 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800 transition-all"
            title="Snap all dragged panels back to default positions"
          >
            Reset
          </button>
        )}

        {/* Quick Action CTA */}
        <a
          href="#freelance"
          className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-cyan-300 bg-cyan-950/50 border border-cyan-500/30 hover:bg-cyan-500 hover:text-slate-950 hover:border-cyan-400 shadow-sm hover:shadow-glow-cyan transition-all duration-300"
        >
          Hire Me <span>↗</span>
        </a>
      </nav>
    </div>
  );
}

/**
 * Panel Content dispatcher based on panel type or ID
 */
export function PanelContent({ panel }) {
  if (panel.content) {
    return typeof panel.content === "function" ? panel.content() : panel.content;
  }

  switch (panel.id || panel.type) {
    case "hero-intro":
      return <HeroIntroContent />;
    case "github-activity":
      return <GithubActivityContent />;
    case "freelance-services":
      return <FreelanceServicesContent />;
    case "freelance-contact":
      return <FreelanceContactContent />;
    case "connect":
      return <ConnectContent />;
    default:
      return (
        <div className="p-4 text-slate-300">
          <h3 className="font-bold text-white text-lg">{panel.title || panel.id}</h3>
          <p className="text-sm text-slate-400 mt-2">{panel.description || "Liquid Plasma Panel"}</p>
        </div>
      );
  }
}

/**
 * Content: Hero Introduction
 */
export function HeroIntroContent() {
  const { bump } = usePlasma();

  return (
    <div className="hero-intro-panel flex flex-col items-start w-full">
      {/* Header bar with drag handle */}
      <div className="w-full flex items-center justify-between pb-3 mb-4 border-b border-slate-800/60">
        <div className="availability inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-xs font-mono text-emerald-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Available for thoughtful projects</span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-400/80 bg-cyan-950/40 px-2.5 py-1 rounded border border-cyan-500/20 select-none">
          <span className="text-cyan-400">⠿</span>
          <span>DRAG &amp; FUSE</span>
        </div>
      </div>

      {/* Greeting & Name */}
      <p className="hero-greeting text-base sm:text-lg text-slate-400 font-mono tracking-wide">
        Hi, myself
      </p>

      <h1 className="hero-name text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mt-1 mb-4 bg-gradient-to-r from-white via-slate-100 to-purple-300 bg-clip-text text-transparent hover:from-cyan-200 hover:via-white hover:to-purple-200 transition-all duration-500">
        Krishnang Pandey.
      </h1>

      {/* Education Details Cyber Card */}
      <div className="hero-details w-full p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 relative overflow-hidden group hover:border-cyan-500/40 transition-all duration-300 mb-6">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 via-blue-500 to-purple-500"></div>

        <div className="pl-3 space-y-1">
          <div className="flex items-center justify-between">
            <p className="hero-role text-sm sm:text-base font-semibold text-slate-100 flex items-center gap-2">
              <span>Student &amp; Systems Engineer</span>
            </p>
            <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-500/20">
              Year 1
            </span>
          </div>

          <p className="hero-university text-xs sm:text-sm font-medium text-slate-300">
            Chitkara University
          </p>

          <p className="hero-degree text-[11px] sm:text-xs text-slate-400">
            Computer Science Engineering
          </p>

          <p className="hero-specialization text-xs sm:text-sm font-semibold text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text">
            Artificial Intelligence &amp; Machine Learning
          </p>
        </div>
      </div>

      {/* Call To Action Buttons */}
      <div className="hero-actions flex flex-wrap items-center gap-3 w-full" data-plasma-nodrag>
        <a
          className="button button-primary relative group overflow-hidden px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          href="#freelance"
          onClick={() => bump(0.8)}
        >
          <span className="relative z-10 flex items-center gap-2">
            Work with me <span className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">↗</span>
          </span>
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
        </a>

        <a
          className="button button-secondary px-5 py-3 rounded-xl bg-slate-950/50 hover:bg-slate-800/80 border border-slate-700/60 hover:border-slate-500 text-slate-200 text-xs sm:text-sm font-medium hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          href="#blogs"
          onClick={() => bump(0.5)}
        >
          Read my writing
        </a>
      </div>
    </div>
  );
}

/**
 * Content: GitHub Activity Feed
 */
export function GithubActivityContent() {
  return (
    <div className="activity-github-panel flex flex-col w-full h-full">
      <header className="activity-block-header flex items-center justify-between pb-3 mb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-slate-300" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          <h3 className="text-sm font-mono font-semibold text-slate-200">GitHub Commits</h3>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Live Sync
        </span>
      </header>

      {/* Target container populated by activity-github.js */}
      <div
        id="github-activity"
        className="github-activity flex-1 min-h-[140px]"
        aria-live="polite"
      >
        <div className="space-y-3 font-mono text-xs">
          <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/60">
            <span className="text-cyan-400 font-semibold">krriisshhnnaaa/krishnang.dev</span>
            <p className="text-slate-300 mt-1">feat: implement plasma UI liquid glass workspace panels</p>
            <span className="text-[10px] text-slate-500 mt-1 block">Just now · main</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/60">
            <span className="text-cyan-400 font-semibold">krriisshhnnaaa/harry</span>
            <p className="text-slate-300 mt-1">optimize quantized local LLM inference context buffer</p>
            <span className="text-[10px] text-slate-500 mt-1 block">2 days ago · master</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Content: Freelancing Services & Packages Matrix
 */
export function FreelanceServicesContent() {
  return (
    <div className="freelance-services-panel flex flex-col justify-between h-full">
      <div>
        <header className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800/60">
          <h3 className="freelance-title text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400"></span>
            Services &amp; Packages
          </h3>
          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
            Contract &amp; Freelance
          </span>
        </header>

        <ul className="freelance-list space-y-3 text-left">
          <li className="freelance-item flex items-start gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 hover:border-cyan-500/30 transition-colors">
            <span className="text-cyan-400 font-bold">•</span>
            <span className="text-xs sm:text-sm text-slate-300">
              <strong className="text-white">Full-Stack Web Applications</strong> (Next.js, Node.js, Express, REST APIs, Tailwind)
            </span>
          </li>

          <li className="freelance-item flex items-start gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 hover:border-cyan-500/30 transition-colors">
            <span className="text-cyan-400 font-bold">•</span>
            <span className="text-xs sm:text-sm text-slate-300">
              <strong className="text-white">AI &amp; Local LLM Tooling</strong> (Multi-Agent workflows, Ollama, CLI Agents, RAG pipelines)
            </span>
          </li>

          <li className="freelance-item flex items-start gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 hover:border-cyan-500/30 transition-colors">
            <span className="text-cyan-400 font-bold">•</span>
            <span className="text-xs sm:text-sm text-slate-300">
              <strong className="text-white">Database Architecture &amp; Caching</strong> (PostgreSQL, MySQL, MongoDB, Redis optimization)
            </span>
          </li>

          <li className="freelance-item flex items-start gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 hover:border-cyan-500/30 transition-colors">
            <span className="text-cyan-400 font-bold">•</span>
            <span className="text-xs sm:text-sm text-slate-300">
              <strong className="text-white">High-Performance Scripting &amp; Automation</strong> (Python, Bash, Rust micro-utilities)
            </span>
          </li>
        </ul>
      </div>

      <p className="text-xs text-slate-500 font-mono mt-5 pt-3 border-t border-slate-800/60">
        Open for contracts, freelance gigs, and collaborative open-source ventures.
      </p>
    </div>
  );
}

/**
 * Content: Freelancing Contact / CTA
 */
export function FreelanceContactContent() {
  const { bump } = usePlasma();

  return (
    <div className="freelance-contact-panel flex flex-col justify-center items-start gap-4 h-full relative overflow-hidden text-left">
      <div className="w-full flex items-center justify-between">
        <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase tracking-wider bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
          Let&apos;s Collaborate
        </span>
        <span className="text-[10px] font-mono text-slate-400">krishnang.dev</span>
      </div>

      <h3 className="text-xl sm:text-2xl font-bold text-white leading-snug">
        Have an idea, a tricky system, or an AI workflow to ship?
      </h3>

      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
        I help bring concepts from whiteboard architecture to production-grade deployment with clean code and high reliability.
      </p>

      <a
        className="button button-primary relative group overflow-hidden px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 text-slate-950 font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 mt-2"
        href="mailto:hello@krishnang.dev"
        data-plasma-nodrag
        onClick={() => bump(0.9)}
      >
        <span className="relative z-10 flex items-center gap-2">
          Start a conversation <span className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">↗</span>
        </span>
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
      </a>
    </div>
  );
}

/**
 * Content: Connect / Social Cards
 */
export function ConnectContent() {
  const { bump } = usePlasma();

  return (
    <div className="connect-panel flex flex-col w-full text-left">
      <header className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800/60">
        <div>
          <p className="text-xs font-mono font-semibold uppercase tracking-widest text-purple-300">
            Connect
          </p>
          <h3 className="text-lg sm:text-xl font-extrabold text-white">Find me around the internet</h3>
        </div>
        <span className="text-[10px] font-mono text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-500/20">
          Socials
        </span>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full" data-plasma-nodrag>
        {/* GitHub */}
        <a
          href="https://github.com/krriisshhnnaaa"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => bump(0.5)}
          className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-purple-500/50 hover:bg-slate-900/60 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </div>
            <div>
              <h4 className="font-mono font-semibold text-xs text-white group-hover:text-purple-300">GitHub</h4>
              <span className="text-[10px] text-slate-400">@krriisshhnnaaa</span>
            </div>
          </div>
          <span className="text-slate-500 group-hover:text-purple-400 transition-colors">↗</span>
        </a>

        {/* LinkedIn */}
        <a
          href="https://www.linkedin.com/in/krishnang-pandey/"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => bump(0.5)}
          className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-blue-500/50 hover:bg-slate-900/60 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </div>
            <div>
              <h4 className="font-mono font-semibold text-xs text-white group-hover:text-blue-300">LinkedIn</h4>
              <span className="text-[10px] text-slate-400">krishnang</span>
            </div>
          </div>
          <span className="text-slate-500 group-hover:text-blue-400 transition-colors">↗</span>
        </a>

        {/* Instagram */}
        <a
          href="https://www.instagram.com/krishnangpandey/"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => bump(0.5)}
          className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-pink-500/50 hover:bg-slate-900/60 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-pink-950/60 border border-pink-500/30 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441 6.45-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
            <div>
              <h4 className="font-mono font-semibold text-xs text-white group-hover:text-pink-300">Instagram</h4>
              <span className="text-[10px] text-slate-400">@krishnang</span>
            </div>
          </div>
          <span className="text-slate-500 group-hover:text-pink-400 transition-colors">↗</span>
        </a>
      </div>
    </div>
  );
}

/**
 * EXACT IMPLEMENTATION AS REQUESTED:
 * 
 * import { PlasmaProvider, Plasma, usePlasma } from "@cruxgarden/plasma-ui";
 * 
 * export function Workspace({ panels }) {
 *   return (
 *     <PlasmaProvider mood="tidal">
 *       <Plasma as="header" lean={false}>…</Plasma>
 *       {panels.map(p => (
 *         <Plasma key={p.id} draggable padding={20} offset={p.offset}
 *           onDragEnd={o => savePosition(p.id, o)}>
 *           <PanelContent panel={p} />
 *         </Plasma>
 *       ))}
 *     </PlasmaProvider>
 *   );
 * }
 */
export function Workspace({ panels = defaultHeroPanels, viewMode, setViewMode }) {
  const [positions, setPositions] = useState(() => loadSavedPositions());
  const [mood, setMood] = useState("tidal");

  const savePosition = (id, offset) => {
    setPositions((prev) => {
      const next = { ...prev, [id]: offset };
      persistPositions(next);
      return next;
    });
  };

  const handleReset = () => {
    setPositions({});
    try {
      localStorage.removeItem(LAYOUT_STORAGE_KEY);
    } catch (e) {}
  };

  const activePanels = panels || defaultHeroPanels;

  return (
    <>
      {/* Site Header & Navigation (Standard HTML Header - No Plasma UI) */}
      <header className="fixed top-0 inset-x-0 z-50 h-20 backdrop-blur-xl bg-slate-950/75 border-b border-slate-800/60 transition-all duration-300 site-header">
        <HeaderContent
          mood={mood}
          setMood={setMood}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onResetLayout={handleReset}
        />
      </header>

      <PlasmaProvider
        mood={mood}
        ground="clear"
        background="jpg(1).jpg"
        zIndex={1}
        theme="dark"
        radius={22}
        blend={24}
        grid={24}
        grain={0}
        glow={0.6}
      >
        {/* Mapped Draggable Panels */}
        <div className="workspace-panels-grid max-w-7xl mx-auto px-6 sm:px-8 pt-28 pb-16 grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          {activePanels.map((p) => (
            <Plasma
              key={p.id}
              draggable
              padding={20}
              offset={positions[p.id] || p.offset}
              onDragEnd={(o) => savePosition(p.id, o)}
              className={`plasma-hero-panel plasma-panel-${p.id} rounded-2xl border border-slate-800/60 backdrop-blur-md transition-shadow duration-300 ${
                p.id === "hero-intro" || p.id === "connect" ? "md:col-span-2" : ""
              }`}
            >
              <PanelContent panel={p} />
            </Plasma>
          ))}
        </div>
      </PlasmaProvider>
    </>
  );
}

export default Workspace;
