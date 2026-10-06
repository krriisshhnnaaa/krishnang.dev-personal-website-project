import React, { useState, useEffect } from "react";
import { PlasmaProvider, Plasma } from "@cruxgarden/plasma-ui";
import {
  Workspace,
  PanelContent,
  HeaderContent,
  defaultHeroPanels,
  loadSavedPositions,
  persistPositions
} from "./Workspace";

export function App() {
  const [positions, setPositions] = useState(() => loadSavedPositions());
  const [mood, setMood] = useState("tidal");
  const [viewMode, setViewMode] = useState("page"); // "page" | "workspace"

  const savePosition = (id, offset) => {
    setPositions((prev) => {
      const next = { ...prev, [id]: offset };
      persistPositions(next);
      return next;
    });
  };

  const handleResetLayout = () => {
    setPositions({});
    try {
      localStorage.removeItem("plasma-workspace-layout");
    } catch (e) {}
  };

  // Re-bind interactive controllers whenever the view is mounted/switched
  useEffect(() => {
    const timer = setTimeout(() => {
      // 1. Cosmic gravitational particle field
      if (typeof window.initBackgroundAnimations === "function") {
        window.initBackgroundAnimations();
      }

      // 2. Interactive Quantum Kinetic Logo
      if (typeof window.initLogoAnimation === "function") {
        window.initLogoAnimation();
      }

      // 3. Hero Developer Terminal (EXCEPTED from plasma, standalone)
      if (typeof window.initTerminal === "function") {
        window.initTerminal();
      }

      // 4. GitHub activity feed
      if (typeof window.initGitHubActivity === "function") {
        window.initGitHubActivity();
      }

      // 5. Blog Activity & Horizontal Carousel (EXCEPTED from plasma, standalone)
      const blogActivity = typeof window.initBlogActivity === "function"
        ? window.initBlogActivity()
        : null;

      if (typeof window.initBlogHorizontalScroll === "function") {
        window.initBlogHorizontalScroll({ activityController: blogActivity });
      }

      // 6. 3D Flipbook Education Timeline (EXCEPTED from plasma, standalone)
      if (typeof window.initBookEducation === "function") {
        window.initBookEducation();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [viewMode]);

  // If in dedicated workspace dashboard mode, render Workspace component
  if (viewMode === "workspace") {
    return (
      <div className="plasma-app-root">
        <Workspace
          panels={defaultHeroPanels}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      </div>
    );
  }

  // Portfolio Page View with Plasma UI on all hero sections EXCEPT terminal, blogs, and education book
  const heroIntroPanel = defaultHeroPanels.find((p) => p.id === "hero-intro");
  const githubPanel = defaultHeroPanels.find((p) => p.id === "github-activity");
  const freelanceServicesPanel = defaultHeroPanels.find((p) => p.id === "freelance-services");
  const freelanceContactPanel = defaultHeroPanels.find((p) => p.id === "freelance-contact");
  const connectPanel = defaultHeroPanels.find((p) => p.id === "connect");

  return (
    <>
      {/* =====================================================
           HEADER / SITE NAVIGATION (Standard HTML Header - No Plasma UI)
           ===================================================== */}
      <header className="fixed top-0 inset-x-0 z-50 h-20 backdrop-blur-xl bg-slate-950/75 border-b border-slate-800/60 transition-all duration-300 site-header">
        <HeaderContent
          mood={mood}
          setMood={setMood}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onResetLayout={handleResetLayout}
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

      {/* =====================================================
           MAIN CONTENT
           ===================================================== */}
      <main id="main-content" className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 flex flex-col gap-24 sm:gap-32 pt-28 pb-20">

        {/* =================================================
             HERO SECTION:
             - Left: Hero Intro Panel (PLASMA UI, DRAGGABLE)
             - Right: Terminal (EXCEPTED: STANDALONE DOM)
             ================================================= */}
        <section id="hero" className="hero min-h-[calc(100vh-7rem)] flex items-center">
          <div className="hero-inner w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

            {/* Left Column: Hero Intro as Liquid Plasma Panel */}
            <Plasma
              key="hero-intro"
              draggable
              padding={20}
              offset={positions["hero-intro"] || { x: 0, y: 0 }}
              onDragEnd={(o) => savePosition("hero-intro", o)}
              className="hero-intro lg:col-span-7 flex flex-col items-start plasma-hero-panel rounded-2xl border border-slate-800/60 backdrop-blur-md transition-shadow duration-300"
            >
              <PanelContent panel={heroIntroPanel} />
            </Plasma>

            {/* Right Column: Interactive Terminal (EXCEPTED FROM PLASMA) */}
            <div className="hero-terminal lg:col-span-5 w-full max-w-lg mx-auto lg:max-w-none">
              <div
                id="terminal"
                className="terminal terminal-card"
                aria-label="Interactive terminal"
              >
                <div className="terminal-header">
                  <span className="terminal-title">krishnang.dev ~ zsh</span>
                </div>

                <div className="terminal-body">
                  <div
                    id="terminal-output"
                    className="terminal-output"
                    aria-live="polite"
                    aria-atomic="false"
                  ></div>

                  <form
                    id="terminal-form"
                    className="terminal-input-line"
                  >
                    <span
                      className="terminal-prompt terminal-prompt-text"
                      aria-hidden="true"
                    >
                      &gt;
                    </span>

                    <input
                      id="terminal-input"
                      className="terminal-input"
                      type="text"
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      aria-label="Terminal command"
                      placeholder="Type 'help'..."
                    />
                  </form>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* =================================================
             ACTIVITY SECTION:
             - Left: GitHub Activity (PLASMA UI, DRAGGABLE)
             - Right: Blog Activity (EXCEPTED: READ MY WRITING)
             ================================================= */}
        <section id="activity" className="activity scroll-mt-24 pt-8">
          <div className="section-inner space-y-10">

            <header className="section-header">
              <p className="section-label text-xs font-mono font-semibold uppercase tracking-widest text-purple-300 mb-2">
                Activity
              </p>
              <h2 className="section-title text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
                What I&apos;ve been building.
              </h2>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">

              {/* GitHub Feed Card: Liquid Plasma Panel */}
              <Plasma
                key="github-activity"
                draggable
                padding={20}
                offset={positions["github-activity"] || { x: 0, y: 0 }}
                onDragEnd={(o) => savePosition("github-activity", o)}
                className="activity-block activity-github plasma-hero-panel rounded-2xl border border-slate-800/60 backdrop-blur-md shadow-xl flex flex-col"
              >
                <PanelContent panel={githubPanel} />
              </Plasma>

              {/* Writing Feed Card: EXCEPTED (READ MY WRITING) */}
              <div className="activity-block activity-blog p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-md shadow-xl flex flex-col">
                <header className="activity-block-header flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                    <h3 className="text-sm font-mono font-semibold text-slate-200">Recent Writing</h3>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-500/20">
                    Essays &amp; Notes
                  </span>
                </header>

                <div
                  id="blog-activity"
                  className="blog-activity flex-1"
                  aria-live="polite"
                ></div>
              </div>

            </div>

          </div>
        </section>

        {/* =================================================
             BLOGS SECTION: (EXCEPTED FROM PLASMA UI)
             Horizontal Carousel: "Read My Writing (Blog Posts)"
             ================================================= */}
        <section id="blogs" className="blogs scroll-mt-24 pt-8">
          <div className="section-inner space-y-8">

            <header className="section-header flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="section-label text-xs font-mono font-semibold uppercase tracking-widest text-purple-300 mb-2">
                  Writing
                </p>
                <h2 className="section-title text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
                  Things I&apos;ve written.
                </h2>
              </div>

              <p className="text-sm text-slate-400 max-w-sm">
                Technical explorations on systems programming, artificial intelligence workflows, and internet architecture.
              </p>
            </header>

            {/* Carousel Browser */}
            <div id="blog-browser" className="blog-browser" data-blog-scroll>

              <button
                type="button"
                id="blog-prev"
                className="blog-nav blog-nav-prev blog-scroll-prev"
                aria-label="Previous article"
                data-blog-prev
              >
                ←
              </button>

              <div
                className="blog-scroll-container"
                aria-label="Blog articles"
              >
                <div
                  id="blog-track"
                  className="blog-track blog-cards-track"
                  data-blog-track
                ></div>
              </div>

              <button
                type="button"
                id="blog-next"
                className="blog-nav blog-nav-next blog-scroll-next"
                aria-label="Next article"
                data-blog-next
              >
                →
              </button>

            </div>

          </div>
        </section>

        {/* =================================================
             FREELANCING / SERVICES SECTION: (PLASMA UI)
             - Services Matrix: Liquid Plasma Panel
             - Contact CTA Card: Liquid Plasma Panel
             ================================================= */}
        <section id="freelance" className="freelancing freelance scroll-mt-24 pt-8" data-section="freelancing">
          <span id="freelancing" className="section-anchor sr-only" aria-hidden="true"></span>

          <div className="section-inner space-y-10">

            <header className="section-header">
              <p className="section-label text-xs font-mono font-semibold uppercase tracking-widest text-purple-300 mb-2">
                Freelancing
              </p>
              <h2 className="section-title text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
                Let&apos;s build something.
              </h2>
            </header>

            <div className="freelancing-content grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

              {/* Left: Services Matrix (PLASMA UI, DRAGGABLE) */}
              <Plasma
                key="freelance-services"
                draggable
                padding={20}
                offset={positions["freelance-services"] || { x: 0, y: 0 }}
                onDragEnd={(o) => savePosition("freelance-services", o)}
                className="freelancing-services lg:col-span-7 plasma-hero-panel rounded-2xl border border-slate-800/60 backdrop-blur-md shadow-xl flex flex-col justify-between"
              >
                <PanelContent panel={freelanceServicesPanel} />
              </Plasma>

              {/* Right: Direct CTA Card (PLASMA UI, DRAGGABLE) */}
              <Plasma
                key="freelance-contact"
                draggable
                padding={20}
                offset={positions["freelance-contact"] || { x: 0, y: 0 }}
                onDragEnd={(o) => savePosition("freelance-contact", o)}
                className="freelancing-contact lg:col-span-5 plasma-hero-panel rounded-2xl border border-cyan-500/30 backdrop-blur-md shadow-2xl flex flex-col justify-center items-start gap-4 relative overflow-hidden"
              >
                <PanelContent panel={freelanceContactPanel} />
              </Plasma>

            </div>

          </div>
        </section>

        {/* =================================================
             EDUCATION SECTION: (EXCEPTED FROM PLASMA UI)
             Scroll-Driven 3D Interactive Flipbook (book-education.js)
             ================================================= */}
        <section
          id="education"
          className="education education-section scroll-mt-24 pt-8"
          data-education-section
        >
          <div className="section-inner space-y-10">

            <header className="section-header">
              <p className="section-label text-xs font-mono font-semibold uppercase tracking-widest text-purple-300 mb-2">
                Education
              </p>
              <h2 className="section-title text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
                The road so far.
              </h2>
            </header>

            <div
              className="education-book"
              data-education-book
              aria-label="Education timeline"
            >
              <div className="book" role="group" aria-label="Interactive education book">

                <button className="book-cover" data-book-cover type="button" aria-expanded="false" aria-label="Open education book"></button>

                <div className="book-pages" data-book-pages>

                  {/* Page 1: Class 10 */}
                  <article
                    className="book-page education-page"
                    data-page="1"
                    data-education-page="1"
                  >
                    <div className="book-page-content text-left space-y-2">
                      <span className="text-xs font-mono text-cyan-400 font-semibold uppercase tracking-wider">Foundation</span>
                      <h3 className="text-2xl sm:text-3xl font-bold text-white">Class 10</h3>
                      <p className="text-sm text-slate-300">Secondary School Education</p>
                      <p className="text-xs text-slate-400 mt-2">Built foundations in mathematics, physical sciences, and introductory computational logic.</p>
                    </div>
                  </article>

                  {/* Page 2: Class 12 */}
                  <article
                    className="book-page education-page"
                    data-page="2"
                    data-education-page="2"
                  >
                    <div className="book-page-content text-left space-y-2">
                      <span className="text-xs font-mono text-cyan-400 font-semibold uppercase tracking-wider">Senior School</span>
                      <h3 className="text-2xl sm:text-3xl font-bold text-white">Class 12</h3>
                      <p className="text-sm text-slate-300">Senior Secondary Education</p>
                      <p className="text-xs text-slate-400 mt-2">Non-Medical Sciences (PCM) with Computer Science. Deep focus on algorithms, problem-solving, and calculus.</p>
                    </div>
                  </article>

                  {/* Page 3: Chitkara University */}
                  <article
                    className="book-page education-page"
                    data-page="3"
                    data-education-page="3"
                  >
                    <div className="book-page-content text-left space-y-2">
                      <span className="text-xs font-mono text-cyan-400 font-semibold uppercase tracking-wider">Undergraduate</span>
                      <h3 className="text-2xl sm:text-3xl font-bold text-white">Chitkara University</h3>
                      <p className="text-sm text-slate-300">B.Tech. CSE — AI &amp; ML Program</p>
                      <p className="text-xs text-slate-400 mt-2">Core study in data structures, algorithms, neural architectures, distributed computing, and machine learning models.</p>
                    </div>
                  </article>

                  {/* Page 4: Technical Specializations */}
                  <article
                    className="book-page education-page"
                    data-page="4"
                    data-education-page="4"
                  >
                    <div className="book-page-content text-left space-y-2">
                      <span className="text-xs font-mono text-cyan-400 font-semibold uppercase tracking-wider">Focus Areas</span>
                      <h3 className="text-2xl sm:text-3xl font-bold text-white">Specializations</h3>
                      <p className="text-sm text-slate-300">Systems &amp; Agentic AI</p>
                      <p className="text-xs text-slate-400 mt-2">High-performance tooling in Rust and Go, local LLM orchestration, Linux system tuning, and modern web architectures.</p>
                    </div>
                  </article>

                </div>

              </div>

              <div className="book-controls" data-book-controls>
                <button className="book-control" type="button" data-book-previous aria-label="Previous page">← Previous</button>
                <span className="book-status" data-book-status aria-live="polite">Closed</span>
                <button className="book-control" type="button" data-book-next aria-label="Next page">Next →</button>
              </div>
            </div>

          </div>
        </section>

        {/* =================================================
             CONNECT / SOCIAL SECTION: (PLASMA UI, DRAGGABLE)
             ================================================= */}
        <section id="connect" className="connect scroll-mt-24 pt-8">
          <div className="section-inner space-y-8">
            <Plasma
              key="connect"
              draggable
              padding={20}
              offset={positions["connect"] || { x: 0, y: 0 }}
              onDragEnd={(o) => savePosition("connect", o)}
              className="connect-card-plasma plasma-hero-panel rounded-2xl border border-slate-800/60 backdrop-blur-md shadow-xl"
            >
              <PanelContent panel={connectPanel} />
            </Plasma>
          </div>
        </section>

      </main>

      {/* =====================================================
           FOOTER
           ===================================================== */}
      <footer className="site-footer border-t border-slate-800/80 bg-slate-950/90 py-8 relative z-10">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-400">
          <p>Designed and built by Krishnang Pandey.</p>

          <div className="flex items-center gap-6">
            <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              Plasma UI Enabled
            </span>
            <a href="#hero" className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors">
              Back to top ↑
            </a>
          </div>
        </div>
      </footer>
    </PlasmaProvider>
  </>
  );
}

export default App;
