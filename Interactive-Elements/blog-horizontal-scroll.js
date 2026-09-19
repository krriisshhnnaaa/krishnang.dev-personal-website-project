(function (global) {
    'use strict';

    const DEFAULT_CONFIG = {
        containerSelector: '#blog-browser, .blog-scroll-container, #blog-horizontal-scroll, [data-blog-scroll]',
        trackSelector: '.blog-track, .blog-cards-track, [data-blog-track]',
        prevButtonSelector: '.blog-scroll-prev, .blog-nav-btn--prev, #blog-prev, [data-blog-prev]',
        nextButtonSelector: '.blog-scroll-next, .blog-nav-btn--next, #blog-next, [data-blog-next]',
        emptyMessage: 'No blog posts available.'
    };

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

        const link = document.createElement('a');
        link.className = 'blog-card-link';
        link.href = post.url;
        link.setAttribute('aria-label', `Read blog post: ${post.title}`);

        if (post.cover) {
            const coverWrap = document.createElement('div');
            coverWrap.className = 'blog-card-cover-wrap';

            const img = document.createElement('img');
            img.className = 'blog-card-cover';
            img.src = post.cover;
            img.alt = `${post.title} cover image`;
            img.loading = 'lazy';

            img.addEventListener('error', () => {
                coverWrap.classList.add('blog-card-cover-wrap--failed');
                img.style.display = 'none';
            });

            coverWrap.appendChild(img);
            link.appendChild(coverWrap);
        }

        const body = document.createElement('div');
        body.className = 'blog-card-body';

        const title = document.createElement('h3');
        title.className = 'blog-card-title';
        title.textContent = post.title;
        body.appendChild(title);

        if (post.description) {
            const desc = document.createElement('p');
            desc.className = 'blog-card-description';
            desc.textContent = post.description;
            body.appendChild(desc);
        }

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

    class BlogHorizontalScrollController {
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

            this.state = 'idle';

            this.init();
        }

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

            this.prevBtn = document.querySelector(this.options.prevButtonSelector)
                || this.container.querySelector('.blog-scroll-prev')
                || this.container.querySelector('[data-blog-prev]');

            this.nextBtn = document.querySelector(this.options.nextButtonSelector)
                || this.container.querySelector('.blog-scroll-next')
                || this.container.querySelector('[data-blog-next]');

            if (this.container._blogHorizontalScrollInitialized) {
                return true;
            }
            this.container._blogHorizontalScrollInitialized = true;

            this.setupWheelScroll();
            this.setupNavigation();
            this.setupResizeHandling();

            this.obtainAndRenderPosts();

            return true;
        }

        async obtainAndRenderPosts() {
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

            const ctrl = this.options.activityController
                || (typeof global !== 'undefined' && global._blogActivityInstance);

            if (ctrl) {
                const currentPosts = (ctrl.getState && ctrl.getState().posts)
                    || (ctrl.state && ctrl.state.posts);

                if (Array.isArray(currentPosts) && currentPosts.length > 0) {
                    this.setPosts(currentPosts);
                    return;
                }

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

                    setTimeout(() => clearInterval(pollTimer), 10000);
                    return;
                }
            }

            if (typeof global !== 'undefined' && Array.isArray(global.blogPosts)) {
                this.setPosts(global.blogPosts);
                return;
            }

            this.renderEmptyState();
        }

        setPosts(rawPosts) {
            if (!this.track) return;

            if (!Array.isArray(rawPosts) || rawPosts.length === 0) {
                this.renderEmptyState();
                return;
            }

            const validPosts = rawPosts.map(validatePost).filter(Boolean);

            if (validPosts.length === 0) {
                this.renderEmptyState();
                return;
            }

            this.posts = validPosts;
            this.cards = renderCards(this.track, validPosts);
            this.state = 'rendered';

            this.setupActiveCardDetection();
            this.updateNavButtons();
        }

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

        setupWheelScroll() {
            if (!this.track) return;

            this.wheelHandler = (e) => {
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

        scrollPrev() {
            if (!this.cards || this.cards.length === 0) return;

            const current = this.getVisibleCard();
            const currentIndex = this.cards.indexOf(current);

            if (currentIndex > 0) {
                this.scrollToCard(this.cards[currentIndex - 1]);
            } else {
                this.track.scrollTo({ left: 0, behavior: 'smooth' });
            }
        }

        scrollNext() {
            if (!this.cards || this.cards.length === 0) return;

            const current = this.getVisibleCard();
            const currentIndex = this.cards.indexOf(current);

            if (currentIndex !== -1 && currentIndex < this.cards.length - 1) {
                this.scrollToCard(this.cards[currentIndex + 1]);
            }
        }

        scrollToCard(card) {
            if (!card) return;

            card.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });

            this.setActiveCard(card);
        }

        getVisibleCard() {
            if (this.activeCard && this.cards.includes(this.activeCard)) {
                return this.activeCard;
            }

            return this.getVisibleCardByProximity() || this.cards[0] || null;
        }

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

            if (this.cards[0]) {
                this.setActiveCard(this.cards[0]);
            }
        }

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

    function initBlogHorizontalScroll(options) {
        const controller = new BlogHorizontalScrollController(options);
        return controller.container && controller.track ? controller : null;
    }

    if (typeof global !== 'undefined') {
        global.initBlogHorizontalScroll = initBlogHorizontalScroll;
        global.BlogHorizontalScrollController = BlogHorizontalScrollController;
    }

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
