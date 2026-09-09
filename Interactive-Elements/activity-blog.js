/**
 * ==============================================================================
 * activity-blog.js — Blog Markdown Activity Feed Controller
 * ==============================================================================
 * 
 * Functional Scope:
 * Bridges Markdown blog files to the Activity Center.
 * - Fetches blog-index.json manifest to discover available Markdown posts
 * - Concurrently fetches each post's Markdown file
 * - Parses front matter metadata (title, date, description, cover)
 * - Normalizes post data into clean internal objects with resolved paths & URLs
 * - Validates required fields (title, date)
 * - Sorts chronologically (newest first) and takes recent posts (default 3)
 * - Renders clean activity cards using safe DOM APIs (createElement / textContent)
 * - Handles lifecycle states: LOADING, SUCCESS, EMPTY, ERROR (with Retry)
 * - Supports graceful partial failure (missing posts skipped, index failure errors)
 * - Exposes initBlogActivity() for main.js lifecycle orchestration
 * ==============================================================================
 */

(function (global) {
    'use strict';

    // ==========================================================================
    // 1. Configuration (Section 4)
    // ==========================================================================

    /**
     * Default path to the generated blog manifest index.
     */
    const BLOG_INDEX = '/blog-index.json';

    /**
     * Default maximum number of recent posts to display in the feed.
     */
    const MAX_POSTS = 3;

    /**
     * Default container selector for the blog activity feed in the Activity Center.
     */
    const BLOG_ACTIVITY_CONTAINER = '#blog-activity';

    // ==========================================================================
    // 2. Markdown Front Matter Parser (Section 7 & Section 8)
    // ==========================================================================

    /**
     * Parses simple YAML front matter delimited by '---' from raw Markdown content.
     * Extracts key-value pairs without requiring a full YAML or Markdown parser.
     * 
     * @param {string} content - Raw markdown file text
     * @returns {Object|null} Key-value map of front matter metadata or null
     */
    function parseFrontMatter(content) {
        if (!content || typeof content !== 'string') {
            return null;
        }

        const trimmed = content.trimStart();
        if (!trimmed.startsWith('---')) {
            return null;
        }

        // Match the front matter block between leading --- and closing ---
        const match = trimmed.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
        if (!match) {
            return null;
        }

        const frontMatterBlock = match[1];
        const data = {};
        const lines = frontMatterBlock.split(/\r?\n/);

        for (const line of lines) {
            const cleanLine = line.trim();
            // Skip empty lines or comments
            if (!cleanLine || cleanLine.startsWith('#')) {
                continue;
            }

            // Split on the first colon
            const colonIndex = cleanLine.indexOf(':');
            if (colonIndex === -1) {
                continue;
            }

            const key = cleanLine.slice(0, colonIndex).trim().toLowerCase();
            let value = cleanLine.slice(colonIndex + 1).trim();

            // Remove surrounding single or double quotes
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

    // ==========================================================================
    // 3. Path Resolution & URL Generation (Section 9 & Section 10)
    // ==========================================================================

    /**
     * Extracts directory path from a file path and ensures a leading and trailing slash.
     * e.g., "blog/zombie-internet/post.md" -> "/blog/zombie-internet/"
     * 
     * @param {string} filePath
     * @returns {string}
     */
    function getDirectory(filePath) {
        if (!filePath || typeof filePath !== 'string') {
            return '/';
        }

        let normalized = filePath.replace(/\\/g, '/').trim();
        // Strip leading ./
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

    /**
     * Resolves article destination URL from the markdown file's path.
     * Following decision in Section 10:
     * "blog/zombie-internet/post.md" maps to "/blog/zombie-internet/"
     * 
     * @param {string} markdownPath
     * @returns {string}
     */
    function generateBlogUrl(markdownPath) {
        return getDirectory(markdownPath);
    }

    /**
     * Resolves cover image path relative to the Markdown file's directory.
     * Prevents "cover.webp" from accidentally resolving to root "/cover.webp".
     * 
     * @param {string|undefined} cover
     * @param {string} markdownPath
     * @returns {string}
     */
    function resolveCoverPath(cover, markdownPath) {
        if (!cover || typeof cover !== 'string') {
            return '';
        }

        const trimmed = cover.trim();
        if (!trimmed) {
            return '';
        }

        // Preserve already absolute URLs or root-relative paths
        if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) {
            return trimmed;
        }

        const cleanCover = trimmed.startsWith('./') ? trimmed.slice(2) : trimmed;
        // Resolve relative to markdown directory
        const dir = getDirectory(markdownPath);
        return `${dir}${cleanCover}`;
    }

    // ==========================================================================
    // 4. Data Normalization & Validation (Section 11 & Section 12)
    // ==========================================================================

    /**
     * Normalizes parsed front matter into standard blog post object.
     * Enforces validation rules (Section 12):
     * - title: REQUIRED
     * - date: REQUIRED
     * - description: OPTIONAL
     * - cover: OPTIONAL
     * 
     * @param {Object} rawFrontMatter
     * @param {string} markdownPath
     * @returns {Object|null} Normalized post object or null if invalid
     */
    function normalizeBlogPost(rawFrontMatter, markdownPath) {
        if (!rawFrontMatter || typeof rawFrontMatter !== 'object') {
            return null;
        }

        const title = (rawFrontMatter.title || '').trim();
        const date = (rawFrontMatter.date || '').trim();

        // Required fields: title and date must exist
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

    /**
     * Formats an ISO date or date string into readable format (e.g., "Sep 2, 2026").
     * Uses explicit component extraction to avoid local timezone date drift.
     * 
     * @param {string} dateString
     * @returns {string}
     */
    function formatDate(dateString) {
        if (!dateString) return '';

        const trimmed = String(dateString).trim();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Direct match for YYYY-MM-DD to avoid local timezone offset drift
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

    /**
     * Sorts normalized posts from newest to oldest by date timestamp (Section 13).
     * 
     * @param {Array<Object>} posts
     * @returns {Array<Object>}
     */
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

    // ==========================================================================
    // 5. Data Fetching Pipeline (Section 5, 6, 19)
    // ==========================================================================

    /**
     * Fetches the blog manifest index and reads each post's Markdown file.
     * 
     * Error model (Section 19):
     * - Index failure -> Throws Error (module-level failure)
     * - Individual post failure / 404 -> Silently skipped
     * 
     * @param {string} indexPath
     * @param {number} maxPosts
     * @returns {Promise<Array<Object>>} Normalized, sorted, and limited posts
     */
    async function fetchBlogActivity(indexPath, maxPosts) {
        // Step 5: Fetch blog-index.json
        let indexRes;
        try {
            indexRes = await fetch(indexPath);
            if (!indexRes.ok && indexPath.startsWith('/')) {
                // Graceful fallback for non-root deployments or relative environments
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

        // Step 6: Fetch each Markdown file concurrently with Promise.all()
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
                    // Step 19: Skip missing post silently
                    return null;
                }

                const markdown = await postRes.text();
                const frontMatter = parseFrontMatter(markdown);
                if (!frontMatter) {
                    return null;
                }

                return normalizeBlogPost(frontMatter, filePath);
            } catch {
                // Step 19: Silently skip individual post error
                return null;
            }
        });

        const results = await Promise.all(postPromises);
        const validPosts = results.filter(Boolean);

        if (validPosts.length === 0) {
            return [];
        }

        // Step 13: Sort newest first and limit to maxPosts
        const sorted = sortPosts(validPosts);
        return sorted.slice(0, maxPosts);
    }

    // ==========================================================================
    // 6. Safe DOM Rendering (Section 14 & Section 15)
    // ==========================================================================

    /**
     * Renders loading state inside container (Section 16).
     * 
     * @param {HTMLElement} container
     */
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

    /**
     * Renders normalized blog posts feed inside container using safe DOM APIs.
     * Creates:
     * article
     *  ├── title link
     *  ├── description (optional)
     *  └── date
     * 
     * @param {HTMLElement} container
     * @param {Array<Object>} posts
     */
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

            // Top row: status dot + title link (Section 14 & 15)
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

            // Optional description (Section 14)
            if (post.description) {
                const descEl = document.createElement('p');
                descEl.className = 'activity-post-description';
                descEl.textContent = post.description;
                card.appendChild(descEl);
            }

            // Meta row: formatted date (Section 14)
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

    /**
     * Renders empty state when index is empty or all posts are invalid (Section 17).
     * 
     * @param {HTMLElement} container
     */
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

    /**
     * Renders error state with retry button (Section 18).
     * 
     * @param {HTMLElement} container
     * @param {Function} onRetry
     */
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

    // ==========================================================================
    // 7. Activity Controller Class
    // ==========================================================================

    class BlogActivityController {
        /**
         * @param {Object|string} [options]
         */
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

            // Handle 0 explicitly so options.maxPosts = 0 works properly
            this.maxPosts = typeof options.maxPosts === 'number'
                ? options.maxPosts
                : MAX_POSTS;

            this.container = null;

            // Internal State
            this.state = {
                status: 'idle', // 'idle' | 'loading' | 'success' | 'empty' | 'error'
                posts: []
            };

            this.init();
        }

        /**
         * Resolve container element safely (Section 3).
         * Stops gracefully if container is absent.
         * @returns {boolean}
         */
        init() {
            this.container = document.querySelector(this.containerSelector)
                || document.querySelector('.blog-activity-container')
                || document.querySelector('[data-blog-activity]');

            if (!this.container) {
                // Section 3: Return gracefully if container is absent
                return false;
            }

            // Prevent double-initialization
            if (this.container._blogActivityInitialized) {
                return true;
            }

            this.container._blogActivityInitialized = true;
            this.load();
            return true;
        }

        /**
         * Execute fetch pipeline and update DOM.
         */
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

        /**
         * Returns current controller state snapshot.
         * @returns {Object}
         */
        getState() {
            return { ...this.state };
        }
    }

    // ==========================================================================
    // 8. Initialization & Export (Section 3)
    // ==========================================================================

    /**
     * Initializes the Blog Activity feed.
     * Exposed for main.js to call during application startup.
     * 
     * @param {Object|string} [options] Optional configuration overrides or selector
     * @returns {BlogActivityController|null} Initialized instance or null
     */
    function initBlogActivity(options) {
        const controller = new BlogActivityController(options);
        return controller.container ? controller : null;
    }

    // Expose globally on window
    if (typeof global !== 'undefined') {
        global.initBlogActivity = initBlogActivity;
        global.BlogActivityController = BlogActivityController;
    }

    // CommonJS support
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
