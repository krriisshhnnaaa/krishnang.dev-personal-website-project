/**
 * ==============================================================================
 * bg-animations.js (background-animations.js)
 * Cosmic Background & Primordial Gravitational Field Controller
 * ==============================================================================
 * 
 * Functional Scope & Architectural Distinction (per instructions):
 * - Controls the site's ambient cosmic background.
 * - Resembles a very dark, empty region of space containing sparse cosmic dust
 *   and many tiny star-like particles.
 * - Main interactive effect: cursor-induced gravitational field behaving
 *   conceptually like a primordial black hole with radial & tangential warping
 *   (spacetime distortion / gravitational lensing).
 * - Particles maintain permanent base positions ("home") and smoothly return
 *   when the cursor leaves or moves away.
 * - Physics are subtle, physical, lightweight, and O(N) per animation frame.
 * 
 * Architecture & Data Flow:
 * 
 *              cursor
 *                │
 *                ▼
 *        pointer position
 *                │
 *                ▼
 *         gravitational field
 *                │
 *         ┌──────┴──────┐
 *         ▼             ▼
 *  radial influence   tangential influence
 *         │             │
 *         └──────┬──────┘
 *                ▼
 *        particle target
 *                │
 *                ▼
 *        smooth interpolation
 *                │
 *                ▼
 *           canvas render
 *                │
 *                ▼
 *             screen
 * 
 * Architectural Boundaries:
 * - What this module OWNS:
 *   1. Canvas creation and high-DPI scaling
 *   2. Particle field generation & state tracking (base vs current position)
 *   3. Autonomous subtle cosmic drift (sine/cosine phase movement)
 *   4. Pointer tracking & smooth active state transitions
 *   5. Gravitational distance & smoothstep falloff calculations
 *   6. Radial & tangential displacement vectors (gravitational lensing)
 *   7. Gradual particle restoration toward base coordinates
 *   8. Optimized requestAnimationFrame animation loop
 *   9. Responsive resize handling with coordinate rescaling (no regeneration)
 *   10. Teardown, listener cleanup, and multi-init protection
 * 
 * - What this module DOES NOT own:
 *   1. Page navigation
 *   2. Terminal behavior
 *   3. Blog rendering / fetching
 *   4. Education book animations
 *   5. Logo animations
 *   6. Colors/theme definitions
 *   7. Typography
 *   8. General page styling
 * ==============================================================================
 */

(function (global) {
    'use strict';

    // ==========================================================================
    // 1. Configuration & Tunable Constants
    // ==========================================================================

    /**
     * Default configuration for cosmic background animations.
     * All properties can be overridden via options passed to initBackgroundAnimations().
     */
    const DEFAULT_CONFIG = {
        // DOM Selectors & IDs
        canvasId: 'background-canvas',
        canvasClass: 'background-canvas',
        container: null, // null defaults to document.body

        // Particle Population
        particleCount: 100, // per instructions specification: PARTICLE_COUNT = 100

        // Visual Categories (tiny dust majority, normal, rare bright)
        categories: {
            dust: {
                ratio: 0.72, // 72% tiny faint dust
                minSize: 0.45,
                maxSize: 0.90,
                minOpacity: 0.15,
                maxOpacity: 0.35,
                driftSpeedMin: 0.25,
                driftSpeedMax: 0.65,
                driftAmountMin: 0.8,
                driftAmountMax: 1.8
            },
            normal: {
                ratio: 0.21, // 21% small, slightly brighter stars
                minSize: 0.95,
                maxSize: 1.50,
                minOpacity: 0.35,
                maxOpacity: 0.65,
                driftSpeedMin: 0.35,
                driftSpeedMax: 0.85,
                driftAmountMin: 1.2,
                driftAmountMax: 2.2
            },
            bright: {
                ratio: 0.07, // 7% rare, slightly brighter/larger
                minSize: 1.55,
                maxSize: 2.20,
                minOpacity: 0.65,
                maxOpacity: 0.88,
                driftSpeedMin: 0.45,
                driftSpeedMax: 1.05,
                driftAmountMin: 1.5,
                driftAmountMax: 2.6
            }
        },

        // Color palette: soft cosmic white, subtle cyan, and ethereal purple tints
        colors: [
            'rgba(244, 244, 249, ', // Starlight white (majority)
            'rgba(244, 244, 249, ', 
            'rgba(244, 244, 249, ', 
            'rgba(220, 226, 245, ', // Cool nebula white
            'rgba(0, 242, 254, ',   // Subtle electric cyan
            'rgba(168, 85, 247, '   // Subtle cosmic purple
        ],

        // Gravitational Interaction Field (primordial black hole simulation)
        influenceRadius: 200,      // INFLUENCE_RADIUS: boundary of gravitational field (px)
        gravityStrength: 42,       // GRAVITY_STRENGTH: radial displacement pull toward cursor
        tangentialStrength: 28,   // TANGENTIAL_STRENGTH: tangential gravitational lensing swirl
        driftAmount: 1.8,          // DRIFT_AMOUNT: amplitude of autonomous cosmic drift
        returnSpeed: 0.065,        // RETURN_SPEED: easing factor toward target position
        maxParticleSpeed: 14,      // MAX_PARTICLE_SPEED: maximum per-frame displacement cap

        // Display & Rendering
        maxDpr: 2,                 // Maximum devicePixelRatio cap for high-DPI displays
        zIndex: -1,                // Canvas z-index hierarchy (sits behind content)
        enableSwirl: true,         // Enable tangential lensing distortion
        enableDrift: true,         // Enable subtle autonomous breathing/drift
        resizeDebounceMs: 120      // Debounce delay for resize recalculations
    };

    /**
     * Active instances registry to prevent duplicate loops or orphaned event listeners.
     */
    const activeInstances = new Set();

    // ==========================================================================
    // 2. Mathematical Helpers
    // ==========================================================================

    /**
     * Standard Hermite smoothstep function.
     * Produces a smooth S-curve interpolation between 0 and 1 with zero derivatives at edges.
     * 
     * @param {number} min - Lower bound
     * @param {number} max - Upper bound
     * @param {number} value - Input value
     * @returns {number} Interpolated value clamped to [0, 1]
     */
    function smoothstep(min, max, value) {
        const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
        return x * x * (3 - 2 * x);
    }

    /**
     * Generates a pseudo-random floating point number in [min, max).
     * 
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random value
     */
    function randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    /**
     * Selects a random element from an array.
     * 
     * @param {Array} arr - Source array
     * @returns {*} Random item
     */
    function randomChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // ==========================================================================
    // 3. BackgroundAnimations Controller Class
    // ==========================================================================

    class BackgroundAnimations {
        /**
         * @param {Object} [options] - User configuration overrides
         */
        constructor(options = {}) {
            // Merge user configuration with defaults
            this.config = Object.assign({}, DEFAULT_CONFIG, options);
            if (options.categories) {
                this.config.categories = Object.assign({}, DEFAULT_CONFIG.categories, options.categories);
            }

            // Lifecycle State
            this.isRunning = false;
            this.isDestroyed = false;
            this.animationFrameId = null;
            this.resizeTimeoutId = null;
            this.startTime = performance.now();
            this.lastFrameTime = this.startTime;

            // Canvas & Context references
            this.container = null;
            this.canvas = null;
            this.ctx = null;
            this.isDynamicCanvas = false;

            // Viewport dimensions & scaling
            this.width = 0;
            this.height = 0;
            this.dpr = 1;

            // Particle Collection
            this.particles = [];

            // Pointer / Mouse State (Primordial Black Hole)
            this.mouse = {
                x: -9999,
                y: -9999,
                active: false
            };

            // Bound Event Listeners (stored for precise cleanup)
            this._onPointerMove = this._onPointerMove.bind(this);
            this._onPointerLeave = this._onPointerLeave.bind(this);
            this._onWindowBlur = this._onWindowBlur.bind(this);
            this._onWindowResize = this._onWindowResize.bind(this);
            this._onVisibilityChange = this._onVisibilityChange.bind(this);
            this._animate = this._animate.bind(this);

            // Initialize Module
            this._init();
        }

        // ======================================================================
        // 4. Canvas Setup & High-DPI Display Scaling
        // ======================================================================

        /**
         * Resolves or creates the background canvas and configures high-DPI scaling.
         * @private
         */
        _setupCanvas() {
            // Resolve container element
            if (typeof this.config.container === 'string' && typeof document !== 'undefined') {
                this.container = document.querySelector(this.config.container);
            } else if (this.config.container && (typeof HTMLElement !== 'undefined' ? this.config.container instanceof HTMLElement : this.config.container.nodeType === 1)) {
                this.container = this.config.container;
            }

            if (!this.container && typeof document !== 'undefined') {
                this.container = document.body;
            }

            // Look for existing canvas with configured ID
            let canvas = document.getElementById(this.config.canvasId);

            if (!canvas) {
                // Dynamically create background canvas element
                canvas = document.createElement('canvas');
                canvas.id = this.config.canvasId;
                canvas.className = this.config.canvasClass;
                this.isDynamicCanvas = true;

                // Ensure canvas is placed cleanly at the beginning of the container
                if (this.container && this.container.firstChild) {
                    this.container.insertBefore(canvas, this.container.firstChild);
                } else if (this.container) {
                    this.container.appendChild(canvas);
                }
            }

            this.canvas = canvas;
            this.ctx = canvas && canvas.getContext ? canvas.getContext('2d', { alpha: true }) : null;

            if (!this.ctx) {
                return false;
            }

            // Apply foundational CSS styles to sit behind page content without capturing pointer events
            this._applyCanvasStyles();

            // Set initial dimensions and DPI scale
            this._updateCanvasSize(false);

            return true;
        }

        /**
         * Applies required positioning and pointer pass-through styles to the canvas.
         * @private
         */
        _applyCanvasStyles() {
            if (!this.canvas) return;
            const s = this.canvas.style;
            s.position = 'fixed';
            s.top = '0';
            s.left = '0';
            s.width = '100vw';
            s.height = '100vh';
            s.pointerEvents = 'none'; // Essential: must not block user interactions
            s.zIndex = String(this.config.zIndex);
            s.display = 'block';
        }

        /**
         * Updates canvas drawing resolution and CSS dimensions according to devicePixelRatio.
         * Rescales particle positions proportionally if viewport dimensions changed.
         * 
         * @param {boolean} [rescaleParticles=true] - Whether to rescale existing particle positions
         * @private
         */
        _updateCanvasSize(rescaleParticles = true) {
            if (!this.canvas || !this.ctx) return;

            const prevWidth = this.width;
            const prevHeight = this.height;

            const isBody = (!this.container || this.container === document.body);
            const newWidth = isBody 
                ? (window.innerWidth || (document.documentElement && document.documentElement.clientWidth) || 1024) 
                : (this.container.clientWidth || window.innerWidth || 1024);
            const newHeight = isBody 
                ? (window.innerHeight || (document.documentElement && document.documentElement.clientHeight) || 768) 
                : (this.container.clientHeight || window.innerHeight || 768);

            // Determine devicePixelRatio capped by maxDpr for performance
            const rawDpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
            const dpr = Math.min(rawDpr, this.config.maxDpr);

            this.width = newWidth;
            this.height = newHeight;
            this.dpr = dpr;

            // Physical canvas pixel buffer size
            this.canvas.width = Math.max(1, Math.floor(newWidth * dpr));
            this.canvas.height = Math.max(1, Math.floor(newHeight * dpr));

            // CSS display size
            this.canvas.style.width = `${newWidth}px`;
            this.canvas.style.height = `${newHeight}px`;

            // Reset transform and scale 2D context for High-DPI rendering
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.scale(dpr, dpr);

            // Rescale particle positions proportionally (without regenerating them)
            if (rescaleParticles && prevWidth > 0 && prevHeight > 0 &&
                (prevWidth !== newWidth || prevHeight !== newHeight) && this.particles.length > 0) {
                const scaleX = newWidth / prevWidth;
                const scaleY = newHeight / prevHeight;

                for (let i = 0; i < this.particles.length; i++) {
                    const p = this.particles[i];
                    p.baseX *= scaleX;
                    p.baseY *= scaleY;
                    p.x *= scaleX;
                    p.y *= scaleY;
                }
            }
        }

        // ======================================================================
        // 5. Particle Creation & Core Model
        // ======================================================================

        /**
         * Spawns a field of randomly distributed particles across the canvas.
         * 
         * Avoids deliberate geometric structures (galaxies, constellations, spirals).
         * Separates baseX/baseY (permanent home) from x/y (current rendered position).
         * 
         * @param {number} count - Total particle count
         * @private
         */
        _createParticles(count) {
            this.particles = [];
            const w = this.width || (typeof window !== 'undefined' ? window.innerWidth : 1024);
            const h = this.height || (typeof window !== 'undefined' ? window.innerHeight : 768);
            const cats = this.config.categories;

            for (let i = 0; i < count; i++) {
                // Determine particle category based on defined ratios
                const roll = Math.random();
                let catName = 'dust';
                let catConfig = cats.dust;

                if (roll < cats.dust.ratio) {
                    catName = 'dust';
                    catConfig = cats.dust;
                } else if (roll < (cats.dust.ratio + cats.normal.ratio)) {
                    catName = 'normal';
                    catConfig = cats.normal;
                } else {
                    catName = 'bright';
                    catConfig = cats.bright;
                }

                // Random uniform cosmic distribution across visible area
                const baseX = randomRange(0, w);
                const baseY = randomRange(0, h);

                // Distinct attributes for organic variation
                const size = randomRange(catConfig.minSize, catConfig.maxSize);
                const opacity = randomRange(catConfig.minOpacity, catConfig.maxOpacity);
                const driftSpeed = randomRange(catConfig.driftSpeedMin, catConfig.driftSpeedMax);
                const driftAmount = randomRange(catConfig.driftAmountMin, catConfig.driftAmountMax);
                const phase = randomRange(0, Math.PI * 2);
                const phaseY = randomRange(0, Math.PI * 2);
                const colorPrefix = randomChoice(this.config.colors);

                // Tangential swirl orientation (+1 or -1 for subtle dynamic counter-lensing)
                const spin = Math.random() > 0.15 ? 1 : -1;

                this.particles.push({
                    // Current dynamic rendered position
                    x: baseX,
                    y: baseY,

                    // Permanent cosmic rest position (home)
                    baseX: baseX,
                    baseY: baseY,

                    // Instantaneous velocity
                    vx: 0,
                    vy: 0,

                    // Visual attributes
                    size: size,
                    opacity: opacity,
                    baseOpacity: opacity,
                    colorPrefix: colorPrefix,
                    type: catName,

                    // Autonomous drift properties
                    driftSpeed: driftSpeed,
                    driftAmount: driftAmount,
                    phase: phase,
                    phaseY: phaseY,

                    // Tangential swirl direction
                    spin: spin
                });
            }
        }

        // ======================================================================
        // 6. Pointer & Cursor Tracking
        // ======================================================================

        /**
         * Tracks pointer coordinates relative to the canvas.
         * 
         * @param {PointerEvent|MouseEvent} e
         * @private
         */
        _onPointerMove(e) {
            if (!this.canvas) return;

            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
            this.mouse.active = true;
        }

        /**
         * Deactivates cursor gravitational pull when pointer leaves the window.
         * @private
         */
        _onPointerLeave() {
            this.mouse.active = false;
        }

        /**
         * Handles window blur to deactivate cursor gravity.
         * @private
         */
        _onWindowBlur() {
            this.mouse.active = false;
        }

        /**
         * Handles tab visibility changes to pause/resume RAF cleanly and save resources.
         * @private
         */
        _onVisibilityChange() {
            if (typeof document === 'undefined') return;

            if (document.hidden) {
                this.mouse.active = false;
                if (this.animationFrameId) {
                    cancelAnimationFrame(this.animationFrameId);
                    this.animationFrameId = null;
                }
            } else {
                this.lastFrameTime = performance.now();
                if (this.isRunning && !this.animationFrameId && !this.isDestroyed) {
                    this.animationFrameId = requestAnimationFrame(this._animate);
                }
            }
        }

        // ======================================================================
        // 7. Resize Handling
        // ======================================================================

        /**
         * Debounced resize handler to prevent thrashing during viewport resizing.
         * @private
         */
        _onWindowResize() {
            if (this.resizeTimeoutId) {
                clearTimeout(this.resizeTimeoutId);
            }

            this.resizeTimeoutId = setTimeout(() => {
                if (this.isDestroyed) return;
                this._updateCanvasSize(true);
            }, this.config.resizeDebounceMs);
        }

        // ======================================================================
        // 8. Gravitational Field & Particle Updates
        // ======================================================================

        /**
         * Computes gravitational displacement, natural drift, and interpolates particles.
         * 
         * Algorithm:
         * 1. Calculate distance between cursor and particle
         * 2. If within influenceRadius, apply smooth Hermite falloff:
         *    influence = 1 - smoothstep(0, influenceRadius, distance)
         * 3. Compute radial vector towards cursor + tangential vector around cursor
         * 4. Compute subtle autonomous drift: sin(t) / cos(t)
         * 5. target = base + gravityDisplacement + drift
         * 6. Smoothly ease particle.x / particle.y toward target
         * 
         * @param {number} currentTime - Current timestamp from performance.now()
         * @private
         */
        _updateParticles(currentTime) {
            const timeSec = (currentTime - this.startTime) * 0.001;
            const mouse = this.mouse;
            const cfg = this.config;
            const radius = cfg.influenceRadius;
            const enableSwirl = cfg.enableSwirl;
            const enableDrift = cfg.enableDrift;
            const returnSpeed = cfg.returnSpeed;
            const maxSpeed = cfg.maxParticleSpeed;

            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];

                let gravityX = 0;
                let gravityY = 0;

                // Gravitational Distortion Field
                if (mouse.active) {
                    // Vector from particle current position to cursor
                    const dx = mouse.x - p.x;
                    const dy = mouse.y - p.y;
                    const distance = Math.hypot(dx, dy);

                    if (distance < radius) {
                        // Smoothstep falloff ensures zero abrupt threshold boundaries
                        // influence is 1.0 at distance 0, dropping smoothly to 0.0 at radius
                        const s = smoothstep(0, radius, distance);
                        const influence = 1 - s;

                        // Safe unit directional vector
                        const safeDist = Math.max(distance, 1.0);
                        const ux = dx / safeDist;
                        const uy = dy / safeDist;

                        // 1. Radial component: pulls particle toward primordial black hole
                        const radialMagnitude = influence * cfg.gravityStrength;
                        const radialX = ux * radialMagnitude;
                        const radialY = uy * radialMagnitude;

                        // 2. Tangential component: perpendicular swirl (gravitational lensing)
                        let tangentialX = 0;
                        let tangentialY = 0;

                        if (enableSwirl) {
                            // Perpendicular vector (-uy, ux) rotated 90 degrees
                            const tx = -uy * p.spin;
                            const ty = ux * p.spin;
                            const tangentialMagnitude = influence * cfg.tangentialStrength;
                            tangentialX = tx * tangentialMagnitude;
                            tangentialY = ty * tangentialMagnitude;
                        }

                        gravityX = radialX + tangentialX;
                        gravityY = radialY + tangentialY;
                    }
                }

                // Autonomous cosmic breathing/drift
                let driftX = 0;
                let driftY = 0;

                if (enableDrift) {
                    driftX = Math.sin(timeSec * p.driftSpeed + p.phase) * p.driftAmount;
                    driftY = Math.cos(timeSec * p.driftSpeed + p.phaseY) * p.driftAmount;
                }

                // Target position = Permanent Base Position + Gravitational Offset + Drift
                const targetX = p.baseX + gravityX + driftX;
                const targetY = p.baseY + gravityY + driftY;

                // Gradual restoration / smooth interpolation (easing)
                let deltaX = (targetX - p.x) * returnSpeed;
                let deltaY = (targetY - p.y) * returnSpeed;

                // Velocity cap to prevent wild jumps
                if (maxSpeed) {
                    const currentSpeed = Math.hypot(deltaX, deltaY);
                    if (currentSpeed > maxSpeed) {
                        const factor = maxSpeed / currentSpeed;
                        deltaX *= factor;
                        deltaY *= factor;
                    }
                }

                p.vx = deltaX;
                p.vy = deltaY;
                p.x += deltaX;
                p.y += deltaY;

                // Very subtle opacity twinkle
                const opacityPulse = Math.sin(timeSec * (p.driftSpeed * 1.6) + p.phase) * 0.06;
                p.opacity = Math.max(0.08, Math.min(1.0, p.baseOpacity + opacityPulse));
            }
        }

        // ======================================================================
        // 9. Particle Rendering Pipeline
        // ======================================================================

        /**
         * Clears the canvas and renders all particles crisp onto the surface.
         * Lightweight O(N) canvas rendering with zero DOM manipulation.
         * @private
         */
        _renderParticles() {
            const ctx = this.ctx;
            if (!ctx) return;

            // Clear surface for new frame
            ctx.clearRect(0, 0, this.width, this.height);

            const particles = this.particles;
            const len = particles.length;

            for (let i = 0; i < len; i++) {
                const p = particles[i];

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.colorPrefix + p.opacity.toFixed(3) + ')';
                ctx.fill();

                // Rare bright stars receive a subtle ambient outer halo
                if (p.type === 'bright') {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * 2.4, 0, Math.PI * 2);
                    ctx.fillStyle = p.colorPrefix + (p.opacity * 0.18).toFixed(3) + ')';
                    ctx.fill();
                }
            }
        }

        // ======================================================================
        // 10. Animation Loop Lifecycle
        // ======================================================================

        /**
         * Main requestAnimationFrame animation loop.
         * 
         * @param {number} timestamp - High resolution DOMHighResTimeStamp
         * @private
         */
        _animate(timestamp) {
            if (!this.isRunning || this.isDestroyed) return;

            this._updateParticles(timestamp);
            this._renderParticles();

            this.animationFrameId = requestAnimationFrame(this._animate);
        }

        /**
         * Starts the background animation loop.
         */
        start() {
            if (this.isRunning || this.isDestroyed) return;
            this.isRunning = true;
            this.startTime = performance.now();
            this.animationFrameId = requestAnimationFrame(this._animate);
        }

        /**
         * Pauses the background animation loop without destroying state.
         */
        pause() {
            this.isRunning = false;
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
        }

        /**
         * Resumes the paused animation loop.
         */
        resume() {
            if (this.isRunning || this.isDestroyed) return;
            this.start();
        }

        // ======================================================================
        // 11. Initialization & Event Binding
        // ======================================================================

        /**
         * Initializes canvas, particles, and event listeners.
         * @private
         */
        _init() {
            const success = this._setupCanvas();
            if (!success) {
                this.isDestroyed = true;
                return;
            }

            // Create initial particle field
            this._createParticles(this.config.particleCount);

            // Attach Pointer tracking listeners if in browser environment
            if (typeof window !== 'undefined') {
                window.addEventListener('pointermove', this._onPointerMove, { passive: true });
                window.addEventListener('pointerdown', this._onPointerMove, { passive: true });
                if (typeof document !== 'undefined') {
                    document.addEventListener('mouseleave', this._onPointerLeave, { passive: true });
                    document.addEventListener('visibilitychange', this._onVisibilityChange);
                }
                window.addEventListener('blur', this._onWindowBlur);
                window.addEventListener('resize', this._onWindowResize, { passive: true });
            }

            // Start animation loop
            this.start();

            // Track instance
            activeInstances.add(this);
        }

        // ======================================================================
        // 12. Public API & Cleanup
        // ======================================================================

        /**
         * Returns current controller snapshot.
         * 
         * @returns {Object} State summary
         */
        getState() {
            return {
                isRunning: this.isRunning,
                isDestroyed: this.isDestroyed,
                particleCount: this.particles.length,
                canvas: this.canvas,
                width: this.width,
                height: this.height,
                dpr: this.dpr,
                mouse: {
                    x: this.mouse.x,
                    y: this.mouse.y,
                    active: this.mouse.active
                },
                config: Object.assign({}, this.config)
            };
        }

        /**
         * Updates particle count dynamically.
         * 
         * @param {number} count - New particle count
         */
        setParticleCount(count) {
            if (typeof count !== 'number' || count <= 0) return;
            this.config.particleCount = count;
            this._createParticles(count);
        }

        /**
         * Dynamically updates configuration parameters.
         * 
         * @param {Object} newOptions - Partial configuration overrides
         */
        setOptions(newOptions = {}) {
            Object.assign(this.config, newOptions);
        }

        /**
         * Completely halts the animation loop, removes all event listeners,
         * cleans up DOM elements if dynamically created, and clears references.
         */
        destroy() {
            if (this.isDestroyed) return;

            this.isDestroyed = true;
            this.isRunning = false;

            // 1. Cancel active animation frame
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }

            // 2. Clear pending resize timers
            if (this.resizeTimeoutId) {
                clearTimeout(this.resizeTimeoutId);
                this.resizeTimeoutId = null;
            }

            // 3. Remove event listeners
            if (typeof window !== 'undefined') {
                window.removeEventListener('pointermove', this._onPointerMove);
                window.removeEventListener('pointerdown', this._onPointerMove);
                if (typeof document !== 'undefined') {
                    document.removeEventListener('mouseleave', this._onPointerLeave);
                    document.removeEventListener('visibilitychange', this._onVisibilityChange);
                }
                window.removeEventListener('blur', this._onWindowBlur);
                window.removeEventListener('resize', this._onWindowResize);
            }

            // 4. Remove canvas if dynamically created
            if (this.isDynamicCanvas && this.canvas && this.canvas.parentNode) {
                this.canvas.parentNode.removeChild(this.canvas);
            }

            // 5. Clear collections and memory
            this.particles = [];
            this.ctx = null;
            this.canvas = null;
            this.container = null;

            activeInstances.delete(this);
        }
    }

    // ==========================================================================
    // 13. Public Initializer & Export
    // ==========================================================================

    /**
     * Initializes cosmic background animations.
     * Prevents duplicate animation loops if called multiple times on the same canvas.
     * 
     * @param {Object} [options] - Configuration overrides
     * @returns {BackgroundAnimations} Controller instance
     */
    function initBackgroundAnimations(options = {}) {
        // Multi-init guard: if an instance is already bound to this canvasId/container, clean it up first
        const canvasId = options.canvasId || DEFAULT_CONFIG.canvasId;
        for (const instance of activeInstances) {
            if (instance.config.canvasId === canvasId && !instance.isDestroyed) {
                if (options.forceRestart) {
                    instance.destroy();
                } else {
                    return instance;
                }
            }
        }

        return new BackgroundAnimations(options);
    }

    // Expose initBackgroundAnimations globally on window
    if (typeof global !== 'undefined') {
        global.initBackgroundAnimations = initBackgroundAnimations;
        // Alias convenience
        global.initBgAnimations = initBackgroundAnimations;
        global.BackgroundAnimations = BackgroundAnimations;
    }

    // CommonJS support for test suites, bundlers, and Node environments
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            initBackgroundAnimations,
            initBgAnimations: initBackgroundAnimations,
            BackgroundAnimations,
            DEFAULT_CONFIG,
            smoothstep
        };
    }

})(typeof window !== 'undefined' ? window : this);
