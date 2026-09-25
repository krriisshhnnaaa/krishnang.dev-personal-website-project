(function (global) {
    'use strict';

    const DEFAULT_CONFIG = {
        sectionSelector: '#education, .education-section, [data-education-section]',
        bookSelector: '.book',
        pageSelector: '.education-page, [data-education-page]',
        coverSelector: '.book-cover, [data-book-cover]',
        previousSelector: '[data-book-previous]',
        nextSelector: '[data-book-next]',
        statusSelector: '[data-book-status]',
        bookOpenClass: 'book--open',
        bookClosedClass: 'book--closed',
        pageActiveClass: 'education-page--active',
        pageFlippedClass: 'education-page--flipped',
        onPageChange: null
    };

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    class BookEducationController {
        constructor(options = {}) {
            this.options = { ...DEFAULT_CONFIG, ...options };
            this.section = null;
            this.book = null;
            this.cover = null;
            this.pages = [];
            this.previousButton = null;
            this.nextButton = null;
            this.status = null;
            this.state = { activePage: 0, pageCount: 0, initialized: false };
            this.handlers = {};
            this.init();
        }

        init() {
            this.section = document.querySelector(this.options.sectionSelector);
            if (!this.section) return false;

            this.book = this.section.querySelector(this.options.bookSelector);
            this.cover = this.section.querySelector(this.options.coverSelector);
            this.pages = Array.from(this.section.querySelectorAll(this.options.pageSelector));
            this.previousButton = this.section.querySelector(this.options.previousSelector);
            this.nextButton = this.section.querySelector(this.options.nextSelector);
            this.status = this.section.querySelector(this.options.statusSelector);

            if (!this.book || !this.cover || this.pages.length === 0 || this.section._bookEducationInitialized) return false;

            this.section._bookEducationInitialized = true;
            this.state.pageCount = this.pages.length;
            this.book.setAttribute('tabindex', '0');
            this.pages.forEach((page, index) => page.setAttribute('data-page-number', String(index + 1)));

            this.handlers.open = () => this.setPage(1);
            this.handlers.previous = () => this.previousPage();
            this.handlers.next = () => this.nextPage();
            this.handlers.bookClick = (event) => this.handleBookClick(event);
            this.handlers.keydown = (event) => this.handleKeydown(event);

            this.cover.addEventListener('click', this.handlers.open);
            this.previousButton?.addEventListener('click', this.handlers.previous);
            this.nextButton?.addEventListener('click', this.handlers.next);
            this.book.addEventListener('click', this.handlers.bookClick);
            this.book.addEventListener('keydown', this.handlers.keydown);

            this.render();
            this.state.initialized = true;
            return true;
        }

        handleBookClick(event) {
            if (event.target.closest(this.options.coverSelector)) return;
            if (this.state.activePage === 0) return this.setPage(1);

            const bounds = this.book.getBoundingClientRect();
            const clickedRightSide = event.clientX >= bounds.left + (bounds.width / 2);
            clickedRightSide ? this.nextPage() : this.previousPage();
        }

        handleKeydown(event) {
            if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.state.activePage === 0 ? this.setPage(1) : this.nextPage();
            } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                this.previousPage();
            } else if (event.key === 'Home') {
                event.preventDefault();
                this.setPage(1);
            } else if (event.key === 'End') {
                event.preventDefault();
                this.setPage(this.state.pageCount);
            }
        }

        nextPage() {
            this.setPage(Math.min(this.state.activePage + 1, this.state.pageCount));
        }

        previousPage() {
            this.setPage(Math.max(this.state.activePage - 1, 0));
        }

        setPage(pageNumber) {
            const nextPage = clamp(Math.round(pageNumber), 0, this.state.pageCount);
            const previousPage = this.state.activePage;
            if (nextPage === previousPage) return;

            this.state.activePage = nextPage;
            this.render();
            if (typeof this.options.onPageChange === 'function') {
                this.options.onPageChange(nextPage, previousPage, nextPage ? this.pages[nextPage - 1] : null);
            }
        }

        render() {
            const { activePage, pageCount } = this.state;
            const isOpen = activePage > 0;

            this.book.classList.toggle(this.options.bookOpenClass, isOpen);
            this.book.classList.toggle(this.options.bookClosedClass, !isOpen);
            this.book.setAttribute('data-state', isOpen ? 'open' : 'closed');
            this.book.setAttribute('aria-label', isOpen
                ? `Education book, page ${activePage} of ${pageCount}`
                : 'Education book, closed. Select to open.');
            this.cover.setAttribute('aria-expanded', String(isOpen));

            this.pages.forEach((page, index) => {
                const pageNumber = index + 1;
                const isActive = pageNumber === activePage;
                page.classList.toggle(this.options.pageActiveClass, isActive);
                page.classList.toggle(this.options.pageFlippedClass, pageNumber < activePage);
                page.style.zIndex = String(isActive ? pageCount + 1 : pageCount - index);
                page.setAttribute('aria-hidden', String(!isActive));
            });

            if (this.previousButton) this.previousButton.disabled = activePage === 0;
            if (this.nextButton) this.nextButton.disabled = activePage === pageCount;
            if (this.status) this.status.textContent = isOpen ? `Page ${activePage} of ${pageCount}` : 'Closed';
        }

        getState() {
            return { ...this.state };
        }

        destroy() {
            this.cover?.removeEventListener('click', this.handlers.open);
            this.previousButton?.removeEventListener('click', this.handlers.previous);
            this.nextButton?.removeEventListener('click', this.handlers.next);
            this.book?.removeEventListener('click', this.handlers.bookClick);
            this.book?.removeEventListener('keydown', this.handlers.keydown);
            if (this.section) delete this.section._bookEducationInitialized;
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
        module.exports = { initBookEducation, BookEducationController, clamp };
    }
})(typeof window !== 'undefined' ? window : this);
