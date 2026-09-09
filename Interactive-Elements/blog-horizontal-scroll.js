/**
 * ==============================================================================
 * blog-horizontal-scroll.js — Interactive Horizontal Blog Browser
 * ==============================================================================
 * 
 * Functional Scope & Architectural Distinction (per instructions):
 * - Does NOT fetch Markdown files or blog-index.json directly.
 * - Does NOT talk to Hygraph or GitHub.
 * - Consumes normalized blog post objects ({ title, date, description, cover, url })
 *   produced by the application data layer (e.g. activity-blog.js).
 * - Builds and manages the horizontal card track.
 * - Manages native horizontal scrolling (wheel/trackpad) and previous/next buttons.
 * - Automatically detects the active/most visible card via IntersectionObserver.
 * - Handles smooth scroll-into-view navigation.
 * - Renders accessible cards with cover images, titles, descriptions, and dates.
 * - Fully responsive with graceful lifecycle state management.
 * - Exposes initBlogHorizontalScroll() for main.js orchestration.
 * ==============================================================================
 */

(function (global) {
    'use strict';

    // ==========================================================================
    // 1. Configuration
    // ==========================================================================

    /**
     * Default CSS selectors for container, track, and navigation buttons.
     */
    const DEFAULT_CONFIG = {
        containerSelector: '#blog-browser, .blog-scroll-container, #blog-horizontal-scroll, [data-blog-scroll]',
        trackSelector: '.blog-track, .blog-cards-track, [data-blog-track]',
        prevButtonSelector: '.blog-scroll-prev, .blog-nav-btn--prev, #blog-prev, [data-blog-prev]',
        nextButtonSelector: '.blog-scroll-next, .blog-nav-btn--next, #blog-next, [data-blog-next]',
        emptyMessage: 'No blog posts available.'
    };

    // ==========================================================================
    // 2. Date Formatting Helper
    // ==========================================================================

    /**
     * Formats an ISO date or date string into readable format (e.g., "Sep 2, 2026").
     * Direct match for YYYY-MM-DD avoids local timezone offset drift.
     * 
     * @param {string} dateString
     * @returns {string}
     */
    function formatDate(dateString) {
        if (!dateString) return '';

        const trimmed = String(dateString).trim();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoMatch) {
            const year = parseInt(isoMatch[1], 10);
            const monthIndex = parseInt(isoMatch[2], 10) - 1;
            const day = parseInt(isoMatch[3], 10);
            if (monthIndex >= 0 && monthIndex < 12) {
                return `${months[monthIndex]} ${day}, ${year}`;
            }
        }

        const date = new Date(trimmed);
        if (Number.isNaN(date.getTime())) {
            return trimmed;
        }

        return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
    }

    // ==========================================================================
    // 3. Post Validation (Section 3)
    // ==========================================================================

    /**
     * Validates normalized post object.
     * Required fields:
     * - title
     * - url
     * Optional fields:
     * - date, description, cover
     * 
     * @param {Object} post
     * @returns {Object|null} Clean post object or null if invalid
     */
    function validatePost(post) {
        if (!post || typeof post !== 'object') {
            return null;
        }

        const title = (post.title || '').trim();
        const url = (post.url || '').trim();

        if (!title || !url) {
            return null;
        }

        return {
            title,
            url,
            date: (post.date || '').trim(),
            description: (post.description || '').trim(),
            cover: (post.cover || '').trim()
        };
    }

    // ==========================================================================
    // 4. Card Creation & Track Rendering (Section 4 & Section 5)
    // ==========================================================================

    /**
     * Creates a single interactive card element adhering to semantic accessibility.
     * 
     * Conceptual layout:
     * ┌───────────────────────────┐
     * │        COVER IMAGE        │
     * ├───────────────────────────┤
     * │ Title                     │
     * │ Description               │
     * │ Date                      │
     * └───────────────────────────┘
     * 
     * @param {Object} post - Validated normalized post object
     * @param {number} index - Position index in track
     * @returns {HTMLElement} The card element
     */
    function createCard(post, index) {
        const card = document.createElement('article');
        card.className = 'blog-card';
        card.setAttribute('data-index', String(index));
        card.setAttribute('data-url', post.url);
        card.setAttribute('role', 'group');
        card.setAttribute('aria-label', post.title);

        if (index === 0) {
            card.classList.add('active');
        }

        // Clickable wrapper navigating directly to post.url
        const link = document.createElement('a');
        link.className = 'blog-card-link';
        link.href = post.url;
        link.setAttribute('aria-label', `Read blog post: ${post.title}`);

        // 1. Cover Image (if cover exists)
        if (post.cover) {
            const coverWrap = document.createElement('div');
            coverWrap.className = 'blog-card-cover-wrap';

            const img = document.createElement('img');
            img.className = 'blog-card-cover';
            img.src = post.cover;
            img.alt = `${post.title} cover image`;
            img.loading = 'lazy';

            // Graceful fallback if image fails to load
            img.addEventListener('error', () => {
                coverWrap.classList.add('blog-card-cover-wrap--failed');
                img.style.display = 'none';
            });

            coverWrap.appendChild(img);
            link.appendChild(coverWrap);
        }

        // 2. Card Content / Body
        const body = document.createElement('div');
        body.className = 'blog-card-body';

        // Title
        const title = document.createElement('h3');
        title.className = 'blog-card-title';
        title.textContent = post.title;
        body.appendChild(title);

        // Optional Description
        if (post.description) {
            const desc = document.createElement('p');
            desc.className = 'blog-card-description';
            desc.textContent = post.description;
            body.appendChild(desc);
        }

        // Optional Publication Date
        if (post.date) {
            const metaRow = document.createElement('div');
            metaRow.className = 'blog-card-meta';

            const dateEl = document.createElement('time');
            dateEl.className = 'blog-card-date';
            dateEl.setAttribute('datetime', post.date);
            dateEl.textContent = formatDate(post.date);

            metaRow.appendChild(dateEl);
            body.appendChild(metaRow);
        }

        link.appendChild(body);
        card.appendChild(link);
        return card;
    }

    /**
     * Renders cards into the track.
     * 
     * @param {HTMLElement} track
     * @param {Array<Object>} posts
     * @returns {Array<HTMLElement>} List of created card elements
     */
    function renderCards(track, posts) {
        track.textContent = '';
        const cardElements = [];

        posts.forEach((post, index) => {
            const card = createCard(post, index);
            track.appendChild(card);
            cardElements.push(card);
        });

        return cardElements;
    }

    /**
     * Renders empty state inside the track when no posts are available.
     * 
     * @param {HTMLElement} track
     * @param {string} [message]
     */
    function renderEmpty(track, message = DEFAULT_CONFIG.emptyMessage) {
        track.textContent = '';
        const emptyWrapper = document.createElement('div');
        emptyWrapper.className = 'blog-scroll-empty';

        const emptyText = document.createElement('p');
        emptyText.className = 'blog-scroll-empty-text';
        emptyText.textContent = message;

        emptyWrapper.appendChild(emptyText);
        track.appendChild(emptyWrapper);
    }

    /**
     * Renders loading state inside track.
     * 
     * @param {HTMLElement} track
     */
    function renderLoading(track) {
        track.textContent = '';
        const loadingWrapper = document.createElement('div');
        loadingWrapper.className = 'blog-scroll-loading';

        const spinner = document.createElement('div');
        spinner.className = 'activity-spinner';
        spinner.setAttribute('aria-hidden', 'true');

        const label = document.createElement('p');
        label.className = 'blog-scroll-loading-text';
        label.textContent = 'Loading blog posts...';

        loadingWrapper.appendChild(spinner);
        loadingWrapper.appendChild(label);
        track.appendChild(loadingWrapper);
    }

    // ==========================================================================
    // 5. Controller Class
    // ==========================================================================

    class BlogHorizontalScrollController {
        /**
         * @param {Object} [options]
         * @param {Array<Object>|Promise<Array<Object>>} [options.posts] - Pre-fetched normalized posts
         * @param {Object} [options.activityController] - Instance of BlogActivityController
         * @param {string} [options.containerSelector] - Custom selector for scroll section
         * @param {string} [options.trackSelector] - Custom selector for cards track
         * @param {string} [options.prevButtonSelector] - Custom selector for Previous button
         * @param {string} [options.nextButtonSelector] - Custom selector for Next button
         * @param {Function} [options.onActiveChange] - Callback when active card changes
         */
        constructor(options = {}) {
            this.options = { ...DEFAULT_CONFIG, ...options };
            this.container = null;
            this.track = null;
            this.prevBtn = null;
            this.nextBtn = null;

            this.posts = [];
            this.cards = [];
            this.activeCard = null;

            this.intersectionObserver = null;
            this.resizeHandler = null;
            this.wheelHandler = null;
            this.prevClickHandler = null;
            this.nextClickHandler = null;

            // Lifecycle state: 'idle' | 'loading' | 'rendered' | 'empty'
            this.state = 'idle';

            this.init();
        }

        /**
         * Resolve container & track.
         * Gracefully exits if container or track is not present on current page.
         * 
         * @returns {boolean}
         */
        init() {
            this.container = document.querySelector(this.options.containerSelector);
            if (!this.container) {
                return false;
            }

            this.track = document.querySelector(this.options.trackSelector)
                || this.container.querySelector('.blog-track')
                || this.container.querySelector('[data-blog-track]');

            if (!this.track) {
                return false;
            }

            // Resolve navigation buttons (optional)
            this.prevBtn = document.querySelector(this.options.prevButtonSelector)
                || this.container.querySelector('.blog-scroll-prev')
                || this.container.querySelector('[data-blog-prev]');

            this.nextBtn = document.querySelector(this.options.nextButtonSelector)
                || this.container.querySelector('.blog-scroll-next')
                || this.container.querySelector('[data-blog-next]');

            // Prevent duplicate initialization on the same container
            if (this.container._blogHorizontalScrollInitialized) {
                return true;
            }
            this.container._blogHorizontalScrollInitialized = true;

            this.setupWheelScroll();
            this.setupNavigation();
            this.setupResizeHandling();

            // Obtain and display posts
            this.obtainAndRenderPosts();

            return true;
        }

        /**
         * Obtains normalized blog posts from options, activity controller, or global instances.
         */
        async obtainAndRenderPosts() {
            // Case 1: Direct posts passed in options
            if (this.options.posts) {
                if (Array.isArray(this.options.posts)) {
                    this.setPosts(this.options.posts);
                    return;
                }
                if (typeof this.options.posts.then === 'function') {
                    this.state = 'loading';
                    renderLoading(this.track);
                    try {
                        const resolvedPosts = await this.options.posts;
                        this.setPosts(resolvedPosts);
                    } catch {
                        this.setPosts([]);
                    }
                    return;
                }
            }

            // Case 2: Activity controller passed in options or available globally
            const ctrl = this.options.activityController
                || (typeof global !== 'undefined' && global._blogActivityInstance);

            if (ctrl) {
                const currentPosts = (ctrl.getState && ctrl.getState().posts)
                    || (ctrl.state && ctrl.state.posts);

                if (Array.isArray(currentPosts) && currentPosts.length > 0) {
                    this.setPosts(currentPosts);
                    return;
                }

                // If activity controller is still fetching, display loading and wait for it
                const status = (ctrl.getState && ctrl.getState().status)
                    || (ctrl.state && ctrl.state.status);

                if (status === 'loading') {
                    this.state = 'loading';
                    renderLoading(this.track);

                    const pollTimer = setInterval(() => {
                        const updatedStatus = (ctrl.getState && ctrl.getState().status)
                            || (ctrl.state && ctrl.state.status);

                        if (updatedStatus !== 'loading') {
                            clearInterval(pollTimer);
                            const finalPosts = (ctrl.getState && ctrl.getState().posts)
                                || (ctrl.state && ctrl.state.posts)
                                || [];
                            this.setPosts(finalPosts);
                        }
                    }, 50);

                    // Safety timeout after 10s
                    setTimeout(() => clearInterval(pollTimer), 10000);
                    return;
                }
            }

            // Case 3: Check if posts were set via custom event or global variable
            if (typeof global !== 'undefined' && Array.isArray(global.blogPosts)) {
                this.setPosts(global.blogPosts);
                return;
            }

            // Default fallback if posts not yet provided
            this.renderEmptyState();
        }

        /**
         * Sets and renders posts, activating interaction controls.
         * 
         * @param {Array<Object>} rawPosts
         */
        setPosts(rawPosts) {
            if (!this.track) return;

            if (!Array.isArray(rawPosts) || rawPosts.length === 0) {
                this.renderEmptyState();
                return;
            }

            // Validate posts (title and url required)
            const validPosts = rawPosts.map(validatePost).filter(Boolean);

            if (validPosts.length === 0) {
                this.renderEmptyState();
                return;
            }

            this.posts = validPosts;
            this.cards = renderCards(this.track, validPosts);
            this.state = 'rendered';

            // Establish active card and observers
            this.setupActiveCardDetection();
            this.updateNavButtons();
        }

        /**
         * Renders empty state and disables navigation buttons.
         */
        renderEmptyState() {
            this.state = 'empty';
            this.posts = [];
            this.cards = [];
            this.activeCard = null;

            if (this.intersectionObserver) {
                this.intersectionObserver.disconnect();
                this.intersectionObserver = null;
            }

            renderEmpty(this.track, this.options.emptyMessage);
            this.updateNavButtons();
        }

        /**
         * Sets up native horizontal mouse wheel translation.
         * Translates vertical mouse wheel scroll over track to horizontal scroll
         * without custom physics simulation (keeping native momentum).
         */
        setupWheelScroll() {
            if (!this.track) return;

            this.wheelHandler = (e) => {
                // If scrolling vertically without horizontal delta and without Shift
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && !e.shiftKey) {
                    const maxScroll = this.track.scrollWidth - this.track.clientWidth;
                    if (maxScroll <= 0) return;

                    const atStart = this.track.scrollLeft <= 0;
                    const atEnd = this.track.scrollLeft >= maxScroll - 1;

                    if ((e.deltaY > 0 && !atEnd) || (e.deltaY < 0 && !atStart)) {
                        e.preventDefault();
                        this.track.scrollBy({
                            left: e.deltaY,
                            behavior: 'auto'
                        });
                    }
                }
            };

            this.track.addEventListener('wheel', this.wheelHandler, { passive: false });
        }

        /**
         * Sets up Previous and Next button click handlers.
         */
        setupNavigation() {
            if (this.prevBtn) {
                this.prevClickHandler = (e) => {
                    e.preventDefault();
                    this.scrollPrev();
                };
                this.prevBtn.addEventListener('click', this.prevClickHandler);
            }

            if (this.nextBtn) {
                this.nextClickHandler = (e) => {
                    e.preventDefault();
                    this.scrollNext();
                };
                this.nextBtn.addEventListener('click', this.nextClickHandler);
            }
        }

        /**
         * Scrolls to the card preceding the currently active or most visible card.
         */
        scrollPrev() {
            if (!this.cards || this.cards.length === 0) return;

            const current = this.getVisibleCard();
            const currentIndex = this.cards.indexOf(current);

            if (currentIndex > 0) {
                this.scrollToCard(this.cards[currentIndex - 1]);
            } else {
                // Scroll smoothly to start of track
                this.track.scrollTo({ left: 0, behavior: 'smooth' });
            }
        }

        /**
         * Scrolls to the card succeeding the currently active or most visible card.
         */
        scrollNext() {
            if (!this.cards || this.cards.length === 0) return;

            const current = this.getVisibleCard();
            const currentIndex = this.cards.indexOf(current);

            if (currentIndex !== -1 && currentIndex < this.cards.length - 1) {
                this.scrollToCard(this.cards[currentIndex + 1]);
            }
        }

        /**
         * Smoothly centers the given card into view using native scrollIntoView.
         * 
         * @param {HTMLElement} card
         */
        scrollToCard(card) {
            if (!card) return;

            card.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });

            this.setActiveCard(card);
        }

        /**
         * Obtains currently visible card, falling back to track proximity if needed.
         * 
         * @returns {HTMLElement|null}
         */
        getVisibleCard() {
            if (this.activeCard && this.cards.includes(this.activeCard)) {
                return this.activeCard;
            }

            return this.getVisibleCardByProximity() || this.cards[0] || null;
        }

        /**
         * Calculates closest card to center of track view.
         * 
         * @returns {HTMLElement|null}
         */
        getVisibleCardByProximity() {
            if (!this.track || !this.cards || this.cards.length === 0) {
                return null;
            }

            const trackRect = this.track.getBoundingClientRect();
            const trackCenter = trackRect.left + trackRect.width / 2;

            let closestCard = null;
            let minDistance = Infinity;

            for (const card of this.cards) {
                const rect = card.getBoundingClientRect();
                const cardCenter = rect.left + rect.width / 2;
                const dist = Math.abs(cardCenter - trackCenter);

                if (dist < minDistance) {
                    minDistance = dist;
                    closestCard = card;
                }
            }

            return closestCard;
        }

        /**
         * Sets active card, manages 'active' CSS class and updates button disabled states.
         * 
         * @param {HTMLElement} card
         */
        setActiveCard(card) {
            if (!card || card === this.activeCard) {
                this.updateNavButtons();
                return;
            }

            if (this.activeCard) {
                this.activeCard.classList.remove('active');
            }

            this.activeCard = card;
            this.activeCard.classList.add('active');

            this.updateNavButtons();

            if (typeof this.options.onActiveChange === 'function') {
                const index = parseInt(card.getAttribute('data-index'), 10);
                this.options.onActiveChange(card, this.posts[index], index);
            }
        }

        /**
         * Updates disabled state and ARIA attributes of Prev/Next buttons.
         */
        updateNavButtons() {
            if (!this.cards || this.cards.length === 0) {
                if (this.prevBtn) {
                    this.prevBtn.classList.add('is-disabled');
                    this.prevBtn.setAttribute('aria-disabled', 'true');
                }
                if (this.nextBtn) {
                    this.nextBtn.classList.add('is-disabled');
                    this.nextBtn.setAttribute('aria-disabled', 'true');
                }
                return;
            }

            const current = this.activeCard || this.cards[0];
            const currentIndex = this.cards.indexOf(current);

            if (this.prevBtn) {
                const atStart = currentIndex <= 0;
                this.prevBtn.classList.toggle('is-disabled', atStart);
                this.prevBtn.setAttribute('aria-disabled', atStart ? 'true' : 'false');
            }

            if (this.nextBtn) {
                const atEnd = currentIndex >= this.cards.length - 1;
                this.nextBtn.classList.toggle('is-disabled', atEnd);
                this.nextBtn.setAttribute('aria-disabled', atEnd ? 'true' : 'false');
            }
        }

        /**
         * Sets up IntersectionObserver for detecting active card during scroll.
         */
        setupActiveCardDetection() {
            if (this.intersectionObserver) {
                this.intersectionObserver.disconnect();
                this.intersectionObserver = null;
            }

            if (!('IntersectionObserver' in global) || !this.track || this.cards.length === 0) {
                if (this.cards.length > 0) {
                    this.setActiveCard(this.cards[0]);
                }
                return;
            }

            const ratios = new Map();

            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    ratios.set(entry.target, entry.intersectionRatio);
                });

                let bestCard = null;
                let maxRatio = -1;

                for (const card of this.cards) {
                    const ratio = ratios.get(card) || 0;
                    if (ratio > maxRatio) {
                        maxRatio = ratio;
                        bestCard = card;
                    }
                }

                if (bestCard && maxRatio > 0.25) {
                    this.setActiveCard(bestCard);
                }
            }, {
                root: this.track,
                threshold: [0, 0.25, 0.5, 0.75, 1.0]
            });

            this.cards.forEach((card) => {
                this.intersectionObserver.observe(card);
            });

            // Set first card active initially
            if (this.cards[0]) {
                this.setActiveCard(this.cards[0]);
            }
        }

        /**
         * Handles window resize to recalculate card alignment and active state.
         */
        setupResizeHandling() {
            let resizeTimer = null;
            this.resizeHandler = () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    const visible = this.getVisibleCardByProximity();
                    if (visible) {
                        this.setActiveCard(visible);
                    }
                }, 150);
            };

            window.addEventListener('resize', this.resizeHandler);
        }

        /**
         * Cleanup event listeners and observers.
         */
        destroy() {
            if (this.intersectionObserver) {
                this.intersectionObserver.disconnect();
                this.intersectionObserver = null;
            }

            if (this.track && this.wheelHandler) {
                this.track.removeEventListener('wheel', this.wheelHandler);
            }

            if (this.prevBtn && this.prevClickHandler) {
                this.prevBtn.removeEventListener('click', this.prevClickHandler);
            }

            if (this.nextBtn && this.nextClickHandler) {
                this.nextBtn.removeEventListener('click', this.nextClickHandler);
            }

            if (this.resizeHandler) {
                window.removeEventListener('resize', this.resizeHandler);
            }

            if (this.container) {
                delete this.container._blogHorizontalScrollInitialized;
            }
        }
    }

    // ==========================================================================
    // 6. Initialization & Global Export
    // ==========================================================================

    /**
     * Initializes the horizontal blog scroll browser.
     * Exposed for main.js to call during application startup.
     * 
     * @param {Object} [options] Optional configuration overrides or posts
     * @returns {BlogHorizontalScrollController|null} Controller instance or null
     */
    function initBlogHorizontalScroll(options) {
        const controller = new BlogHorizontalScrollController(options);
        return controller.container && controller.track ? controller : null;
    }

    // Expose globally on window
    if (typeof global !== 'undefined') {
        global.initBlogHorizontalScroll = initBlogHorizontalScroll;
        global.BlogHorizontalScrollController = BlogHorizontalScrollController;
    }

    // CommonJS support for testing / module environments
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            initBlogHorizontalScroll,
            BlogHorizontalScrollController,
            formatDate,
            validatePost,
            createCard,
            renderCards,
            renderEmpty
        };
    }

})(typeof window !== 'undefined' ? window : this);
