(function (global) {
    'use strict';

    const DEFAULT_CONFIG = {
        canvasId: 'background-canvas',
        canvasClass: 'background-canvas',
        container: null,

        particleCount: 100,

        categories: {
            dust: {
                ratio: 0.72,
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
                ratio: 0.21,
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
                ratio: 0.07,
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

        colors: [
            'rgba(244, 244, 249, ',
            'rgba(244, 244, 249, ', 
            'rgba(244, 244, 249, ', 
            'rgba(220, 226, 245, ',
            'rgba(0, 242, 254, ',
            'rgba(168, 85, 247, '
        ],

        influenceRadius: 200,
        gravityStrength: 42,
        tangentialStrength: 28,
        driftAmount: 1.8,
        returnSpeed: 0.065,
        maxParticleSpeed: 14,

        maxDpr: 2,
        zIndex: -1,
        enableSwirl: true,
        enableDrift: true,
        resizeDebounceMs: 120
    };

    const activeInstances = new Set();

    function smoothstep(min, max, value) {
        const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
        return x * x * (3 - 2 * x);
    }

    function randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    function randomChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    class BackgroundAnimations {
        constructor(options = {}) {
            this.config = Object.assign({}, DEFAULT_CONFIG, options);
            if (options.categories) {
                this.config.categories = Object.assign({}, DEFAULT_CONFIG.categories, options.categories);
            }

            this.isRunning = false;
            this.isDestroyed = false;
            this.animationFrameId = null;
            this.resizeTimeoutId = null;
            this.startTime = performance.now();
            this.lastFrameTime = this.startTime;

            this.container = null;
            this.canvas = null;
            this.ctx = null;
            this.isDynamicCanvas = false;

            this.width = 0;
            this.height = 0;
            this.dpr = 1;

            this.particles = [];

            this.mouse = {
                x: -9999,
                y: -9999,
                active: false
            };

            this._onPointerMove = this._onPointerMove.bind(this);
            this._onPointerLeave = this._onPointerLeave.bind(this);
            this._onWindowBlur = this._onWindowBlur.bind(this);
            this._onWindowResize = this._onWindowResize.bind(this);
            this._onVisibilityChange = this._onVisibilityChange.bind(this);
            this._animate = this._animate.bind(this);

            this._init();
        }

        _setupCanvas() {
            if (typeof this.config.container === 'string' && typeof document !== 'undefined') {
                this.container = document.querySelector(this.config.container);
            } else if (this.config.container && (typeof HTMLElement !== 'undefined' ? this.config.container instanceof HTMLElement : this.config.container.nodeType === 1)) {
                this.container = this.config.container;
            }

            if (!this.container && typeof document !== 'undefined') {
                this.container = document.body;
            }

            let canvas = document.getElementById(this.config.canvasId);

            if (!canvas) {
                canvas = document.createElement('canvas');
                canvas.id = this.config.canvasId;
                canvas.className = this.config.canvasClass;
                this.isDynamicCanvas = true;

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

            this._applyCanvasStyles();

            this._updateCanvasSize(false);

            return true;
        }

        _applyCanvasStyles() {
            if (!this.canvas) return;
            const s = this.canvas.style;
            s.position = 'fixed';
            s.top = '0';
            s.left = '0';
            s.width = '100vw';
            s.height = '100vh';
            s.pointerEvents = 'none';
            s.zIndex = String(this.config.zIndex);
            s.display = 'block';
        }

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

            const rawDpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
            const dpr = Math.min(rawDpr, this.config.maxDpr);

            this.width = newWidth;
            this.height = newHeight;
            this.dpr = dpr;

            this.canvas.width = Math.max(1, Math.floor(newWidth * dpr));
            this.canvas.height = Math.max(1, Math.floor(newHeight * dpr));

            this.canvas.style.width = `${newWidth}px`;
            this.canvas.style.height = `${newHeight}px`;

            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.scale(dpr, dpr);

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

        _createParticles(count) {
            this.particles = [];
            const w = this.width || (typeof window !== 'undefined' ? window.innerWidth : 1024);
            const h = this.height || (typeof window !== 'undefined' ? window.innerHeight : 768);
            const cats = this.config.categories;

            for (let i = 0; i < count; i++) {
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

                const baseX = randomRange(0, w);
                const baseY = randomRange(0, h);

                const size = randomRange(catConfig.minSize, catConfig.maxSize);
                const opacity = randomRange(catConfig.minOpacity, catConfig.maxOpacity);
                const driftSpeed = randomRange(catConfig.driftSpeedMin, catConfig.driftSpeedMax);
                const driftAmount = randomRange(catConfig.driftAmountMin, catConfig.driftAmountMax);
                const phase = randomRange(0, Math.PI * 2);
                const phaseY = randomRange(0, Math.PI * 2);
                const colorPrefix = randomChoice(this.config.colors);

                const spin = Math.random() > 0.15 ? 1 : -1;

                this.particles.push({
                    x: baseX,
                    y: baseY,

                    baseX: baseX,
                    baseY: baseY,

                    vx: 0,
                    vy: 0,

                    size: size,
                    opacity: opacity,
                    baseOpacity: opacity,
                    colorPrefix: colorPrefix,
                    type: catName,

                    driftSpeed: driftSpeed,
                    driftAmount: driftAmount,
                    phase: phase,
                    phaseY: phaseY,

                    spin: spin
                });
            }
        }

        _onPointerMove(e) {
            if (!this.canvas) return;

            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
            this.mouse.active = true;
        }

        _onPointerLeave() {
            this.mouse.active = false;
        }

        _onWindowBlur() {
            this.mouse.active = false;
        }

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

        _onWindowResize() {
            if (this.resizeTimeoutId) {
                clearTimeout(this.resizeTimeoutId);
            }

            this.resizeTimeoutId = setTimeout(() => {
                if (this.isDestroyed) return;
                this._updateCanvasSize(true);
            }, this.config.resizeDebounceMs);
        }

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

                if (mouse.active) {
                    const dx = mouse.x - p.x;
                    const dy = mouse.y - p.y;
                    const distance = Math.hypot(dx, dy);

                    if (distance < radius) {
                        const s = smoothstep(0, radius, distance);
                        const influence = 1 - s;

                        const safeDist = Math.max(distance, 1.0);
                        const ux = dx / safeDist;
                        const uy = dy / safeDist;

                        const radialMagnitude = influence * cfg.gravityStrength;
                        const radialX = ux * radialMagnitude;
                        const radialY = uy * radialMagnitude;

                        let tangentialX = 0;
                        let tangentialY = 0;

                        if (enableSwirl) {
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

                let driftX = 0;
                let driftY = 0;

                if (enableDrift) {
                    driftX = Math.sin(timeSec * p.driftSpeed + p.phase) * p.driftAmount;
                    driftY = Math.cos(timeSec * p.driftSpeed + p.phaseY) * p.driftAmount;
                }

                const targetX = p.baseX + gravityX + driftX;
                const targetY = p.baseY + gravityY + driftY;

                let deltaX = (targetX - p.x) * returnSpeed;
                let deltaY = (targetY - p.y) * returnSpeed;

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

                const opacityPulse = Math.sin(timeSec * (p.driftSpeed * 1.6) + p.phase) * 0.06;
                p.opacity = Math.max(0.08, Math.min(1.0, p.baseOpacity + opacityPulse));
            }
        }

        _renderParticles() {
            const ctx = this.ctx;
            if (!ctx) return;

            ctx.clearRect(0, 0, this.width, this.height);

            const particles = this.particles;
            const len = particles.length;

            for (let i = 0; i < len; i++) {
                const p = particles[i];

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.colorPrefix + p.opacity.toFixed(3) + ')';
                ctx.fill();

                if (p.type === 'bright') {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * 2.4, 0, Math.PI * 2);
                    ctx.fillStyle = p.colorPrefix + (p.opacity * 0.18).toFixed(3) + ')';
                    ctx.fill();
                }
            }
        }

        _animate(timestamp) {
            if (!this.isRunning || this.isDestroyed) return;

            this._updateParticles(timestamp);
            this._renderParticles();

            this.animationFrameId = requestAnimationFrame(this._animate);
        }

        start() {
            if (this.isRunning || this.isDestroyed) return;
            this.isRunning = true;
            this.startTime = performance.now();
            this.animationFrameId = requestAnimationFrame(this._animate);
        }

        pause() {
            this.isRunning = false;
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
        }

        resume() {
            if (this.isRunning || this.isDestroyed) return;
            this.start();
        }

        _init() {
            const success = this._setupCanvas();
            if (!success) {
                this.isDestroyed = true;
                return;
            }

            this._createParticles(this.config.particleCount);

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

            this.start();

            activeInstances.add(this);
        }

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

        setParticleCount(count) {
            if (typeof count !== 'number' || count <= 0) return;
            this.config.particleCount = count;
            this._createParticles(count);
        }

        setOptions(newOptions = {}) {
            Object.assign(this.config, newOptions);
        }

        destroy() {
            if (this.isDestroyed) return;

            this.isDestroyed = true;
            this.isRunning = false;

            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }

            if (this.resizeTimeoutId) {
                clearTimeout(this.resizeTimeoutId);
                this.resizeTimeoutId = null;
            }

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

            if (this.isDynamicCanvas && this.canvas && this.canvas.parentNode) {
                this.canvas.parentNode.removeChild(this.canvas);
            }

            this.particles = [];
            this.ctx = null;
            this.canvas = null;
            this.container = null;

            activeInstances.delete(this);
        }
    }

    function initBackgroundAnimations(options = {}) {
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

    if (typeof global !== 'undefined') {
        global.initBackgroundAnimations = initBackgroundAnimations;
        global.initBgAnimations = initBackgroundAnimations;
        global.BackgroundAnimations = BackgroundAnimations;
    }

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
