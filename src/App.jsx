import React, { useState, useEffect } from "react";
import { PlasmaProvider, Plasma } from "@cruxgarden/plasma-ui";
import DriftWall from "./DriftWall";
import HoldToConfirm from "./HoldToConfirm";
import useScramble from "./useScramble";
import RadialMenu from "./RadialMenu";
import {
  Workspace,
  PanelContent,
  defaultHeroPanels,
  loadSavedPositions,
  persistPositions
} from "./Workspace";

const driftWallItems = [
  { image: 'https://picsum.photos/id/1015/600/400', title: 'Peaks', href: 'https://example.com/one' },
  { image: 'https://picsum.photos/id/1025/600/400', title: 'Pup', href: 'https://example.com/two' },
  { image: 'https://picsum.photos/id/1039/600/400', title: 'Falls', href: 'https://example.com/three' },
  { image: 'https://picsum.photos/id/1043/600/400', title: 'Forest', href: 'https://example.com/four' },
  { image: 'https://picsum.photos/id/1044/600/400', title: 'Coast', href: 'https://example.com/five' },
  { image: 'https://picsum.photos/id/1050/600/400', title: 'Mountain', href: 'https://example.com/six' },
  { image: 'https://picsum.photos/id/1062/600/400', title: 'Ocean', href: 'https://example.com/seven' },
  { image: 'https://picsum.photos/id/1069/600/400', title: 'Valley', href: 'https://example.com/eight' },
  { image: 'https://picsum.photos/id/1074/600/400', title: 'Canyon', href: 'https://example.com/nine' },
  { image: 'https://picsum.photos/id/1080/600/400', title: 'Sky', href: 'https://example.com/ten' },
  { image: 'https://picsum.photos/id/1084/600/400', title: 'Sunrise', href: 'https://example.com/eleven' },
  { image: 'https://picsum.photos/id/106/600/400', title: 'Flower', href: 'https://example.com/twelve' }
];

export function App() {
  const [positions, setPositions] = useState(() => loadSavedPositions());
  const [mood, setMood] = useState("tidal");
  const [viewMode, setViewMode] = useState("page"); // "page" | "workspace"
  const [scrambleName, playScramble] = useScramble("KRISHNANG PANDEY");

  useEffect(() => {
    playScramble();
  }, [playScramble]);

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
      // 1. Cosmic gravitational particle field
      if (typeof window.initBackgroundAnimations === "function") {
        window.initBackgroundAnimations();
      }

      // 2. Hero Developer Terminal (EXCEPTED from plasma, standalone)
      if (typeof window.initTerminal === "function") {
        window.initTerminal();
      }

      // 3. GitHub activity feed
      if (typeof window.initGitHubActivity === "function") {
        window.initGitHubActivity();
      }

      // 4. Blog Activity & Horizontal Carousel (EXCEPTED from plasma, standalone)
      const blogActivity = typeof window.initBlogActivity === "function"
        ? window.initBlogActivity()
        : null;

      if (typeof window.initBlogHorizontalScroll === "function") {
        window.initBlogHorizontalScroll({ activityController: blogActivity });
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
        <RadialMenu />
      </div>
    );
  }

  // Portfolio Page View with Plasma UI on all hero sections EXCEPT terminal and blogs
  const githubPanel = defaultHeroPanels.find((p) => p.id === "github-activity");
  const freelanceServicesPanel = defaultHeroPanels.find((p) => p.id === "freelance-services");
  const freelanceContactPanel = defaultHeroPanels.find((p) => p.id === "freelance-contact");

  return (
    <>
      <PlasmaProvider
        mood={mood}
        ground="clear"
        background="bg.jpg"
        zIndex={1}
        theme="dark"
        radius={22}
        blend={24}
        grid={24}
        grain={0}
        glow={0.6}
      >

      {/* =====================================================
           DRIFT WALL (React Bits - Positioned above all other elements)
           ===================================================== */}
      <section id="drift-wall-showcase" className="relative z-30 w-full overflow-hidden border-b border-slate-800/60 shadow-2xl bg-slate-950/40">
        <div style={{ height: 600 }}>
          <DriftWall
            items={driftWallItems}
            columns={4}
            tileWidth={200}
            tileHeight={132}
            gap={18}
            tilt={16}
            turn={-14}
            perspective={1200}
            depth={120}
            speed={42}
            direction="up"
            variance={0.45}
            parallax={0.6}
            lift={64}
            fade={0.6}
            dim={0.55}
            overlayColor="#060010"
          />
        </div>
      </section>

      {/* =====================================================
           MAIN CONTENT
           ===================================================== */}
      <main id="main-content" className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 flex flex-col gap-24 sm:gap-32 pt-12 sm:pt-16 pb-20">

        {/* =================================================
             STANDALONE DECODED SCRAMBLE & RESUME BUTTON
             No section ID hero, No Plasma UI elements
             Text align - 8px from right as per agy.info
             ================================================= */}
        <div className="w-full flex flex-col gap-10">
          <div className="w-full" style={{ textAlign: "right", paddingRight: "8px" }}>
            <h1
              className="scramble text-5xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight cursor-pointer select-none text-transparent bg-gradient-to-r from-white via-slate-100 to-purple-300 bg-clip-text hover:from-cyan-200 hover:via-white hover:to-purple-200 transition-all duration-500"
              style={{ textAlign: "right", paddingRight: "8px" }}
              onClick={playScramble}
              onMouseEnter={playScramble}
              title="Click or hover to decode"
            >
              {scrambleName}
            </h1>
          </div>

          {/* Standalone circular hold-to-confirm button above activity hero */}
          <div className="flex justify-center">
            <HoldToConfirm onConfirm={handleDownloadResume} ms={800} />
          </div>
        </div>

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
            <a href="#main-content" className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors">
              Back to top ↑
            </a>
          </div>
        </div>
      </footer>
    </PlasmaProvider>
    <RadialMenu />
  </>
  );
}

export default App;
