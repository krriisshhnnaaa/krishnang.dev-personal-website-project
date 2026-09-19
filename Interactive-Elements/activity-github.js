(function (global) {
    'use strict';

    const GITHUB_USERNAME = 'krriisshhnnaaa';

    const MAX_COMMITS = 6;

    const MAX_REPOSITORIES_TO_CHECK = 5;

    const MAX_MESSAGE_LENGTH = 72;

    const DEFAULT_CONTAINER_SELECTOR = '#github-activity';

    const API_ENDPOINTS = {
        userRepos: (username, limit) =>
            `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=pushed&per_page=${limit}`,
        repoCommits: (fullName, author, limit) =>
            `https://api.github.com/repos/${fullName}/commits?author=${encodeURIComponent(author)}&per_page=${limit}`
    };

    function formatCommitMessage(rawMessage, maxLength = MAX_MESSAGE_LENGTH) {
        if (!rawMessage || typeof rawMessage !== 'string') {
            return 'Commit update';
        }

        const firstLine = rawMessage.split(/\r?\n/)[0].trim();
        if (!firstLine) {
            return 'Commit update';
        }

        if (firstLine.length > maxLength) {
            return firstLine.slice(0, maxLength).trimEnd() + '...';
        }

        return firstLine;
    }

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

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }

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

    function sortCommits(commits) {
        return commits.slice().sort((a, b) => {
            const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return timeB - timeA;
        });
    }

    async function fetchGitHubCommits(username, maxCommits = MAX_COMMITS, maxRepos = MAX_REPOSITORIES_TO_CHECK) {
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

        const selectedRepos = repos.slice(0, maxRepos);

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

        const commitBatches = await Promise.all(repoCommitPromises);
        const allCommits = commitBatches.flat();

        if (allCommits.length === 0) {
            return [];
        }

        const deduplicated = deduplicateCommits(allCommits);

        const sorted = sortCommits(deduplicated);

        return sorted.slice(0, maxCommits);
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
        label.textContent = 'Fetching recent commits...';

        wrapper.appendChild(spinner);
        wrapper.appendChild(label);
        container.appendChild(wrapper);
    }

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
            commitLink.title = commit.message;

            headerRow.appendChild(dot);
            headerRow.appendChild(commitLink);

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

    class GitHubActivityController {
        constructor(options = {}) {
            if (typeof options === 'string') {
                options = { containerSelector: options };
            }
            this.containerSelector = options.containerSelector || DEFAULT_CONTAINER_SELECTOR;
            this.username = options.username || GITHUB_USERNAME;
            this.maxCommits = options.maxCommits || MAX_COMMITS;
            this.maxRepositories = options.maxRepositories || MAX_REPOSITORIES_TO_CHECK;
            this.container = null;

            this.state = {
                status: 'idle',
                commits: []
            };

            this.init();
        }

        init() {
            this.container = document.querySelector(this.containerSelector)
                || document.querySelector('.github-activity-container')
                || document.querySelector('[data-github-activity]');

            if (!this.container) {
                return false;
            }

            if (this.container._githubActivityInitialized) {
                return true;
            }

            this.container._githubActivityInitialized = true;
            this.load();
            return true;
        }

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

    function initGitHubActivity(options) {
        const controller = new GitHubActivityController(options);
        return controller.container ? controller : null;
    }

    if (typeof global !== 'undefined') {
        global.initGitHubActivity = initGitHubActivity;
        global.GitHubActivityController = GitHubActivityController;
    }

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
