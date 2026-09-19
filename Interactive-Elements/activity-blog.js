(function (global) {
    'use strict';

    const BLOG_INDEX = '/blog-index.json';

    const MAX_POSTS = 3;

    const BLOG_ACTIVITY_CONTAINER = '#blog-activity';

    function parseFrontMatter(content) {
        if (!content || typeof content !== 'string') {
            return null;
        }

        const trimmed = content.trimStart();
        if (!trimmed.startsWith('---')) {
            return null;
        }

        const match = trimmed.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
        if (!match) {
            return null;
        }

        const frontMatterBlock = match[1];
        const data = {};
        const lines = frontMatterBlock.split(/\r?\n/);

        for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine || cleanLine.startsWith('#')) {
                continue;
            }

            const colonIndex = cleanLine.indexOf(':');
            if (colonIndex === -1) {
                continue;
            }

            const key = cleanLine.slice(0, colonIndex).trim().toLowerCase();
            let value = cleanLine.slice(colonIndex + 1).trim();

            if (
                value.length >= 2 &&
                ((value.startsWith('"') && value.endsWith('"')) ||
                 (value.startsWith("'") && value.endsWith("'")))
            ) {
                value = value.slice(1, -1);
            }

            if (key) {
                data[key] = value;
            }
        }

        return data;
    }

    function getDirectory(filePath) {
        if (!filePath || typeof filePath !== 'string') {
            return '/';
        }

        let normalized = filePath.replace(/\\/g, '/').trim();
        if (normalized.startsWith('./')) {
            normalized = normalized.slice(2);
        }

        const lastSlash = normalized.lastIndexOf('/');
        if (lastSlash === -1) {
            return '/';
        }

        let dir = normalized.slice(0, lastSlash + 1);
        if (!dir.startsWith('/')) {
            dir = '/' + dir;
        }
        if (!dir.endsWith('/')) {
            dir = dir + '/';
        }

        return dir;
    }

    function generateBlogUrl(markdownPath) {
        return getDirectory(markdownPath);
    }

    function resolveCoverPath(cover, markdownPath) {
        if (!cover || typeof cover !== 'string') {
            return '';
        }

        const trimmed = cover.trim();
        if (!trimmed) {
            return '';
        }

        if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) {
            return trimmed;
        }

        const cleanCover = trimmed.startsWith('./') ? trimmed.slice(2) : trimmed;
        const dir = getDirectory(markdownPath);
        return `${dir}${cleanCover}`;
    }

    function normalizeBlogPost(rawFrontMatter, markdownPath) {
        if (!rawFrontMatter || typeof rawFrontMatter !== 'object') {
            return null;
        }

        const title = (rawFrontMatter.title || '').trim();
        const date = (rawFrontMatter.date || '').trim();

        if (!title || !date) {
            return null;
        }

        const description = (rawFrontMatter.description || '').trim();
        const cover = resolveCoverPath(rawFrontMatter.cover, markdownPath);
        const url = (rawFrontMatter.url || '').trim() || generateBlogUrl(markdownPath);

        return {
            title,
            date,
            description,
            cover,
            url
        };
    }

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

    function sortPosts(posts) {
        return posts.slice().sort((a, b) => {
            const timeA = new Date(a.date).getTime();
            const timeB = new Date(b.date).getTime();

            const validA = !Number.isNaN(timeA);
            const validB = !Number.isNaN(timeB);

            if (validA && validB) {
                return timeB - timeA;
            }
            if (validA) return -1;
            if (validB) return 1;
            return 0;
        });
    }

    async function fetchBlogActivity(indexPath, maxPosts) {
        let indexRes;
        try {
            indexRes = await fetch(indexPath);
            if (!indexRes.ok && indexPath.startsWith('/')) {
                indexRes = await fetch(indexPath.replace(/^\//, ''));
            }
        } catch (err) {
            if (indexPath.startsWith('/')) {
                try {
                    indexRes = await fetch(indexPath.replace(/^\//, ''));
                } catch {
                    throw new Error(`Failed to fetch blog index: ${err.message}`);
                }
            } else {
                throw new Error(`Failed to fetch blog index: ${err.message}`);
            }
        }

        if (!indexRes || !indexRes.ok) {
            throw new Error(`Failed to fetch blog index: ${indexRes ? indexRes.status : 'network error'}`);
        }

        const filePaths = await indexRes.json();
        if (!Array.isArray(filePaths)) {
            throw new Error('Invalid blog index format: expected a JSON array of file paths');
        }

        if (filePaths.length === 0) {
            return [];
        }

        const postPromises = filePaths.map(async (filePath) => {
            try {
                if (!filePath || typeof filePath !== 'string') {
                    return null;
                }

                let postRes = await fetch(filePath);
                if (!postRes.ok && filePath.startsWith('/')) {
                    postRes = await fetch(filePath.replace(/^\//, ''));
                } else if (!postRes.ok && !filePath.startsWith('/') && !filePath.startsWith('http')) {
                    postRes = await fetch('/' + filePath);
                }

                if (!postRes.ok) {
                    return null;
                }

                const markdown = await postRes.text();
                const frontMatter = parseFrontMatter(markdown);
                if (!frontMatter) {
                    return null;
                }

                return normalizeBlogPost(frontMatter, filePath);
            } catch {
                return null;
            }
        });

        const results = await Promise.all(postPromises);
        const validPosts = results.filter(Boolean);

        if (validPosts.length === 0) {
            return [];
        }

        const sorted = sortPosts(validPosts);
        return sorted.slice(0, maxPosts);
    }

    function renderLoading(container) {
        container.textContent = '';
        container.classList.add('activity-container--loading');
        container.classList.remove('activity-container--loaded', 'activity-container--error');

        const wrapper = document.createElement('div');
        wrapper.className = 'activity-state activity-state--loading';

        const spinner = document.createElement('div');
        spinner.className = 'activity-spinner';
        spinner.setAttribute('aria-hidden', 'true');

        const label = document.createElement('p');
        label.className = 'activity-loading-text';
        label.textContent = 'Fetching recent blog posts...';

        wrapper.appendChild(spinner);
        wrapper.appendChild(label);
        container.appendChild(wrapper);
    }

    function renderPosts(container, posts) {
        container.textContent = '';
        container.classList.add('activity-container--loaded');
        container.classList.remove('activity-container--loading', 'activity-container--error');

        const feed = document.createElement('div');
        feed.className = 'activity-feed activity-feed--blog';
        feed.setAttribute('role', 'feed');
        feed.setAttribute('aria-label', 'Recent Blog Posts');

        posts.forEach(post => {
            const card = document.createElement('article');
            card.className = 'activity-card activity-card--blog';

            const headerRow = document.createElement('div');
            headerRow.className = 'activity-card-header';

            const dot = document.createElement('span');
            dot.className = 'activity-dot activity-dot--blog';
            dot.setAttribute('aria-hidden', 'true');

            const titleLink = document.createElement('a');
            titleLink.className = 'activity-post-link';
            titleLink.href = post.url;
            titleLink.textContent = post.title;

            headerRow.appendChild(dot);
            headerRow.appendChild(titleLink);
            card.appendChild(headerRow);

            if (post.description) {
                const descEl = document.createElement('p');
                descEl.className = 'activity-post-description';
                descEl.textContent = post.description;
                card.appendChild(descEl);
            }

            const metaRow = document.createElement('div');
            metaRow.className = 'activity-card-meta';

            const dateEl = document.createElement('time');
            dateEl.className = 'activity-time activity-post-date';
            dateEl.setAttribute('datetime', post.date);
            dateEl.textContent = formatDate(post.date);

            metaRow.appendChild(dateEl);
            card.appendChild(metaRow);

            feed.appendChild(card);
        });

        container.appendChild(feed);
    }

    function renderEmpty(container) {
        container.textContent = '';
        container.classList.add('activity-container--loaded');
        container.classList.remove('activity-container--loading', 'activity-container--error');

        const wrapper = document.createElement('div');
        wrapper.className = 'activity-state activity-state--empty';

        const message = document.createElement('p');
        message.className = 'activity-empty-text';
        message.textContent = 'No recent blog posts.';

        wrapper.appendChild(message);
        container.appendChild(wrapper);
    }

    function renderError(container, onRetry) {
        container.textContent = '';
        container.classList.add('activity-container--error');
        container.classList.remove('activity-container--loading', 'activity-container--loaded');

        const wrapper = document.createElement('div');
        wrapper.className = 'activity-state activity-state--error';

        const message = document.createElement('p');
        message.className = 'activity-error-text';
        message.textContent = "Blog activity couldn't be loaded.";

        const retryBtn = document.createElement('button');
        retryBtn.type = 'button';
        retryBtn.className = 'activity-retry-btn';
        retryBtn.textContent = 'Retry';
        retryBtn.setAttribute('aria-label', 'Retry loading blog posts');

        retryBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof onRetry === 'function') {
                onRetry();
            }
        });

        wrapper.appendChild(message);
        wrapper.appendChild(retryBtn);
        container.appendChild(wrapper);
    }

    class BlogActivityController {
        constructor(options = {}) {
            if (typeof options === 'string') {
                options = { containerSelector: options };
            }

            this.containerSelector = typeof options.containerSelector === 'string'
                ? options.containerSelector
                : BLOG_ACTIVITY_CONTAINER;

            this.indexPath = typeof options.indexPath === 'string'
                ? options.indexPath
                : BLOG_INDEX;

            this.maxPosts = typeof options.maxPosts === 'number'
                ? options.maxPosts
                : MAX_POSTS;

            this.container = null;

            this.state = {
                status: 'idle',
                posts: []
            };

            this.init();
        }

        init() {
            this.container = document.querySelector(this.containerSelector)
                || document.querySelector('.blog-activity-container')
                || document.querySelector('[data-blog-activity]');

            if (!this.container) {
                return false;
            }

            if (this.container._blogActivityInitialized) {
                return true;
            }

            this.container._blogActivityInitialized = true;
            this.load();
            return true;
        }

        async load() {
            if (!this.container) return;

            this.state.status = 'loading';
            renderLoading(this.container);

            try {
                const posts = await fetchBlogActivity(this.indexPath, this.maxPosts);

                if (!posts || posts.length === 0) {
                    this.state.status = 'empty';
                    this.state.posts = [];
                    renderEmpty(this.container);
                } else {
                    this.state.status = 'success';
                    this.state.posts = posts;
                    renderPosts(this.container, posts);
                }
            } catch {
                this.state.status = 'error';
                this.state.posts = [];
                renderError(this.container, () => this.load());
            }
        }

        getState() {
            return { ...this.state };
        }
    }

    function initBlogActivity(options) {
        const controller = new BlogActivityController(options);
        return controller.container ? controller : null;
    }

    if (typeof global !== 'undefined') {
        global.initBlogActivity = initBlogActivity;
        global.BlogActivityController = BlogActivityController;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            initBlogActivity,
            BlogActivityController,
            parseFrontMatter,
            getDirectory,
            generateBlogUrl,
            resolveCoverPath,
            normalizeBlogPost,
            formatDate,
            sortPosts,
            fetchBlogActivity
        };
    }

})(typeof window !== 'undefined' ? window : this);
