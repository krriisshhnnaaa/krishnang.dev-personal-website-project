/**
 * ==============================================================================
 * activity-github.js — GitHub Activity Feed Controller
 * ==============================================================================
 * 
 * Functional Scope:
 * Fetches recent public GitHub commits authored by the user and renders them as
 * a polished, responsive activity feed inside the Activity Center.
 * 
 * Adheres strictly to the activity-github.js specification:
 * - Single configuration constant for GitHub username
 * - Normalized internal commit representation
 * - Safe relative timestamp and commit message formatting
 * - DOM-safe rendering (XSS-safe via textContent, no innerHTML on external data)
 * - Distinct lifecycle states: LOADING, SUCCESS, EMPTY, ERROR
 * - Graceful error handling with built-in retry mechanism
 * - Safe external link attributes (target="_blank", rel="noopener noreferrer")
 * - Scoped DOM manipulation (only touches designated container)
 * - Exposes initGitHubActivity() for main.js lifecycle orchestration
 * ==============================================================================
 */

(function (global) {
    'use strict';

    // ==========================================================================
    // 1. Configuration (Section 2 & Section 4)
    // ==========================================================================

    /**
     * GitHub account identifier.
     * Centralized in one configuration constant — never scattered.
     */
    const GITHUB_USERNAME = 'krriisshhnnaaa';

    /**
     * Maximum number of recent commits to display in the feed.
     */
    const MAX_COMMITS = 6;

    /**
     * Maximum number of recently active repositories to inspect.
     */
    const MAX_REPOSITORIES_TO_CHECK = 5;

    /**
     * Maximum character length for displayed commit message subject lines.
     */
    const MAX_MESSAGE_LENGTH = 72;

    /**
     * Default container selector for the activity feed in the Activity Center.
     */
    const DEFAULT_CONTAINER_SELECTOR = '#github-activity';

    /**
     * GitHub API Endpoints
     */
    const API_ENDPOINTS = {
        userRepos: (username, limit) =>
            `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=pushed&per_page=${limit}`,
        repoCommits: (fullName, author, limit) =>
            `https://api.github.com/repos/${fullName}/commits?author=${encodeURIComponent(author)}&per_page=${limit}`
    };

    // ==========================================================================
    // 2. Formatting Helpers (Section 7 & Section 8)
    // ==========================================================================

    /**
     * Formats a raw commit message into a clean single-line preview.
     * Extracts first line (subject), trims whitespace, and applies ellipsis if too long.
     * 
     * @param {string} rawMessage
     * @param {number} [maxLength=MAX_MESSAGE_LENGTH]
     * @returns {string}
     */
    function formatCommitMessage(rawMessage, maxLength = MAX_MESSAGE_LENGTH) {
        if (!rawMessage || typeof rawMessage !== 'string') {
            return 'Commit update';
        }

        // Take only the first line of multi-line commit messages
        const firstLine = rawMessage.split(/\r?\n/)[0].trim();
        if (!firstLine) {
            return 'Commit update';
        }

        if (firstLine.length > maxLength) {
            return firstLine.slice(0, maxLength).trimEnd() + '...';
        }

        return firstLine;
    }

    /**
     * Converts an ISO timestamp into a concise, human-friendly relative time string.
     * 
     * Handles:
     * - "just now" (< 1 min)
     * - "X minute(s) ago"
     * - "X hour(s) ago"
     * - "yesterday"
     * - "X days ago" (< 30 days)
     * - "MMM D, YYYY" for older dates
     * 
     * @param {string|Date} dateInput
     * @returns {string}
     */
    function formatRelativeTime(dateInput) {
        if (!dateInput) return '';

        const date = new Date(dateInput);
        if (Number.isNaN(date.getTime())) return '';

        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 0) {
            return 'just now';
        }

        if (diffInSeconds < 60) {
            return 'just now';
        }

        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
        }

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
        }

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays === 1) {
            return 'yesterday';
        }

        if (diffInDays < 30) {
            return `${diffInDays} days ago`;
        }

        // Fallback for older commits: "Sep 1, 2026"
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }

    // ==========================================================================
    // 3. Data Normalization & Processing (Section 6)
    // ==========================================================================

    /**
     * Normalizes raw API commit data into a consistent internal schema.
     * 
     * Schema:
     * {
     *   sha: string,
     *   message: string,
     *   repository: string,
     *   repositoryUrl: string,
     *   commitUrl: string,
     *   author: string,
     *   timestamp: string
     * }
     * 
     * @param {Object} raw
     * @param {Object} [repoMeta]
     * @returns {Object|null}
     */
    function normalizeCommit(raw, repoMeta = {}) {
        if (!raw) return null;

        const commitObj = raw.commit || {};
        const authorObj = commitObj.author || {};
        const committerObj = commitObj.committer || {};

        const repoName = repoMeta.name || repoMeta.fullName || raw.repository?.name || '';
        const repoFullName = repoMeta.fullName || raw.repository?.full_name || repoName;
        const repoUrl = repoMeta.htmlUrl || (repoFullName ? `https://github.com/${repoFullName}` : '');

        return {
            sha: raw.sha || '',
            message: commitObj.message || raw.message || 'Commit update',
            repository: repoFullName || repoName,
            repositoryUrl: repoUrl,
            commitUrl: raw.html_url || (repoFullName && raw.sha ? `https://github.com/${repoFullName}/commit/${raw.sha}` : ''),
            author: authorObj.name || raw.author?.login || GITHUB_USERNAME,
            timestamp: authorObj.date || committerObj.date || ''
        };
    }

    /**
     * Deduplicates normalized commits by SHA (preferred identity) or commitUrl / composite key.
     * 
     * @param {Array<Object>} commits
     * @returns {Array<Object>}
     */
    function deduplicateCommits(commits) {
        const seen = new Set();
        const unique = [];

        for (const commit of commits) {
            if (!commit) continue;
            const key = commit.sha || commit.commitUrl || `${commit.repository}::${commit.message}::${commit.timestamp}`;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(commit);
            }
        }

        return unique;
    }

    /**
     * Sorts commits from newest to oldest using the actual commit timestamp.
     * 
     * @param {Array<Object>} commits
     * @returns {Array<Object>}
     */
    function sortCommits(commits) {
        return commits.slice().sort((a, b) => {
            const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return timeB - timeA;
        });
    }

    // ==========================================================================
    // 4. GitHub API Fetching Pipeline (Two-Stage Architecture)
    // ==========================================================================

    /**
     * Fetches recent public commits authored by the user across recently active repositories.
     * 
     * Pipeline (per instructions algorithm):
     * 1. GET /users/{username}/repos?sort=pushed&per_page={MAX_REPOSITORIES_TO_CHECK}
     * 2. Select up to MAX_REPOSITORIES_TO_CHECK recently active repositories
     * 3. For each selected repo: GET /repos/{owner}/{repo}/commits?author={username}&per_page={maxCommits}
     * 4. Merge results from all repositories into one array
     * 5. Deduplicate using commit SHA (preferred) or commit URL
     * 6. Sort globally newest -> oldest by timestamp
     * 7. Limit to MAX_COMMITS
     * 
     * @param {string} username
     * @param {number} [maxCommits=MAX_COMMITS]
     * @param {number} [maxRepos=MAX_REPOSITORIES_TO_CHECK]
     * @returns {Promise<Array<Object>>} Normalized commits
     */
    async function fetchGitHubCommits(username, maxCommits = MAX_COMMITS, maxRepos = MAX_REPOSITORIES_TO_CHECK) {
        // Step 3 & 4: Get user's public repositories ordered by pushed date
        const reposUrl = API_ENDPOINTS.userRepos(username, maxRepos);
        const reposRes = await fetch(reposUrl, {
            headers: { 'Accept': 'application/vnd.github+json' }
        });

        if (!reposRes.ok) {
            throw new Error(`GitHub API error: ${reposRes.status} ${reposRes.statusText}`);
        }

        const repos = await reposRes.json();
        if (!Array.isArray(repos) || repos.length === 0) {
            return [];
        }

        // Step 4: Select up to maxRepos recently active repositories
        const selectedRepos = repos.slice(0, maxRepos);

        // Step 5: For each selected repository, fetch commits filtered by author=username
        const repoCommitPromises = selectedRepos.map(async (repo) => {
            try {
                const commitUrl = API_ENDPOINTS.repoCommits(repo.full_name, username, maxCommits);
                const cRes = await fetch(commitUrl, {
                    headers: { 'Accept': 'application/vnd.github+json' }
                });

                if (!cRes.ok) {
                    return [];
                }

                const rawCommits = await cRes.json();
                if (!Array.isArray(rawCommits)) {
                    return [];
                }

                const repoMeta = {
                    name: repo.name || '',
                    fullName: repo.full_name || repo.name || '',
                    htmlUrl: repo.html_url || `https://github.com/${repo.full_name || repo.name}`
                };

                return rawCommits
                    .map(raw => normalizeCommit(raw, repoMeta))
                    .filter(Boolean);
            } catch {
                return [];
            }
        });

        // Step 6: Combine everything into one array
        const commitBatches = await Promise.all(repoCommitPromises);
        const allCommits = commitBatches.flat();

        if (allCommits.length === 0) {
            return [];
        }

        // Step 8: Deduplicate
        const deduplicated = deduplicateCommits(allCommits);

        // Step 9: Sort newest to oldest
        const sorted = sortCommits(deduplicated);

        // Step 10: Limit to maxCommits
        return sorted.slice(0, maxCommits);
    }

    // ==========================================================================
    // 5. Safe DOM Rendering (Section 11, 12, 13, 16, 17)
    // ==========================================================================

    /**
     * Renders loading state inside container.
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
        label.textContent = 'Fetching recent commits...';

        wrapper.appendChild(spinner);
        wrapper.appendChild(label);
        container.appendChild(wrapper);
    }

    /**
     * Renders normalized commits feed inside container.
     * Uses textContent and safe DOM creation — no innerHTML.
     * 
     * @param {HTMLElement} container
     * @param {Array<Object>} commits
     */
    function renderCommits(container, commits) {
        container.textContent = '';
        container.classList.add('activity-container--loaded');
        container.classList.remove('activity-container--loading', 'activity-container--error');

        const list = document.createElement('div');
        list.className = 'activity-feed';
        list.setAttribute('role', 'feed');
        list.setAttribute('aria-label', 'Recent GitHub Commits');

        commits.forEach(commit => {
            const card = document.createElement('article');
            card.className = 'activity-card';

            // Top row: status dot + commit message linking to commit URL
            const headerRow = document.createElement('div');
            headerRow.className = 'activity-card-header';

            const dot = document.createElement('span');
            dot.className = 'activity-dot';
            dot.setAttribute('aria-hidden', 'true');

            const commitLink = document.createElement('a');
            commitLink.className = 'activity-commit-link';
            commitLink.href = commit.commitUrl;
            commitLink.target = '_blank';
            commitLink.rel = 'noopener noreferrer';
            commitLink.textContent = formatCommitMessage(commit.message);
            commitLink.title = commit.message; // Full commit message on hover

            headerRow.appendChild(dot);
            headerRow.appendChild(commitLink);

            // Meta row: repository link + relative timestamp
            const metaRow = document.createElement('div');
            metaRow.className = 'activity-card-meta';

            const repoLink = document.createElement('a');
            repoLink.className = 'activity-repo-link';
            repoLink.href = commit.repositoryUrl;
            repoLink.target = '_blank';
            repoLink.rel = 'noopener noreferrer';
            repoLink.textContent = commit.repository;

            const timeEl = document.createElement('time');
            timeEl.className = 'activity-time';
            if (commit.timestamp) {
                timeEl.setAttribute('datetime', commit.timestamp);
                const readableTime = new Date(commit.timestamp).toLocaleString();
                timeEl.title = readableTime;
            }
            timeEl.textContent = formatRelativeTime(commit.timestamp);

            const separator = document.createElement('span');
            separator.className = 'activity-meta-separator';
            separator.setAttribute('aria-hidden', 'true');
            separator.textContent = ' · ';

            metaRow.appendChild(repoLink);
            metaRow.appendChild(separator);
            metaRow.appendChild(timeEl);

            card.appendChild(headerRow);
            card.appendChild(metaRow);
            list.appendChild(card);
        });

        container.appendChild(list);
    }

    /**
     * Renders empty state when fetch succeeded but returned no commits.
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
        message.textContent = 'No recent commits to display.';

        wrapper.appendChild(message);
        container.appendChild(wrapper);
    }

    /**
     * Renders tasteful error state with retry button.
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
        message.textContent = "GitHub activity couldn't be loaded.";

        const retryBtn = document.createElement('button');
        retryBtn.type = 'button';
        retryBtn.className = 'activity-retry-btn';
        retryBtn.textContent = 'Retry';
        retryBtn.setAttribute('aria-label', 'Retry loading GitHub commits');

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
    // 6. Activity Controller Class
    // ==========================================================================

    class GitHubActivityController {
        /**
         * @param {Object} [options]
         */
        constructor(options = {}) {
            if (typeof options === 'string') {
                options = { containerSelector: options };
            }
            this.containerSelector = options.containerSelector || DEFAULT_CONTAINER_SELECTOR;
            this.username = options.username || GITHUB_USERNAME;
            this.maxCommits = options.maxCommits || MAX_COMMITS;
            this.maxRepositories = options.maxRepositories || MAX_REPOSITORIES_TO_CHECK;
            this.container = null;

            // Internal State
            this.state = {
                status: 'idle', // 'idle' | 'loading' | 'success' | 'empty' | 'error'
                commits: []
            };

            this.init();
        }

        /**
         * Resolve container element safely.
         * @returns {boolean}
         */
        init() {
            this.container = document.querySelector(this.containerSelector)
                || document.querySelector('.github-activity-container')
                || document.querySelector('[data-github-activity]');

            if (!this.container) {
                // Return gracefully if container is not present on current page
                return false;
            }

            // Prevent double-initialization
            if (this.container._githubActivityInitialized) {
                return true;
            }

            this.container._githubActivityInitialized = true;
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
                const commits = await fetchGitHubCommits(this.username, this.maxCommits, this.maxRepositories);

                if (!commits || commits.length === 0) {
                    this.state.status = 'empty';
                    this.state.commits = [];
                    renderEmpty(this.container);
                } else {
                    this.state.status = 'success';
                    this.state.commits = commits;
                    renderCommits(this.container, commits);
                }
            } catch {
                this.state.status = 'error';
                this.state.commits = [];
                renderError(this.container, () => this.load());
            }
        }
    }

    // ==========================================================================
    // 7. Initialization & Export (Section 19)
    // ==========================================================================

    /**
     * Initializes the GitHub Activity feed.
     * Exposed for main.js to call during application startup.
     * 
     * @param {Object} [options] Optional configuration overrides
     * @returns {GitHubActivityController|null} Initialized instance or null
     */
    function initGitHubActivity(options) {
        const controller = new GitHubActivityController(options);
        return controller.container ? controller : null;
    }

    // Expose initGitHubActivity globally on window
    if (typeof global !== 'undefined') {
        global.initGitHubActivity = initGitHubActivity;
        global.GitHubActivityController = GitHubActivityController;
    }

    // CommonJS support
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            initGitHubActivity,
            GitHubActivityController,
            formatCommitMessage,
            formatRelativeTime,
            normalizeCommit,
            deduplicateCommits,
            sortCommits,
            fetchGitHubCommits
        };
    }

})(typeof window !== 'undefined' ? window : this);
