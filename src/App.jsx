import React, { useState, useEffect } from "react";
import {
  Workspace,
  defaultHeroPanels,
  loadSavedPositions
} from "./Workspace";

export function App() {
  const [viewMode, setViewMode] = useState("page"); // "page" | "workspace"

  const handleDownloadResume = () => {
    const link = document.createElement("a");
    link.href = "resume.pdf";
    link.download = "resume.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Re-bind interactive controllers whenever the view is mounted/switched
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window.initBackgroundAnimations === "function") {
        window.initBackgroundAnimations();
      }
      if (typeof window.initTerminal === "function") {
        window.initTerminal();
      }
      if (typeof window.initGitHubActivity === "function") {
        window.initGitHubActivity();
      }
      if (typeof window.initBlogActivity === "function") {
        window.initBlogActivity();
      }
    }, 80);

    return () => clearTimeout(timer);
  }, [viewMode]);

  // If in dedicated workspace dashboard mode, render Workspace component
  if (viewMode === "workspace") {
    return (
      <div className="plasma-app-root bg-ink-page min-h-screen text-ink-text">
        <Workspace
          panels={defaultHeroPanels}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      </div>
    );
  }

  return (
    <>
      {/* Sticky Header Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-ink-page">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2 font-mono text-sm font-medium text-ink-text hover:text-white transition-colors duration-150 ease-unslop">
            <span className="text-ink-accent font-semibold">&gt;</span>
            <span>krishnang.dev</span>
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm text-ink-secondary" aria-label="Main navigation">
            <a href="#activity" className="hover:text-ink-text transition-colors duration-150 ease-unslop">Activity</a>
            <a href="#writing" className="hover:text-ink-text transition-colors duration-150 ease-unslop">Writing</a>
            <a href="#services" className="hover:text-ink-text transition-colors duration-150 ease-unslop">Services</a>
            <a href="fun/game/game.html" className="hover:text-ink-text transition-colors duration-150 ease-unslop">Arcade</a>
            <a href="forms/review.html" className="hover:text-ink-text transition-colors duration-150 ease-unslop">Reviews</a>
          </nav>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setViewMode("workspace")}
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono text-ink-muted hover:text-ink-secondary bg-ink-raised border border-white/[0.08] transition-colors duration-150 ease-unslop"
              title="Switch to floating workspace panels"
            >
              <span>Workspace grid</span>
            </button>
            <a href="forms/connect.html" className="hidden sm:inline-flex text-sm text-ink-secondary hover:text-ink-text transition-colors duration-150 ease-unslop">
              Connect
            </a>
            <button
              type="button"
              onClick={handleDownloadResume}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-ink-raised hover:bg-white/[0.08] text-ink-text border border-white/[0.08] transition-[background-color,border-color,color] duration-150 ease-unslop"
            >
              <span>Resume</span>
              <svg className="w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.25V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="relative z-10 max-w-6xl mx-auto px-6">

        {/* Hero Section (Asymmetric Split: Bio Left, Terminal Right) */}
        <section id="hero" className="w-full pt-12 sm:pt-16 pb-16 border-b border-white/[0.08]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left: Identity & CTAs */}
            <div className="lg:col-span-6 flex flex-col items-start gap-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-ink-raised border border-white/[0.08] text-xs font-mono text-ink-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-ink-accent"></span>
                <span>Systems software &amp; applied AI</span>
              </div>

              <div className="space-y-4">
                <h1 id="scramble-hero-name" className="text-4xl sm:text-5xl font-medium tracking-tight text-ink-text select-none cursor-pointer">
                  Krishnang Pandey
                </h1>
                <p className="text-base sm:text-lg text-ink-secondary leading-relaxed max-w-xl">
                  First-year CSE AI/ML student at Chitkara University. Building local LLM tooling, high-performance backends, and terminal applications.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadResume}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-ink-text text-ink-deep hover:bg-white active:scale-[0.98] transition-[background-color,transform] duration-150 ease-unslop"
                >
                  <span>Download resume</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.25V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                </button>
                <a href="forms/connect.html" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-ink-raised hover:bg-white/[0.08] text-ink-text border border-white/[0.08] active:scale-[0.98] transition-[background-color,border-color,transform] duration-150 ease-unslop">
                  <span>Contact me</span>
                  <svg className="w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" /></svg>
                </a>
              </div>

              <p className="text-xs font-mono text-ink-muted flex items-center gap-2">
                <kbd className="px-2 py-0.5 rounded bg-ink-raised border border-white/[0.12] text-ink-secondary">help</kbd>
                <span>Type commands in the shell to inspect projects</span>
              </p>
            </div>

            {/* Right: Interactive Developer Terminal */}
            <div className="lg:col-span-6 w-full">
              <div id="terminal-widget" className="terminal-card shadow-elevated">
                <div className="terminal-header">
                  <span className="terminal-title">krishnang@dev: ~ (bash)</span>
                </div>
                <div className="terminal-body">
                  <div className="terminal-output" aria-live="polite"></div>
                  <div className="terminal-input-line">
                    <span className="terminal-prompt-text">krishnang@dev:~$</span>
                    <input
                      type="text"
                      className="terminal-input"
                      aria-label="Terminal command input"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      placeholder="Type help or projects"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Activity Section (GitHub Commits & Technical Writing) */}
        <section id="activity" className="w-full scroll-mt-20 py-12 border-b border-white/[0.08]">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-mono text-ink-muted mb-1">Activity</p>
              <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-ink-text">
                Engineering activity
              </h2>
              <p className="text-sm text-ink-secondary mt-1">
                Recent code commits from GitHub and published technical notes
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              {/* GitHub Feed */}
              <div className="p-6 rounded-2xl bg-ink-card border border-white/[0.08] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.08]">
                    <div className="flex items-center gap-2.5">
                      <svg className="w-4 h-4 text-ink-muted" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                      <h3 className="text-sm font-medium text-ink-text font-mono">GitHub commits</h3>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono text-ink-secondary bg-ink-raised px-2 py-1 rounded border border-white/[0.08]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4cc38a]"></span>
                      Live sync
                    </span>
                  </div>

                  <div id="github-activity" className="github-activity" aria-live="polite"></div>
                </div>
              </div>

              {/* Writing Feed */}
              <div id="writing" className="p-6 rounded-2xl bg-ink-card border border-white/[0.08] flex flex-col justify-between scroll-mt-20">
                <div>
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.08]">
                    <div className="flex items-center gap-2.5">
                      <svg className="w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"/></svg>
                      <h3 className="text-sm font-medium text-ink-text font-mono">Recent writing</h3>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono text-ink-secondary bg-ink-raised px-2 py-1 rounded border border-white/[0.08]">
                      Notes &amp; essays
                    </span>
                  </div>

                  <div id="blog-activity" className="blog-activity" aria-live="polite"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services & Collaboration Section */}
        <section id="services" className="w-full scroll-mt-20 py-12">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-mono text-ink-muted mb-1">Services</p>
              <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-ink-text">
                Services &amp; capabilities
              </h2>
              <p className="text-sm text-ink-secondary mt-1">
                Engineering offerings for client systems, production APIs, and AI tooling
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Services Matrix (7 cols) */}
              <div className="lg:col-span-7 p-6 rounded-2xl bg-ink-card border border-white/[0.08] flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-medium text-ink-text mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-accent"></span>
                    Development packages
                  </h3>

                  <ul className="space-y-3">
                    <li className="p-4 rounded-xl bg-ink-raised border border-white/[0.08] text-sm text-ink-secondary flex items-start gap-3">
                      <span className="text-ink-accent font-mono text-xs pt-0.5 tabular-nums">01</span>
                      <div>
                        <span className="font-medium text-ink-text">Full-Stack Web Applications</span>
                        <p className="text-xs text-ink-muted mt-1">Next.js, Node.js, Express, REST APIs, Tailwind CSS</p>
                      </div>
                    </li>
                    <li className="p-4 rounded-xl bg-ink-raised border border-white/[0.08] text-sm text-ink-secondary flex items-start gap-3">
                      <span className="text-ink-accent font-mono text-xs pt-0.5 tabular-nums">02</span>
                      <div>
                        <span className="font-medium text-ink-text">AI &amp; Local LLM Tooling</span>
                        <p className="text-xs text-ink-muted mt-1">Multi-agent workflows, Ollama, CLI assistants, RAG pipelines</p>
                      </div>
                    </li>
                    <li className="p-4 rounded-xl bg-ink-raised border border-white/[0.08] text-sm text-ink-secondary flex items-start gap-3">
                      <span className="text-ink-accent font-mono text-xs pt-0.5 tabular-nums">03</span>
                      <div>
                        <span className="font-medium text-ink-text">Database Architecture &amp; Caching</span>
                        <p className="text-xs text-ink-muted mt-1">PostgreSQL, MySQL, MongoDB, Redis caching and optimization</p>
                      </div>
                    </li>
                    <li className="p-4 rounded-xl bg-ink-raised border border-white/[0.08] text-sm text-ink-secondary flex items-start gap-3">
                      <span className="text-ink-accent font-mono text-xs pt-0.5 tabular-nums">04</span>
                      <div>
                        <span className="font-medium text-ink-text">High-Performance Automation</span>
                        <p className="text-xs text-ink-muted mt-1">Python, Bash, Rust micro-utilities, worker scripts</p>
                      </div>
                    </li>
                  </ul>
                </div>

                <p className="text-xs font-mono text-ink-muted mt-6 pt-4 border-t border-white/[0.08]">
                  Available for contract work, freelance projects, and research partnerships
                </p>
              </div>

              {/* Collaboration Card (5 cols) */}
              <div className="lg:col-span-5 p-6 rounded-2xl bg-ink-card border border-white/[0.08] flex flex-col justify-between">
                <div className="space-y-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-ink-raised text-xs font-mono text-ink-secondary border border-white/[0.08]">
                    Collaboration
                  </span>

                  <h3 className="text-xl font-medium text-ink-text leading-snug">
                    Have an idea, tricky architecture, or an AI tool to ship?
                  </h3>

                  <p className="text-sm text-ink-secondary leading-relaxed">
                    I help move systems from whiteboard architecture to production-grade deployment with clean code, testability, and high reliability.
                  </p>
                </div>

                <div className="pt-6 border-t border-white/[0.08] space-y-3">
                  <a href="mailto:hello@krishnang.dev" className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-ink-accent hover:bg-ink-accent-hover text-white active:scale-[0.98] transition-[background-color,transform] duration-150 ease-unslop">
                    <span>hello@krishnang.dev</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" /></svg>
                  </a>
                  <p className="text-xs font-mono text-ink-muted text-center">
                    Replies within 24 hours
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/[0.08] py-8 text-xs font-mono text-ink-muted relative z-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; 2026 Krishnang Pandey</p>
          <div className="flex items-center gap-6">
            <a href="https://github.com/krriisshhnnaaa" target="_blank" rel="noopener noreferrer" className="hover:text-ink-secondary transition-colors duration-150 ease-unslop">GitHub</a>
            <a href="fun/game/game.html" className="hover:text-ink-secondary transition-colors duration-150 ease-unslop">Arcade</a>
            <a href="forms/review.html" className="hover:text-ink-secondary transition-colors duration-150 ease-unslop">Reviews</a>
            <a href="#hero" className="hover:text-ink-secondary transition-colors duration-150 ease-unslop">Top &uarr;</a>
          </div>
        </div>
      </footer>
    </>
  );
}

export default App;
