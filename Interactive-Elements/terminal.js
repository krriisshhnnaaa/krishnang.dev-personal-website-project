(function (global) {
    'use strict';

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

    const HELP_COMMANDS = [
        { cmd: "hello", desc: "Learn about me and my background" },
        { cmd: "freelance", desc: "View freelancing services and packages" },
        { cmd: "projects", desc: "List all featured projects" },
        { cmd: "project <name>", desc: "Open a specific project's GitHub repository" },
        { cmd: "help", desc: "Show available commands" },
        { cmd: "clear", desc: "Clear terminal screen" }
    ];

    class HeroTerminal {
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

            this.history = [];
            this.historyIndex = -1;
            this.currentDraft = '';

            this.initElements();
        }

        initElements() {
            this.container = document.querySelector(this.containerSelector) 
                || document.querySelector('.terminal-card') 
                || document.querySelector('.terminal');

            if (!this.container) {
                return false;
            }

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

        bindEvents() {
            this.container.addEventListener('click', () => {
                if (this.input) {
                    this.input.focus();
                }
            });

            this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));

            const parentForm = this.input.closest('form');
            if (parentForm) {
                parentForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                });
            }
        }

        handleKeyDown(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const rawValue = this.input.value;
                this.executeCommandLine(rawValue);

                if (rawValue.trim().length > 0) {
                    this.history.push(rawValue);
                }

                this.historyIndex = this.history.length;
                this.currentDraft = '';
                this.input.value = '';
                this.scrollToBottom();
            } else if (e.key === 'ArrowUp') {
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

        moveCursorToEnd() {
            if (this.input) {
                const len = this.input.value.length;
                this.input.setSelectionRange(len, len);
            }
        }

        scrollToBottom() {
            if (this.body) {
                this.body.scrollTop = this.body.scrollHeight;
            }
        }

        executeCommandLine(rawInput) {
            const trimmed = rawInput.trim();

            if (!trimmed) {
                this.appendPromptLine('');
                return;
            }

            this.appendPromptLine(trimmed);

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

        cmdFreelance() {
            const lines = [
                FREELANCE_DATA.title,
                ...FREELANCE_DATA.services.map(s => `  • ${s}`),
                "",
                "Opening freelancing section..."
            ];
            this.appendOutputBlock(lines);

            this.navigateToSection(FREELANCE_DATA.targetSectionId);
        }

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

            const lines = [
                `Opening ${project.name}...`,
                `Redirecting to Github`
            ];
            this.appendOutputBlock(lines, 'terminal-success');

            this.redirectToUrl(project.url);
        }

        cmdHelp() {
            const lines = ["Available commands:"];
            HELP_COMMANDS.forEach(item => {
                const cmdPadded = item.cmd.padEnd(16, ' ');
                lines.push(`  ${cmdPadded} ${item.desc}`);
            });
            this.appendOutputBlock(lines);
        }

        cmdClear() {
            if (this.outputArea) {
                this.outputArea.textContent = '';
            }
        }

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

        appendOutputBlock(lines, extraClass = '') {
            if (!this.outputArea) return;

            const blockEl = document.createElement('div');
            blockEl.className = extraClass 
                ? `terminal-output-block ${extraClass}` 
                : 'terminal-output-block';

            lines.forEach(line => {
                const lineDiv = document.createElement('div');
                lineDiv.className = 'terminal-output-line';
                lineDiv.textContent = line.length > 0 ? line : '\u00A0';
                blockEl.appendChild(lineDiv);
            });

            this.outputArea.appendChild(blockEl);
        }
    }

    function initTerminal(options) {
        const terminal = new HeroTerminal(options);
        return terminal.container ? terminal : null;
    }

    if (typeof global !== 'undefined') {
        global.initTerminal = initTerminal;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { initTerminal, HeroTerminal };
    }

})(typeof window !== 'undefined' ? window : this);
