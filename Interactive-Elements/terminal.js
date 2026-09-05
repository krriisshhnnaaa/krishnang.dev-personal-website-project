/**
 * ==============================================================================
 * terminal.js — Interactive Hero Terminal Controller
 * ==============================================================================
 * 
 * Functional Scope:
 * Controls ONLY the interactive CLI simulator in the hero section.
 * - Reads user input and parses commands
 * - Dispatches registered commands (hello, freelance, projects, project, help, clear)
 * - Renders terminal output safely via DOM nodes (XSS-safe, no innerHTML injection)
 * - Maintains command history for ArrowUp / ArrowDown navigation
 * - Smoothly navigates to page sections when requested (e.g., #freelancing)
 * - Safely redirects to verified GitHub repository URLs from a project registry
 * 
 * Architectural Boundaries:
 * - Does NOT fetch or render GitHub API data or blog API data
 * - Does NOT manage particle canvas, animations, or carousel behavior
 * - Does NOT own page initialization (exposes initTerminal() for main.js)
 * - Does NOT inject visual styles (styling is delegated to terminal.css)
 * ==============================================================================
 */

(function (global) {
    'use strict';

    // ==========================================================================
    // 1. Data Structures & Registries
    // ==========================================================================

    /**
     * Concise freelancing services information.
     * Stored in a data structure as specified, not hardcoded into command logic.
     */
    const FREELANCE_DATA = {
        title: "Freelance Services & Development Packages:",
        services: [
            "Full-Stack Web Development (HTML5, CSS3, Modern JavaScript, Next.js, Node.js)",
            "AI & Local LLM Integration (Custom tools, CLI agents, local model workflows)",
            "Database Design & API Development (MySQL, MongoDB, Redis, REST)",
            "Performance Optimization, Automation & Custom Scripting (Python, Bash)"
        ],
        targetSectionId: "freelance"
    };

    /**
     * Explicit project registry mapping identifiers to verified GitHub repositories.
     * Prevents arbitrary or dynamic URL construction.
     */
    const PROJECT_REGISTRY = {
        "harry-os": {
            id: "harry-os",
            name: "Harry OS",
            description: "Personal local quantized 7B LLM Linux terminal assistant",
            url: "https://github.com/krriisshhnnaaa/harry"
        },
        "chitkara-faculty-portal": {
            id: "chitkara-faculty-portal",
            name: "Chitkara Faculty Portal",
            description: "Searchable directory portal parsed from university faculty data",
            url: "https://github.com/krriisshhnnaaa/chitkara-faculty-portal"
        },
        "online-document-storage": {
            id: "online-document-storage",
            name: "Online Document Storage",
            description: "Encrypted web vault for secure document management",
            url: "https://github.com/krriisshhnnaaa/online-document-storage"
        },
        "research-paper-scroll": {
            id: "research-paper-scroll",
            name: "Research Paper Scroll",
            description: "Infinite feed reader consuming the arXiv API for astrophysics & AI",
            url: "https://github.com/krriisshhnnaaa/research-paper-scroll"
        }
    };

    /**
     * Case-insensitive alias lookup to accommodate user input variations.
     */
    const PROJECT_ALIASES = {
        "harry": "harry-os",
        "harryos": "harry-os",
        "chitkara": "chitkara-faculty-portal",
        "faculty": "chitkara-faculty-portal",
        "chitkara-faculty": "chitkara-faculty-portal",
        "faculty-portal": "chitkara-faculty-portal",
        "document-storage": "online-document-storage",
        "documents": "online-document-storage",
        "doc-storage": "online-document-storage",
        "research-paper": "research-paper-scroll",
        "paper-scroll": "research-paper-scroll",
        "arxiv": "research-paper-scroll"
    };

    /**
     * List of supported commands for the 'help' command.
     */
    const HELP_COMMANDS = [
        { cmd: "hello", desc: "Learn about me and my background" },
        { cmd: "freelance", desc: "View freelancing services and packages" },
        { cmd: "projects", desc: "List all featured projects" },
        { cmd: "project <name>", desc: "Open a specific project's GitHub repository" },
        { cmd: "help", desc: "Show available commands" },
        { cmd: "clear", desc: "Clear terminal screen" }
    ];

    // ==========================================================================
    // 2. Terminal Controller Class
    // ==========================================================================

    class HeroTerminal {
        /**
         * @param {Object} options Configuration overrides
         */
        constructor(options = {}) {
            this.containerSelector = options.containerSelector || '#terminal-widget';
            this.outputSelector = options.outputSelector || '.terminal-output';
            this.inputSelector = options.inputSelector || '.terminal-input';
            this.promptSelector = options.promptSelector || '.terminal-prompt-text';
            this.bodySelector = options.bodySelector || '.terminal-body';

            this.container = null;
            this.outputArea = null;
            this.input = null;
            this.body = null;
            this.promptText = 'guest@krishnang.dev:~$ ';

            // Session command history
            this.history = [];
            this.historyIndex = -1;
            this.currentDraft = '';

            this.initElements();
        }

        /**
         * Locate and bind to DOM elements.
         */
        initElements() {
            this.container = document.querySelector(this.containerSelector) 
                || document.querySelector('.terminal-card') 
                || document.querySelector('.terminal');

            if (!this.container) {
                // Return gracefully if terminal element is not present on the current page
                return false;
            }

            // Prevent double-initialization
            if (this.container._heroTerminalInitialized) {
                return true;
            }

            this.outputArea = this.container.querySelector(this.outputSelector);
            this.input = this.container.querySelector(this.inputSelector);
            this.body = this.container.querySelector(this.bodySelector) || this.outputArea || this.container;

            const promptEl = this.container.querySelector(this.promptSelector);
            if (promptEl && typeof promptEl.textContent === 'string' && promptEl.textContent.trim()) {
                this.promptText = promptEl.textContent.trim() + ' ';
            }

            if (!this.input || !this.outputArea) {
                return false;
            }

            this.bindEvents();
            this.container._heroTerminalInitialized = true;
            return true;
        }

        /**
         * Set up keyboard, form, and click event listeners.
         */
        bindEvents() {
            // Focus input when clicking anywhere inside the terminal
            this.container.addEventListener('click', () => {
                if (this.input) {
                    this.input.focus();
                }
            });

            // Handle keyboard input (Enter, ArrowUp, ArrowDown)
            this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));

            // Prevent form submission if input is wrapped in a <form>
            const parentForm = this.input.closest('form');
            if (parentForm) {
                parentForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                });
            }
        }

        /**
         * Keyboard navigation and command submission handler.
         */
        handleKeyDown(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const rawValue = this.input.value;
                this.executeCommandLine(rawValue);

                // Add non-empty commands to history
                if (rawValue.trim().length > 0) {
                    this.history.push(rawValue);
                }

                this.historyIndex = this.history.length;
                this.currentDraft = '';
                this.input.value = '';
                this.scrollToBottom();
            } else if (e.key === 'ArrowUp') {
                // Navigate backwards in history
                if (this.history.length === 0) return;
                e.preventDefault();

                if (this.historyIndex === this.history.length) {
                    this.currentDraft = this.input.value;
                }

                if (this.historyIndex > 0) {
                    this.historyIndex--;
                    this.input.value = this.history[this.historyIndex];
                    this.moveCursorToEnd();
                }
            } else if (e.key === 'ArrowDown') {
                // Navigate forward in history
                if (this.history.length === 0) return;
                e.preventDefault();

                if (this.historyIndex < this.history.length - 1) {
                    this.historyIndex++;
                    this.input.value = this.history[this.historyIndex];
                    this.moveCursorToEnd();
                } else if (this.historyIndex === this.history.length - 1) {
                    this.historyIndex = this.history.length;
                    this.input.value = this.currentDraft;
                    this.moveCursorToEnd();
                }
            }
        }

        /**
         * Move cursor to the end of the input field.
         */
        moveCursorToEnd() {
            if (this.input) {
                const len = this.input.value.length;
                this.input.setSelectionRange(len, len);
            }
        }

        /**
         * Scroll terminal body so the latest output and active prompt remain visible.
         */
        scrollToBottom() {
            if (this.body) {
                this.body.scrollTop = this.body.scrollHeight;
            }
        }

        // ======================================================================
        // 3. Command Parsing & Execution
        // ======================================================================

        /**
         * Parse and route raw command line input.
         * @param {string} rawInput
         */
        executeCommandLine(rawInput) {
            const trimmed = rawInput.trim();

            // Empty input handling: creates prompt line without error message
            if (!trimmed) {
                this.appendPromptLine('');
                return;
            }

            // Print the executed command line into terminal history
            this.appendPromptLine(trimmed);

            // Split into command name and arguments
            const tokens = trimmed.split(/\s+/);
            const command = tokens[0].toLowerCase();
            const args = tokens.slice(1);

            switch (command) {
                case 'hello':
                    this.cmdHello();
                    break;
                case 'freelance':
                    this.cmdFreelance();
                    break;
                case 'projects':
                    this.cmdProjects();
                    break;
                case 'project':
                    this.cmdProject(args);
                    break;
                case 'help':
                    this.cmdHelp();
                    break;
                case 'clear':
                    this.cmdClear();
                    break;
                default:
                    this.cmdUnknown(command);
                    break;
            }
        }

        // ======================================================================
        // 4. Command Implementations
        // ======================================================================

        /**
         * 'hello' command: Concise introduction of Krishnang.
         * Stays in the terminal; does NOT navigate anywhere.
         */
        cmdHello() {
            const lines = [
                "Hello! I'm Krishnang Pandey.",
                "- Status: 1st Year Student",
                "- University: Chitkara University, Rajpura",
                "- Degree / Specialization: B.Tech. CSE - AI/ML",
                "- Passion: Systems, intelligent applications, astrophysics & making things."
            ];
            this.appendOutputBlock(lines);
        }

        /**
         * 'freelance' command: Summarizes freelancing services & scrolls to section.
         */
        cmdFreelance() {
            const lines = [
                FREELANCE_DATA.title,
                ...FREELANCE_DATA.services.map(s => `  • ${s}`),
                "",
                "Opening freelancing section..."
            ];
            this.appendOutputBlock(lines);

            // Smoothly navigate / scroll to the freelancing section on the page
            this.navigateToSection(FREELANCE_DATA.targetSectionId);
        }

        /**
         * 'projects' command: Discovery command listing featured projects.
         */
        cmdProjects() {
            const projectKeys = Object.keys(PROJECT_REGISTRY);
            const lines = [
                "Available projects:",
                ...projectKeys.map((key, index) => {
                    const proj = PROJECT_REGISTRY[key];
                    return `  ${index + 1}. ${proj.id} — ${proj.description}`;
                }),
                "",
                "Type: project <project-name> to open a project repository on GitHub."
            ];
            this.appendOutputBlock(lines);
        }

        /**
         * 'project <name>' command: Looks up project and redirects to GitHub.
         * @param {string[]} args Command arguments
         */
        cmdProject(args) {
            if (!args || args.length === 0) {
                const lines = [
                    "Usage:",
                    "  project <project-name>",
                    "",
                    "Type \"projects\" to view available projects."
                ];
                this.appendOutputBlock(lines, 'terminal-warning');
                return;
            }

            const rawTarget = args.join('-').toLowerCase();
            const canonicalId = PROJECT_ALIASES[rawTarget] || rawTarget;
            const project = PROJECT_REGISTRY[canonicalId];

            if (!project) {
                const lines = [
                    `Project not found: "${args.join(' ')}"`,
                    "",
                    "Type \"projects\" to view available projects."
                ];
                this.appendOutputBlock(lines, 'terminal-error');
                return;
            }

            // Confirmed project found
            const lines = [
                `Opening ${project.name}...`,
                `Redirecting to Github`
            ];
            this.appendOutputBlock(lines, 'terminal-success');

            // Redirect user to the project GitHub repository
            this.redirectToUrl(project.url);
        }

        /**
         * 'help' command: Displays all supported commands and brief summaries.
         */
        cmdHelp() {
            const lines = ["Available commands:"];
            HELP_COMMANDS.forEach(item => {
                const cmdPadded = item.cmd.padEnd(16, ' ');
                lines.push(`  ${cmdPadded} ${item.desc}`);
            });
            this.appendOutputBlock(lines);
        }

        /**
         * 'clear' command: Clears the terminal screen without resetting any other state.
         */
        cmdClear() {
            if (this.outputArea) {
                this.outputArea.textContent = '';
            }
        }

        /**
         * Unknown command handler: Informs user gracefully without throwing exceptions.
         * @param {string} command
         */
        cmdUnknown(command) {
            const lines = [
                `Command not found: ${command}`,
                "",
                "Available commands:",
                "  hello",
                "  freelance",
                "  projects",
                "  project <name>",
                "  help",
                "  clear"
            ];
            this.appendOutputBlock(lines, 'terminal-error');
        }

        // ======================================================================
        // 5. Navigation & Redirection Helpers
        // ======================================================================

        /**
         * Smoothly scroll to a section on the page if the element exists.
         * Does not crash or fail if section is absent.
         * @param {string} sectionId
         */
        navigateToSection(sectionId) {
        const target = document.getElementById(sectionId);

        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }

            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        /**
         * Open a verified GitHub URL in a new tab, falling back to window.location.
         * @param {string} url
         */
        redirectToUrl(url) {
            try {
                const newTab = window.open(url, '_blank', 'noopener,noreferrer');
                if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
                    window.location.href = url;
                }
            } catch {
                window.location.href = url;
            }
        }

        // ======================================================================
        // 6. Safe DOM Output Rendering (Section 15 Security Compliance)
        // ======================================================================

        /**
         * Appends the user's executed command line to the output history.
         * Uses textContent to guarantee XSS prevention.
         * @param {string} text
         */
        appendPromptLine(text) {
            if (!this.outputArea) return;

            const lineEl = document.createElement('div');
            lineEl.className = 'terminal-line';

            const promptSpan = document.createElement('span');
            promptSpan.className = 'terminal-prompt-text';
            promptSpan.textContent = this.promptText;

            const cmdSpan = document.createElement('span');
            cmdSpan.className = 'terminal-command-text';
            cmdSpan.textContent = text;

            lineEl.appendChild(promptSpan);
            lineEl.appendChild(cmdSpan);
            this.outputArea.appendChild(lineEl);
        }

        /**
         * Appends a block of text lines safely to the terminal output area.
         * @param {string[]} lines
         * @param {string} [extraClass]
         */
        appendOutputBlock(lines, extraClass = '') {
            if (!this.outputArea) return;

            const blockEl = document.createElement('div');
            blockEl.className = extraClass 
                ? `terminal-output-block ${extraClass}` 
                : 'terminal-output-block';

            lines.forEach(line => {
                const lineDiv = document.createElement('div');
                lineDiv.className = 'terminal-output-line';
                // Preserve empty spacer lines
                lineDiv.textContent = line.length > 0 ? line : '\u00A0';
                blockEl.appendChild(lineDiv);
            });

            this.outputArea.appendChild(blockEl);
        }
    }

    // ==========================================================================
    // 7. Initialization & Export (Section 16 Specification Compliance)
    // ==========================================================================

    /**
     * Initializes the interactive hero terminal.
     * Exposed for main.js to call during page setup.
     * 
     * @param {Object} [options] Optional DOM selector overrides
     * @returns {HeroTerminal|null} Initialized terminal instance or null
     */
    function initTerminal(options) {
        const terminal = new HeroTerminal(options);
        return terminal.container ? terminal : null;
    }

    // Expose initTerminal globally on the window object
    if (typeof global !== 'undefined') {
        global.initTerminal = initTerminal;
    }

    // CommonJS support for test runners or bundlers
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { initTerminal, HeroTerminal };
    }

})(typeof window !== 'undefined' ? window : this);
