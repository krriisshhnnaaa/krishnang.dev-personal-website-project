//javascript code goes here
 // ==========================================
// Cosmic Particle / Starfield Background
// ==========================================
class Starfield {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.maxParticles = 80;
        this.connectionDistance = 120;
        this.mouseX = null;
        this.mouseY = null;

        this.init();
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
        window.addEventListener('mouseleave', () => {
            this.mouseX = null;
            this.mouseY = null;
        });
    }

    init() {
        this.resize();
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles.push(this.createParticle());
        }
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticle() {
        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            radius: Math.random() * 2 + 0.5,
            color: Math.random() > 0.5 ? 'rgba(0, 242, 254, 0.4)' : 'rgba(79, 172, 254, 0.4)'
        };
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update and draw particles
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;

            // Boundary wrapping
            if (p.x < 0) p.x = this.canvas.width;
            if (p.x > this.canvas.width) p.x = 0;
            if (p.y < 0) p.y = this.canvas.height;
            if (p.y > this.canvas.height) p.y = 0;

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.shadowBlur = 6;
            this.ctx.shadowColor = p.color;
            this.ctx.fill();
        });

        // Draw connections (Neural network / Constellation effect)
        this.ctx.shadowBlur = 0; // Turn off shadow for performance during lines
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const p1 = this.particles[i];
                const p2 = this.particles[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < this.connectionDistance) {
                    const alpha = (1 - dist / this.connectionDistance) * 0.15;
                    this.ctx.strokeStyle = `rgba(0, 242, 254, ${alpha})`;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.stroke();
                }
            }

            // Connection to mouse
            if (this.mouseX !== null && this.mouseY !== null) {
                const p = this.particles[i];
                const dx = p.x - this.mouseX;
                const dy = p.y - this.mouseY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 150) {
                    const alpha = (1 - dist / 150) * 0.25;
                    this.ctx.strokeStyle = `rgba(79, 172, 254, ${alpha})`;
                    this.ctx.lineWidth = 0.8;
                    this.ctx.beginPath();
                    this.ctx.moveTo(p.x, p.y);
                    this.ctx.lineTo(this.mouseX, this.mouseY);
                    this.ctx.stroke();
                }
            }
        }

        requestAnimationFrame(() => this.animate());
    }
}

// ==========================================
// Interactive Terminal Widget ("Harry OS")
// ==========================================
class Terminal {
    constructor() {
        this.container = document.getElementById('terminal-widget');
        if (!this.container) return;

        this.input = this.container.querySelector('.terminal-input');
        this.outputArea = this.container.querySelector('.terminal-output');
        this.promptText = this.container.querySelector('.terminal-prompt-text').textContent;

        this.history = [];
        this.historyIndex = -1;

        this.commands = {
            help: () => `
Available commands:
  <span class="cmd">about</span>      - Learn who is Krishnang
  <span class="cmd">skills</span>     - View technical skill catalog
  <span class="cmd">projects</span>   - Highlighted portfolio projects
  <span class="cmd">contact</span>    - Show developer contact links
  <span class="cmd">clear</span>      - Clear terminal window
  <span class="cmd">system</span>     - System diagnostics
  <span class="cmd">secret</span>     - Solve an astrophysical query
`,
            about: () => `
<span class="highlight">Krishnang (krishnang.dev)</span>
---------------------------------------------
Student: B.Tech CSE - AI/ML (1st Year)
College: Chitkara University, Rajpura
Interest: Coding, physics, astrophysics, AI/ML, teaching, making and breaking things.
Freelance: Secured 4.9+ rating and 3 clients within 2 weeks of launching.
`,
            skills: () => `
<span class="highlight">Languages:</span> Python, SQL, HTML, CSS, JavaScript
<span class="highlight">Libraries & Frameworks:</span> Redux, Node.js, Next.js, React
<span class="highlight">Databases:</span> MySQL, MongoDB, Redis
<span class="highlight">Tools & Systems:</span> Git, GitHub Actions, Linux (Bash scripting)
`,
            projects: () => `
<span class="highlight">1. Harry:</span> Linux terminal guide running a local 7B Quantized LLM inside your CLI.
<span class="highlight">2. Chitkara Faculty Portal:</span> Highly searchable database portal to sort faculty.
<span class="highlight">3. Online Document Storage:</span> Secure Web3/Cloud storage vault.
<span class="highlight">4. Research Paper Scroll:</span> Interactive mobile-friendly feed consuming arXiv API.
`,
            contact: () => `
<span class="highlight">Email:</span> krishnang.dev@gmail.com
<span class="highlight">Github:</span> <a href="https://github.com" target="_blank" class="term-link">github.com</a>
<span class="highlight">LinkedIn:</span> <a href="https://linkedin.com" target="_blank" class="term-link">linkedin.com</a>
`,
            system: () => `
OS: Harry OS v1.0.0-beta
CPU: Virtual Neural Processing Unit (vNPU)
Kernel: WebKit/Blink Sandbox v2026.6.16
Uptime: ${Math.floor(performance.now() / 1000)}s
Status: <span class="success">ONLINE</span> (Healthy)
`,
            secret: () => `
<span class="warn">CRITICAL ALERT: Astrophysicists scan detected.</span>
Question: What is the escape velocity of a Black Hole at its event horizon?
Answer: The speed of light (c) â‰ˆ 299,792,458 m/s. Beyond this boundary, the spacetime curvature becomes infinite!
`,
            clear: () => {
                this.outputArea.innerHTML = '';
                return '';
            }
        };

        this.init();
    }

    init() {
        this.input.addEventListener('keydown', (e) => this.handleInput(e));
        // Keep focus on terminal when clicking terminal background
        this.container.addEventListener('click', () => this.input.focus());
        
        // Print welcome message
        this.print(`Welcome to Harry OS Lite (v1.0.0)
Type <span class="cmd">help</span> for a list of available CLI commands.
`);
    }

    handleInput(e) {
        if (e.key === 'Enter') {
            const commandLine = this.input.value.trim();
            this.input.value = '';

            if (commandLine) {
                this.history.push(commandLine);
                this.historyIndex = this.history.length;
                this.executeCommand(commandLine);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.input.value = this.history[this.historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
                this.input.value = this.history[this.historyIndex];
            } else {
                this.historyIndex = this.history.length;
                this.input.value = '';
            }
        }
    }

    executeCommand(cmdLine) {
        const parts = cmdLine.toLowerCase().split(' ');
        const mainCmd = parts[0];

        // Print input prompt line first
        this.print(`<div class="terminal-line"><span class="terminal-prompt-text">${this.promptText}</span> ${cmdLine}</div>`);

        if (this.commands[mainCmd]) {
            const result = this.commands[mainCmd]();
            if (result) {
                this.print(result);
            }
        } else {
            this.print(`<span class="error">Command not found: "${mainCmd}". Type 'help' to view suggestions.</span>`);
        }

        // Auto scroll terminal to bottom
        this.container.querySelector('.terminal-body').scrollTop = this.container.querySelector('.terminal-body').scrollHeight;
    }

    print(text) {
        const div = document.createElement('div');
        div.className = 'terminal-line-output';
        div.innerHTML = text;
        this.outputArea.appendChild(div);
    }
}

// ==========================================
// Projects Filter System & Theme Animations
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Initialize Particles background
    new Starfield('particle-canvas');

    // Initialize Terminal Simulator
    new Terminal();

    // Scroll styling effect on Header
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Skills Interactive Glow
    const skillItems = document.querySelectorAll('.skills-card li');
    skillItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            const colors = ['#00f2fe', '#4facfe', '#a855f7', '#ec4899', '#3b82f6'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            item.style.borderColor = randomColor;
            item.style.boxShadow = `0 0 10px ${randomColor}33`;
        });
        item.addEventListener('mouseleave', () => {
            item.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            item.style.boxShadow = 'none';
        });
    });

    // Projects Category Filtering
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active status from others, add to current
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const category = btn.getAttribute('data-filter');

            projectCards.forEach(card => {
                const tags = card.getAttribute('data-tags') || '';
                if (category === 'all' || tags.includes(category)) {
                    card.style.display = 'block';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'scale(1)';
                    }, 50);
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        card.style.display = 'none';
                    }, 300);
                }
            });
        });
    });

    // Social Media Activity Feed Filtering
    const feedTabs = document.querySelectorAll('.feed-tab');
    const feedPosts = document.querySelectorAll('.feed-post');

    feedTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            feedTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const platform = tab.getAttribute('data-platform');

            feedPosts.forEach(post => {
                const postPlatform = post.getAttribute('data-platform');
                if (platform === 'all' || postPlatform === platform) {
                    post.style.display = 'block';
                    setTimeout(() => {
                        post.style.opacity = '1';
                        post.style.transform = 'translateY(0)';
                    }, 50);
                } else {
                    post.style.opacity = '0';
                    post.style.transform = 'translateY(10px)';
                    setTimeout(() => {
                        post.style.display = 'none';
                    }, 300);
                }
            });
        });
    });
});

const GITHUB_USERNAME = "krriisshhnnaaa";
const HYGRAPH_ENDPOINT = "https://ap-south-1.cdn.hygraph.com/content/cmrozug811d9n07pi8f11cm7y/master";
const HYGRAPH_AUTHOR_ID = "cmrozug811d9n07pi8f11cm7y";

function escapeHTML(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function loadGitHubActivity() {
    try {
        const res = await fetch(
            `https://api.github.com/users/${GITHUB_USERNAME}/events/public`
        );

        if (!res.ok) {
            throw new Error(`GitHub API returned ${res.status}`);
        }

        const events = await res.json();

        if (!events.length) {
            return `
                <div class="feed-post" data-platform="github">
                    <p>No recent public GitHub activity found.</p>
                </div>
            `;
        }

        return events.slice(0, 5).map(event => {
            const repo = escapeHTML(event.repo?.name || "GitHub");
            const type = escapeHTML(event.type.replace("Event", ""));
            const time = new Date(event.created_at).toLocaleString();

            return `
                <div class="feed-post" data-platform="github">
                    <div class="post-header">
                        <i data-lucide="github" class="post-icon gh-icon"></i>
                        <div class="post-meta">
                            <span class="post-author">Krishnang on <strong>${repo}</strong></span>
                            <span class="post-time">${time}</span>
                        </div>
                    </div>
                    <div class="post-content">
                        <p>${type} activity on GitHub.</p>
                    </div>
                </div>
            `;
        }).join("");

    } catch (err) {
        console.error(err);

        return `
            <div class="feed-post" data-platform="github">
                <p>Couldn't load GitHub activity.</p>
            </div>
        `;
    }
}

async function loadLinkedInPosts() {
    const query = `
        query {
            posts(
                where: {
                    author: {
                        id: "${HYGRAPH_AUTHOR_ID}"
                    }
                }
                orderBy: publishedAt_DESC
                first: 5
            ) {
                title
                slug
                publishedAt
                excerpt
            }
        }
    `;

    try {
        const res = await fetch(HYGRAPH_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ query })
        });

        if (!res.ok) {
            throw new Error(`Hygraph returned ${res.status}`);
        }

        const { data, errors } = await res.json();

        if (errors?.length) {
            throw new Error(errors[0].message);
        }

        const posts = data?.posts || [];

        if (!posts.length) {
            return `
                <div class="feed-post" data-platform="linkedin">
                    <p>No Hygraph posts found.</p>
                </div>
            `;
        }

        return posts.map(post => {
            const title = escapeHTML(post.title);
            const excerpt = escapeHTML(post.excerpt || "");
            const time = post.publishedAt
                ? new Date(post.publishedAt).toLocaleDateString()
                : "Recently";

            return `
                <div class="feed-post" data-platform="linkedin">
                    <div class="post-header">
                        <i data-lucide="linkedin" class="post-icon li-icon"></i>
                        <div class="post-meta">
                            <span class="post-author">Krishnang</span>
                            <span class="post-time">${time}</span>
                        </div>
                    </div>
                    <div class="post-content">
                        <h4>${title}</h4>
                        <p>${excerpt}</p>
                    </div>
                </div>
            `;
        }).join("");

    } catch (err) {
        console.error(err);

        return `
            <div class="feed-post" data-platform="linkedin">
                <p>Couldn't load LinkedIn-style posts from Hygraph.</p>
            </div>
        `;
    }
}

function setupFeedFilters() {
    const feedTabs = document.querySelectorAll(".feed-tab");

    feedTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            feedTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            const platform = tab.getAttribute("data-platform");
            const feedPosts = document.querySelectorAll(".feed-post");

            feedPosts.forEach(post => {
                const postPlatform = post.getAttribute("data-platform");

                if (platform === "all" || postPlatform === platform) {
                    post.style.display = "block";
                    setTimeout(() => {
                        post.style.opacity = "1";
                        post.style.transform = "translateY(0)";
                    }, 50);
                } else {
                    post.style.opacity = "0";
                    post.style.transform = "translateY(10px)";
                    setTimeout(() => {
                        post.style.display = "none";
                    }, 300);
                }
            });
        });
    });
}

async function loadActivityFeed() {
    const feedStream = document.querySelector(".feed-stream");

    if (!feedStream) return;

    feedStream.innerHTML = "<p>Loading activity...</p>";

    const [githubPosts, linkedinPosts] = await Promise.all([
        loadGitHubActivity(),
        loadLinkedInPosts()
    ]);

    feedStream.innerHTML = githubPosts + linkedinPosts;

    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }

    setupFeedFilters();
}

document.addEventListener("DOMContentLoaded", () => {
    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }

    new Starfield("particle-canvas");
    new Terminal();

    const header = document.querySelector("header");

    window.addEventListener("scroll", () => {
        if (window.scrollY > 50) {
            header.classList.add("scrolled");
        } else {
            header.classList.remove("scrolled");
        }
    });

    const skillItems = document.querySelectorAll(".skills-card li");

    skillItems.forEach(item => {
        item.addEventListener("mouseenter", () => {
            const colors = ["#00f2fe", "#4facfe", "#a855f7", "#ec4899", "#3b82f6"];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            item.style.borderColor = randomColor;
            item.style.boxShadow = `0 0 10px ${randomColor}33`;
        });

        item.addEventListener("mouseleave", () => {
            item.style.borderColor = "rgba(255, 255, 255, 0.1)";
            item.style.boxShadow = "none";
        });
    });

    const filterButtons = document.querySelectorAll(".filter-btn");
    const projectCards = document.querySelectorAll(".project-card");

    filterButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            filterButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const category = btn.getAttribute("data-filter");

            projectCards.forEach(card => {
                const tags = card.getAttribute("data-tags") || "";

                if (category === "all" || tags.includes(category)) {
                    card.style.display = "block";
                    setTimeout(() => {
                        card.style.opacity = "1";
                        card.style.transform = "scale(1)";
                    }, 50);
                } else {
                    card.style.opacity = "0";
                    card.style.transform = "scale(0.95)";
                    setTimeout(() => {
                        card.style.display = "none";
                    }, 300);
                }
            });
        });
    });

    loadActivityFeed();
});

