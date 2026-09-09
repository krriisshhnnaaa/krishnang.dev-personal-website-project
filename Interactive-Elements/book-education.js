/**
 * ==============================================================================
 * book-education.js — Interactive Scroll-Driven Education Book Controller
 * ==============================================================================
 * 
 * Functional Scope & Architectural Distinction (per instructions):
 * - Education section
 *         ↓
 *   scroll-driven interaction
 *         ↓
 *   animated book opens
 *         ↓
 *   page 1 → Class 10
 *   page 2 → Class 12
 *   page 3 → College
 *   page 4 → Course 1
 *   page 5 → Course 2
 *   ...
 * 
 * Architectural Separation:
 * - HTML: Contains education data / page structure (<article class="education-page">)
 * - CSS:  Controls book appearance, page styling, and opening/turning animations
 * - JS:   Controls scroll progress calculation, page transitions, and active page state
 * 
 * Algorithm & Architecture:
 * ├── configuration
 * ├── DOM resolution
 * ├── education-page discovery
 * ├── scroll-progress calculation
 * ├── page-state calculation
 * ├── active-page update
 * ├── scroll event management
 * ├── resize handling
 * └── initialization / cleanup
 * 
 * Core Contract:
 * - INPUT:  education section + page elements from HTML
 * - OUTPUT: scroll-controlled book/page state
 * - NO fetching, NO API calls, NO education database, NO hardcoded personal data.
 * ==============================================================================
 */

(function (global) {
    'use strict';

    // ==========================================================================
    // 1. Configuration
    // ==========================================================================

    /**
     * Default configuration for book-education module.
     */
    const DEFAULT_CONFIG = {
        // DOM Selectors
        sectionSelector: '#education, .education-section, [data-education-section]',
        bookSelector: '.education-book, [data-education-book]',
        pagesContainerSelector: '.book-pages, [data-book-pages]',
        pageSelector: '.education-page, [data-education-page]',
        coverSelector: '.book-cover, [data-book-cover]',

        // Book state CSS classes
        bookOpenClass: 'book--open',
        bookClosedClass: 'book--closed',
        bookOpeningClass: 'book--opening',

        // Page state CSS classes
        pageActiveClass: 'education-page--active',
        pageFlippedClass: 'education-page--flipped',

        // Universal state classes
        openClass: 'is-open',
        closedClass: 'is-closed',
        activeClass: 'is-active',
        flippedClass: 'is-flipped',

        // CSS custom properties
        cssVarProgress: '--education-progress',
        cssVarActivePage: '--education-active-page',
        cssVarPageCount: '--education-page-count',
        cssVarPageProgress: '--education-page-progress',

        // Optional callbacks
        onPageChange: null,
        onProgress: null
    };

    // ==========================================================================
    // 2. Math & Clamping Helpers
    // ==========================================================================

    /**
     * Clamps a numerical value between min and max boundaries.
     * 
     * @param {number} value - Input value
     * @param {number} min - Lower boundary
     * @param {number} max - Upper boundary
     * @returns {number} Clamped value
     */
    function clamp(value, min, max) {
        if (typeof value !== 'number' || Number.isNaN(value)) {
            return min;
        }
        return Math.min(Math.max(value, min), max);
    }

    // ==========================================================================
    // 3. Scroll-Progress Calculation
    // ==========================================================================

    /**
     * Calculates the normalized scroll progress (0 to 1) through the education section.
     * 
     * Algorithm (per instructions):
     * 1. Get education section's position relative to viewport (getBoundingClientRect)
     * 2. Calculate how far the user has progressed through the section
     * 3. Clamp progress between 0 and 1
     * 
     * For scroll-driven / sticky sections (section height > viewport):
     * - Progress = 0 when section top is at viewport top
     * - Progress = 1 when section bottom reaches viewport bottom
     * 
     * For standard sections (section height <= viewport):
     * - Progress = 0 when section enters bottom of viewport
     * - Progress = 1 when section exits top of viewport
     * 
     * @param {HTMLElement} section - The education section element
     * @param {number} [viewportHeight] - Height of viewport in pixels
     * @returns {number} Normalized progress value between 0 and 1
     */
    function calculateSectionProgress(section, viewportHeight) {
        if (!section || typeof section.getBoundingClientRect !== 'function') {
            return 0;
        }

        const rect = section.getBoundingClientRect();
        const vh = viewportHeight || (typeof window !== 'undefined' ? window.innerHeight : 0) || 1;
        const scrollDistance = rect.height - vh;

        let rawProgress;

        if (scrollDistance > 0) {
            // Extended / sticky scroll section
            rawProgress = -rect.top / scrollDistance;
        } else {
            // Standard section within single viewport
            const totalTravel = vh + rect.height;
            rawProgress = totalTravel > 0 ? (vh - rect.top) / totalTravel : 0;
        }

        return clamp(rawProgress, 0, 1);
    }

    // ==========================================================================
    // 4. Page-State Calculation
    // ==========================================================================

    /**
     * Converts normalized scroll progress into current page index.
     * 
     * Formula (per instructions):
     * pageProgress = 1 / numberOfPages
     * currentPage = floor(progress / pageProgress)
     * with proper clamping at the ends.
     * 
     * Behavior:
     * - progress = 0   → 0 (book closed)
     * - progress = 0.2 → 1 (page 1)
     * - progress = 0.4 → 2 (page 2)
     * - progress = 0.6 → 3 (page 3)
     * - progress = 0.8 → 4 (page 4)
     * - progress = 1.0 → final page (e.g. 5)
     * 
     * @param {number} progress - Normalized progress between 0 and 1
     * @param {number} pageCount - Total number of discovered pages
     * @returns {number} Current active page index (0 = closed, 1..pageCount = pages)
     */
    function calculatePageIndex(progress, pageCount) {
        if (!pageCount || pageCount <= 0) {
            return 0;
        }

        const clampedProgress = clamp(progress, 0, 1);
        const pageProgress = 1 / pageCount;

        if (pageProgress <= 0) {
            return 0;
        }

        // Add a small epsilon to safeguard against IEEE 754 floating point rounding
        // e.g. 0.6 / 0.2 equaling 2.9999999999999996 instead of 3
        const rawPage = Math.floor((clampedProgress / pageProgress) + 1e-9);
        return clamp(rawPage, 0, pageCount);
    }

    // ==========================================================================
    // 5. BookEducationController Class
    // ==========================================================================

    class BookEducationController {
        /**
         * @param {Object|string} [options] Configuration overrides or section selector
         */
        constructor(options = {}) {
            if (typeof options === 'string') {
                options = { sectionSelector: options };
            }

            this.options = { ...DEFAULT_CONFIG, ...options };

            // DOM Elements
            this.section = null;
            this.book = null;
            this.pagesContainer = null;
            this.cover = null;
            this.pages = [];

            // Internal State (per instructions)
            this.state = {
                progress: 0,
                activePage: 0,
                pageCount: 0,
                initialized: false
            };

            // Event Listeners & Animation Frame handles
            this.scrollHandler = null;
            this.resizeHandler = null;
            this.rafId = null;
            this.isTicking = false;

            this.init();
        }

        /**
         * INITIALIZE (Algorithm per instructions)
         * 1. Find education section
         * 2. Find book
         * 3. Find all book pages
         * 4. If required elements don't exist: exit gracefully
         * 5. Store page count
         * 6. Attach scroll listener
         * 7. Attach resize listener
         * 8. Calculate initial progress
         * 9. Update book state
         * 
         * @returns {boolean} True if successfully initialized, false if exited gracefully
         */
        init() {
            // 1. Resolve Education Section
            this.section = document.querySelector(this.options.sectionSelector);
            if (!this.section) {
                return false;
            }

            // 2. Resolve Book
            this.book = this.section.querySelector(this.options.bookSelector)
                || document.querySelector(this.options.bookSelector);
            if (!this.book) {
                return false;
            }

            // 3. Resolve Book Cover (optional)
            this.cover = this.book.querySelector(this.options.coverSelector)
                || this.section.querySelector(this.options.coverSelector);

            // 4. Resolve Pages Container (optional wrapper)
            this.pagesContainer = this.book.querySelector(this.options.pagesContainerSelector)
                || this.book;

            // 5. Discover all education pages dynamically
            const discoveredPages = this.book.querySelectorAll(this.options.pageSelector);
            if (!discoveredPages || discoveredPages.length === 0) {
                // Graceful exit if no pages found
                return false;
            }

            this.pages = Array.from(discoveredPages);
            this.state.pageCount = this.pages.length;

            // Prevent duplicate initialization on the same section
            if (this.section._bookEducationInitialized) {
                return true;
            }
            this.section._bookEducationInitialized = true;

            // Index pages with metadata attributes
            this.pages.forEach((pageEl, index) => {
                pageEl.setAttribute('data-page-index', String(index));
                pageEl.setAttribute('data-page-number', String(index + 1));
            });

            // 6 & 7. Attach scroll and resize listeners
            this.setupListeners();

            // 8 & 9. Calculate initial progress and update book state
            this.updateState();

            this.state.initialized = true;
            return true;
        }

        /**
         * Attaches scroll and resize listeners with requestAnimationFrame throttling.
         */
        setupListeners() {
            this.scrollHandler = () => {
                if (!this.isTicking) {
                    this.rafId = window.requestAnimationFrame(() => {
                        this.onScroll();
                        this.isTicking = false;
                    });
                    this.isTicking = true;
                }
            };

            this.resizeHandler = () => {
                if (!this.isTicking) {
                    this.rafId = window.requestAnimationFrame(() => {
                        this.onScroll();
                        this.isTicking = false;
                    });
                    this.isTicking = true;
                }
            };

            window.addEventListener('scroll', this.scrollHandler, { passive: true });
            window.addEventListener('resize', this.resizeHandler, { passive: true });
        }

        /**
         * ON SCROLL (Algorithm per instructions)
         * 1. Get education section's position relative to viewport
         * 2. Calculate: how far the user has progressed through the section
         * 3. Clamp progress between 0 and 1
         * 4. Convert progress into page index
         * 5. If page changed:
         *      deactivate previous page
         *      activate new page
         *      update book animation state
         * 6. Update CSS variables
         */
        onScroll() {
            this.updateState();
        }

        /**
         * Computes current scroll progress and updates internal state, DOM classes, and CSS variables.
         */
        updateState() {
            if (!this.section || !this.book || this.pages.length === 0) {
                return;
            }

            const viewportHeight = window.innerHeight
                || (document.documentElement && document.documentElement.clientHeight)
                || 1;

            // 1. Calculate section scroll progress & clamp between 0 and 1
            const progress = calculateSectionProgress(this.section, viewportHeight);
            this.state.progress = progress;

            // 2. Convert progress into page index
            const newPage = calculatePageIndex(progress, this.state.pageCount);
            const previousPage = this.state.activePage;
            const pageChanged = (newPage !== previousPage);

            this.state.activePage = newPage;

            // 3. Update CSS variables
            this.updateCssVariables(progress, newPage);

            // 4. Update book and pages DOM state
            this.updateDomState(newPage, previousPage, pageChanged);

            // 5. Notify callbacks if provided
            if (pageChanged && typeof this.options.onPageChange === 'function') {
                const activeEl = newPage > 0 ? this.pages[newPage - 1] : null;
                this.options.onPageChange(newPage, previousPage, activeEl);
            }

            if (typeof this.options.onProgress === 'function') {
                this.options.onProgress(progress, newPage);
            }
        }

        /**
         * Updates CSS variables on the section and book element.
         * Exposes --education-progress, --education-active-page, --education-page-count
         * allowing CSS to perform the visual transformations and rotations.
         * 
         * @param {number} progress
         * @param {number} activePage
         */
        updateCssVariables(progress, activePage) {
            const formattedProgress = progress.toFixed(4);
            const pageProgress = this.state.pageCount > 0
                ? ((progress * this.state.pageCount) % 1).toFixed(4)
                : '0';

            const targets = [this.section, this.book].filter(Boolean);

            targets.forEach((el) => {
                el.style.setProperty(this.options.cssVarProgress, formattedProgress);
                el.style.setProperty(this.options.cssVarActivePage, String(activePage));
                el.style.setProperty(this.options.cssVarPageCount, String(this.state.pageCount));
                el.style.setProperty(this.options.cssVarPageProgress, String(pageProgress));
            });
        }

        /**
         * Updates classes and attributes on the book and all discovered page elements.
         * 
         * @param {number} activePage - Current active page (0 = closed, 1..N = page)
         * @param {number} previousPage - Previous active page
         * @param {boolean} pageChanged - Whether active page index changed
         */
        updateDomState(activePage, previousPage, pageChanged) {
            const isBookOpen = (activePage > 0);

            // 1. Update Book Container State
            this.book.classList.toggle(this.options.bookOpenClass, isBookOpen);
            this.book.classList.toggle(this.options.bookClosedClass, !isBookOpen);
            this.book.classList.toggle(this.options.openClass, isBookOpen);
            this.book.classList.toggle(this.options.closedClass, !isBookOpen);

            this.book.setAttribute('data-state', isBookOpen ? 'open' : 'closed');
            this.book.setAttribute('data-active-page', String(activePage));

            // 2. Update Book Cover (if present)
            if (this.cover) {
                this.cover.classList.toggle('book-cover--open', isBookOpen);
                this.cover.classList.toggle('book-cover--closed', !isBookOpen);
                this.cover.classList.toggle(this.options.openClass, isBookOpen);
                this.cover.classList.toggle(this.options.closedClass, !isBookOpen);
                this.cover.setAttribute('data-state', isBookOpen ? 'open' : 'closed');
            }

            // 3. Update Individual Pages
            // Pages are 0-indexed in array; page numbers are 1-indexed (1..pageCount)
            this.pages.forEach((pageEl, index) => {
                const pageNumber = index + 1;

                if (pageNumber === activePage) {
                    // Current active page
                    pageEl.classList.add(this.options.pageActiveClass, this.options.activeClass);
                    pageEl.classList.remove(this.options.pageFlippedClass, this.options.flippedClass);
                    pageEl.setAttribute('data-state', 'active');
                    pageEl.setAttribute('aria-current', 'page');
                } else if (pageNumber < activePage) {
                    // Previously turned / flipped page
                    pageEl.classList.remove(this.options.pageActiveClass, this.options.activeClass);
                    pageEl.classList.add(this.options.pageFlippedClass, this.options.flippedClass);
                    pageEl.setAttribute('data-state', 'flipped');
                    pageEl.removeAttribute('aria-current');
                } else {
                    // Upcoming / unflipped page
                    pageEl.classList.remove(
                        this.options.pageActiveClass,
                        this.options.activeClass,
                        this.options.pageFlippedClass,
                        this.options.flippedClass
                    );
                    pageEl.setAttribute('data-state', 'upcoming');
                    pageEl.removeAttribute('aria-current');
                }
            });
        }

        /**
         * Programmatically navigates or sets the active page.
         * 
         * @param {number} pageNumber - Target page number (0 = closed, 1..pageCount)
         */
        setPage(pageNumber) {
            const targetPage = clamp(Math.round(pageNumber), 0, this.state.pageCount);
            const pageProgress = this.state.pageCount > 0 ? (1 / this.state.pageCount) : 0;
            const targetProgress = targetPage === 0 ? 0 : clamp(targetPage * pageProgress, 0, 1);

            this.state.progress = targetProgress;
            const previousPage = this.state.activePage;
            const pageChanged = (targetPage !== previousPage);
            this.state.activePage = targetPage;

            this.updateCssVariables(targetProgress, targetPage);
            this.updateDomState(targetPage, previousPage, pageChanged);

            if (pageChanged && typeof this.options.onPageChange === 'function') {
                const activeEl = targetPage > 0 ? this.pages[targetPage - 1] : null;
                this.options.onPageChange(targetPage, previousPage, activeEl);
            }
        }

        /**
         * Returns a snapshot copy of the internal state.
         * 
         * @returns {{ progress: number, activePage: number, pageCount: number, initialized: boolean }}
         */
        getState() {
            return { ...this.state };
        }

        /**
         * Cleans up event listeners, cancels animation frames, and resets initialization flags.
         */
        destroy() {
            if (this.scrollHandler) {
                window.removeEventListener('scroll', this.scrollHandler);
                this.scrollHandler = null;
            }

            if (this.resizeHandler) {
                window.removeEventListener('resize', this.resizeHandler);
                this.resizeHandler = null;
            }

            if (this.rafId) {
                window.cancelAnimationFrame(this.rafId);
                this.rafId = null;
            }

            if (this.section) {
                delete this.section._bookEducationInitialized;
            }

            this.state.initialized = false;
        }
    }

    // ==========================================================================
    // 6. Initialization & Export
    // ==========================================================================

    /**
     * Factory function to initialize the Book Education Controller.
     * Exposed for main.js lifecycle orchestration.
     * 
     * @param {Object|string} [options] Optional configuration overrides or selector
     * @returns {BookEducationController|null} Controller instance or null if elements not found
     */
    function initBookEducation(options) {
        const controller = new BookEducationController(options);
        return controller.state.initialized ? controller : null;
    }

    // Expose globally on window
    if (typeof global !== 'undefined') {
        global.initBookEducation = initBookEducation;
        global.BookEducationController = BookEducationController;
    }

    // CommonJS support for testing / module environments
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            initBookEducation,
            BookEducationController,
            clamp,
            calculateSectionProgress,
            calculatePageIndex
        };
    }

})(typeof window !== 'undefined' ? window : this);
