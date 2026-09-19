(function (global) {
    'use strict';

    const DEFAULT_CONFIG = {
        sectionSelector: '#education, .education-section, [data-education-section]',
        bookSelector: '.education-book, [data-education-book]',
        pagesContainerSelector: '.book-pages, [data-book-pages]',
        pageSelector: '.education-page, [data-education-page]',
        coverSelector: '.book-cover, [data-book-cover]',

        bookOpenClass: 'book--open',
        bookClosedClass: 'book--closed',
        bookOpeningClass: 'book--opening',

        pageActiveClass: 'education-page--active',
        pageFlippedClass: 'education-page--flipped',

        openClass: 'is-open',
        closedClass: 'is-closed',
        activeClass: 'is-active',
        flippedClass: 'is-flipped',

        cssVarProgress: '--education-progress',
        cssVarActivePage: '--education-active-page',
        cssVarPageCount: '--education-page-count',
        cssVarPageProgress: '--education-page-progress',

        onPageChange: null,
        onProgress: null
    };

    function clamp(value, min, max) {
        if (typeof value !== 'number' || Number.isNaN(value)) {
            return min;
        }
        return Math.min(Math.max(value, min), max);
    }

    function calculateSectionProgress(section, viewportHeight) {
        if (!section || typeof section.getBoundingClientRect !== 'function') {
            return 0;
        }

        const rect = section.getBoundingClientRect();
        const vh = viewportHeight || (typeof window !== 'undefined' ? window.innerHeight : 0) || 1;
        const scrollDistance = rect.height - vh;

        let rawProgress;

        if (scrollDistance > 0) {
            rawProgress = -rect.top / scrollDistance;
        } else {
            const totalTravel = vh + rect.height;
            rawProgress = totalTravel > 0 ? (vh - rect.top) / totalTravel : 0;
        }

        return clamp(rawProgress, 0, 1);
    }

    function calculatePageIndex(progress, pageCount) {
        if (!pageCount || pageCount <= 0) {
            return 0;
        }

        const clampedProgress = clamp(progress, 0, 1);
        const pageProgress = 1 / pageCount;

        if (pageProgress <= 0) {
            return 0;
        }

        const rawPage = Math.floor((clampedProgress / pageProgress) + 1e-9);
        return clamp(rawPage, 0, pageCount);
    }

    class BookEducationController {
        constructor(options = {}) {
            if (typeof options === 'string') {
                options = { sectionSelector: options };
            }

            this.options = { ...DEFAULT_CONFIG, ...options };

            this.section = null;
            this.book = null;
            this.pagesContainer = null;
            this.cover = null;
            this.pages = [];

            this.state = {
                progress: 0,
                activePage: 0,
                pageCount: 0,
                initialized: false
            };

            this.scrollHandler = null;
            this.resizeHandler = null;
            this.rafId = null;
            this.isTicking = false;

            this.init();
        }

        init() {
            this.section = document.querySelector(this.options.sectionSelector);
            if (!this.section) {
                return false;
            }

            this.book = this.section.querySelector(this.options.bookSelector)
                || document.querySelector(this.options.bookSelector);
            if (!this.book) {
                return false;
            }

            this.cover = this.book.querySelector(this.options.coverSelector)
                || this.section.querySelector(this.options.coverSelector);

            this.pagesContainer = this.book.querySelector(this.options.pagesContainerSelector)
                || this.book;

            const discoveredPages = this.book.querySelectorAll(this.options.pageSelector);
            if (!discoveredPages || discoveredPages.length === 0) {
                return false;
            }

            this.pages = Array.from(discoveredPages);
            this.state.pageCount = this.pages.length;

            if (this.section._bookEducationInitialized) {
                return true;
            }
            this.section._bookEducationInitialized = true;

            this.pages.forEach((pageEl, index) => {
                pageEl.setAttribute('data-page-index', String(index));
                pageEl.setAttribute('data-page-number', String(index + 1));
            });

            this.setupListeners();

            this.updateState();

            this.state.initialized = true;
            return true;
        }

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

        onScroll() {
            this.updateState();
        }

        updateState() {
            if (!this.section || !this.book || this.pages.length === 0) {
                return;
            }

            const viewportHeight = window.innerHeight
                || (document.documentElement && document.documentElement.clientHeight)
                || 1;

            const progress = calculateSectionProgress(this.section, viewportHeight);
            this.state.progress = progress;

            const newPage = calculatePageIndex(progress, this.state.pageCount);
            const previousPage = this.state.activePage;
            const pageChanged = (newPage !== previousPage);

            this.state.activePage = newPage;

            this.updateCssVariables(progress, newPage);

            this.updateDomState(newPage, previousPage, pageChanged);

            if (pageChanged && typeof this.options.onPageChange === 'function') {
                const activeEl = newPage > 0 ? this.pages[newPage - 1] : null;
                this.options.onPageChange(newPage, previousPage, activeEl);
            }

            if (typeof this.options.onProgress === 'function') {
                this.options.onProgress(progress, newPage);
            }
        }

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

        updateDomState(activePage, previousPage, pageChanged) {
            const isBookOpen = (activePage > 0);

            this.book.classList.toggle(this.options.bookOpenClass, isBookOpen);
            this.book.classList.toggle(this.options.bookClosedClass, !isBookOpen);
            this.book.classList.toggle(this.options.openClass, isBookOpen);
            this.book.classList.toggle(this.options.closedClass, !isBookOpen);

            this.book.setAttribute('data-state', isBookOpen ? 'open' : 'closed');
            this.book.setAttribute('data-active-page', String(activePage));

            if (this.cover) {
                this.cover.classList.toggle('book-cover--open', isBookOpen);
                this.cover.classList.toggle('book-cover--closed', !isBookOpen);
                this.cover.classList.toggle(this.options.openClass, isBookOpen);
                this.cover.classList.toggle(this.options.closedClass, !isBookOpen);
                this.cover.setAttribute('data-state', isBookOpen ? 'open' : 'closed');
            }

            this.pages.forEach((pageEl, index) => {
                const pageNumber = index + 1;

                if (pageNumber === activePage) {
                    pageEl.classList.add(this.options.pageActiveClass, this.options.activeClass);
                    pageEl.classList.remove(this.options.pageFlippedClass, this.options.flippedClass);
                    pageEl.setAttribute('data-state', 'active');
                    pageEl.setAttribute('aria-current', 'page');
                } else if (pageNumber < activePage) {
                    pageEl.classList.remove(this.options.pageActiveClass, this.options.activeClass);
                    pageEl.classList.add(this.options.pageFlippedClass, this.options.flippedClass);
                    pageEl.setAttribute('data-state', 'flipped');
                    pageEl.removeAttribute('aria-current');
                } else {
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

        getState() {
            return { ...this.state };
        }

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

    function initBookEducation(options) {
        const controller = new BookEducationController(options);
        return controller.state.initialized ? controller : null;
    }

    if (typeof global !== 'undefined') {
        global.initBookEducation = initBookEducation;
        global.BookEducationController = BookEducationController;
    }

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
