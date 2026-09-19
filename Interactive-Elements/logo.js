(function (global) {
    'use strict';

    const DEFAULT_CONFIG = {
        selector: '#personal-logo, .personal-logo, [data-personal-logo]',
        containerSelector: 'header, nav, .nav-container, body',

        audioSrc: 'AUDIO.mp3',
        audioFallbackSrc: 'assets/audio/metal-strike.mp3',
        audioCooldown: 120,
        audioVolume: 0.75,

        interactionRadius: 320,
        maxTiltDeg: 6.5,
        maxDisplacementPx: 2.5,
        lightShiftRange: 40,
        defaultLightX: 50,
        defaultLightY: 30,

        classLoaded: 'logo--loaded',
        classEntering: 'logo--entering',
        classSettled: 'logo--settled',
        classHovered: 'logo--hovered',
        classImpact: 'logo--impact',
        classReducedMotion: 'logo--reduced-motion',

        cssPropLightX: '--logo-light-x',
        cssPropLightY: '--logo-light-y',
        cssPropTiltX: '--logo-tilt-x',
        cssPropTiltY: '--logo-tilt-y',
        cssPropShiftX: '--logo-shift-x',
        cssPropShiftY: '--logo-shift-y',
        cssPropInteraction: '--logo-interaction-strength',

        entranceDurationMs: 650,
        impactDurationMs: 320,

        createIfMissing: false
    };

    const activeInstances = new Set();

    function smoothstep(min, max, value) {
        const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
        return x * x * (3 - 2 * x);
    }

    function checkReducedMotion() {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return false;
        }
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    class LogoController {
        constructor(options = {}) {
            this.config = Object.assign({}, DEFAULT_CONFIG, options);

            this.isDestroyed = false;
            this.isSettled = false;
            this.prefersReducedMotion = checkReducedMotion();

            this.state = {
                hovered: false,
                pressed: false,
                interactionStrength: 0,
                lastStrikeTime: -Infinity,
                lightX: this.config.defaultLightX,
                lightY: this.config.defaultLightY,
                tiltX: 0,
                tiltY: 0
            };

            this.element = null;
            this.audio = null;
            this.audioLoaded = false;
            this.isDynamicElement = false;

            this.entranceTimerId = null;
            this.impactTimerId = null;
            this.mediaQueryList = null;

            this._onPointerMove = this._onPointerMove.bind(this);
            this._onPointerEnter = this._onPointerEnter.bind(this);
            this._onPointerLeave = this._onPointerLeave.bind(this);
            this._onPointerDown = this._onPointerDown.bind(this);
            this._onClick = this._onClick.bind(this);
            this._onKeyDown = this._onKeyDown.bind(this);
            this._onReducedMotionChange = this._onReducedMotionChange.bind(this);

            this._init();
        }

        _setupElement() {
            if (typeof document === 'undefined') {
                return false;
            }

            let el = document.querySelector(this.config.selector);

            if (!el && this.config.createIfMissing) {
                el = document.createElement('div');
                el.id = 'personal-logo';
                el.className = 'personal-logo';
                el.textContent = '</>';
                this.isDynamicElement = true;

                const container = document.querySelector(this.config.containerSelector) || document.body;
                if (container.firstChild) {
                    container.insertBefore(el, container.firstChild);
                } else {
                    container.appendChild(el);
                }
            }

            if (!el) {
                return false;
            }

            this.element = el;

            if (!el.querySelector('.logo-glyph-slash')) {
                el.innerHTML = '<span class="logo-glyph-open">&lt;</span><span class="logo-glyph-slash">/</span><span class="logo-glyph-close">&gt;</span>';
            }

            this._setupAccessibility();

            this._resetCssProperties();

            return true;
        }

        _setupAccessibility() {
            const el = this.element;
            if (!el) return;

            const tagName = el.tagName.toLowerCase();
            if (tagName !== 'button') {
                if (!el.hasAttribute('tabindex')) {
                    el.setAttribute('tabindex', '0');
                }
                if (!el.hasAttribute('role')) {
                    el.setAttribute('role', 'button');
                }
            }

            if (!el.hasAttribute('aria-label')) {
                el.setAttribute('aria-label', 'Personal Logo: </>, strike for metallic chime');
            }
        }

        _setupAudio() {
            if (typeof Audio === 'undefined') {
                return;
            }

            try {
                const audio = new Audio();
                audio.preload = 'auto';
                audio.volume = Math.max(0, Math.min(1, this.config.audioVolume));

                audio.src = this.config.audioSrc;

                audio.addEventListener('error', () => {
                    if (this.config.audioFallbackSrc && audio.src !== this.config.audioFallbackSrc) {
                        audio.src = this.config.audioFallbackSrc;
                        audio.load();
                    }
                }, { once: true });

                this.audio = audio;
                this.audioLoaded = true;
            } catch (err) {
                this.audio = null;
                this.audioLoaded = false;
            }
        }

        _synthesizeMetallicChime() {
            if (typeof window === 'undefined') return;
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                if (!this._audioCtx) {
                    this._audioCtx = new AudioCtx();
                }
                if (this._audioCtx.state === 'suspended') {
                    this._audioCtx.resume();
                }
                const ctx = this._audioCtx;
                const now = ctx.currentTime;
                const harmonics = [
                    { freq: 1175, gain: 0.25, decay: 0.65 },
                    { freq: 2350, gain: 0.12, decay: 0.45 },
                    { freq: 3525, gain: 0.06, decay: 0.25 }
                ];
                harmonics.forEach(({ freq, gain, decay }) => {
                    const osc = ctx.createOscillator();
                    const gainNode = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now);
                    gainNode.gain.setValueAtTime(gain * this.config.audioVolume, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decay);
                    osc.connect(gainNode);
                    gainNode.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + decay + 0.05);
                });
            } catch (_) {}
        }

        _playStrikeAudio() {
            const now = performance.now();

            if (now - this.state.lastStrikeTime < this.config.audioCooldown) {
                return false;
            }

            this.state.lastStrikeTime = now;

            if (!this.audio) {
                this._synthesizeMetallicChime();
                return true;
            }

            try {
                this.audio.currentTime = 0;
                const playPromise = this.audio.play();

                if (playPromise && typeof playPromise.catch === 'function') {
                    playPromise.catch(() => {
                        this._synthesizeMetallicChime();
                    });
                }
                return true;
            } catch (err) {
                this._synthesizeMetallicChime();
                return true;
            }
        }

        _runEntranceAnimation() {
            const el = this.element;
            if (!el) return;

            el.classList.add(this.config.classLoaded);

            if (this.prefersReducedMotion) {
                el.classList.add(this.config.classSettled);
                this.isSettled = true;
                return;
            }

            el.classList.add(this.config.classEntering);

            this.entranceTimerId = setTimeout(() => {
                if (this.isDestroyed || !this.element) return;
                this.element.classList.remove(this.config.classEntering);
                this.element.classList.add(this.config.classSettled);
                this.isSettled = true;
                this.entranceTimerId = null;
            }, this.config.entranceDurationMs);
        }

        _onPointerMove(e) {
            if (!this.element || this.isDestroyed || this.prefersReducedMotion) return;

            const rect = this.element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const dx = e.clientX - centerX;
            const dy = e.clientY - centerY;
            const distance = Math.hypot(dx, dy);

            const radius = this.config.interactionRadius;

            if (distance < radius) {
                const s = smoothstep(0, radius, distance);
                const influence = 1 - s;

                const normX = Math.max(-1, Math.min(1, dx / (radius * 0.75)));
                const normY = Math.max(-1, Math.min(1, dy / (radius * 0.75)));

                const lightX = this.config.defaultLightX + (normX * this.config.lightShiftRange);
                const lightY = this.config.defaultLightY + (normY * this.config.lightShiftRange);

                const tiltX = -normY * this.config.maxTiltDeg * influence;
                const tiltY = normX * this.config.maxTiltDeg * influence;

                const shiftX = normX * this.config.maxDisplacementPx * influence;
                const shiftY = normY * this.config.maxDisplacementPx * influence;

                this.state.interactionStrength = influence;
                this.state.lightX = lightX;
                this.state.lightY = lightY;
                this.state.tiltX = tiltX;
                this.state.tiltY = tiltY;

                const style = this.element.style;
                style.setProperty(this.config.cssPropLightX, `${lightX.toFixed(2)}%`);
                style.setProperty(this.config.cssPropLightY, `${lightY.toFixed(2)}%`);
                style.setProperty(this.config.cssPropTiltX, `${tiltX.toFixed(2)}deg`);
                style.setProperty(this.config.cssPropTiltY, `${tiltY.toFixed(2)}deg`);
                style.setProperty(this.config.cssPropShiftX, `${shiftX.toFixed(2)}px`);
                style.setProperty(this.config.cssPropShiftY, `${shiftY.toFixed(2)}px`);
                style.setProperty(this.config.cssPropInteraction, influence.toFixed(3));
            } else if (this.state.interactionStrength > 0) {
                this._resetCssProperties();
            }
        }

        _resetCssProperties() {
            if (!this.element) return;

            this.state.interactionStrength = 0;
            this.state.lightX = this.config.defaultLightX;
            this.state.lightY = this.config.defaultLightY;
            this.state.tiltX = 0;
            this.state.tiltY = 0;

            const style = this.element.style;
            style.setProperty(this.config.cssPropLightX, `${this.config.defaultLightX}%`);
            style.setProperty(this.config.cssPropLightY, `${this.config.defaultLightY}%`);
            style.setProperty(this.config.cssPropTiltX, '0deg');
            style.setProperty(this.config.cssPropTiltY, '0deg');
            style.setProperty(this.config.cssPropShiftX, '0px');
            style.setProperty(this.config.cssPropShiftY, '0px');
            style.setProperty(this.config.cssPropInteraction, '0');
        }

        _onPointerEnter() {
            this.state.hovered = true;
            if (this.element) {
                this.element.classList.add(this.config.classHovered);
            }
        }

        _onPointerLeave() {
            this.state.hovered = false;
            if (this.element) {
                this.element.classList.remove(this.config.classHovered);
            }
            this._resetCssProperties();
        }

        _onPointerDown(e) {
            if (e.button !== 0) return;
            this.triggerImpact();
        }

        _onClick(e) {
            e.preventDefault();
            this.triggerImpact();
        }

        _onKeyDown(e) {
            if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                this.triggerImpact();
            }
        }

        _spawnShockwave() {
            if (!this.element || this.prefersReducedMotion || typeof document === 'undefined') return;
            try {
                const parent = this.element.parentElement || this.element;
                let container = parent.querySelector('.logo-shockwave-container');
                if (!container) {
                    container = document.createElement('div');
                    container.className = 'logo-shockwave-container';
                    if (getComputedStyle(parent).position === 'static') {
                        parent.style.position = 'relative';
                    }
                    parent.appendChild(container);
                }
                const ring = document.createElement('span');
                ring.className = 'logo-shockwave-ring';
                container.appendChild(ring);
                setTimeout(() => {
                    if (ring.parentNode) ring.parentNode.removeChild(ring);
                }, 600);
            } catch (_) {}
        }

        _spawnSparks() {
            if (!this.element || this.prefersReducedMotion || typeof document === 'undefined') return;
            try {
                const sparkCount = 6;
                for (let i = 0; i < sparkCount; i++) {
                    const spark = document.createElement('span');
                    spark.className = 'logo-spark';
                    const angle = (i / sparkCount) * 2 * Math.PI + (Math.random() - 0.5) * 0.6;
                    const distance = 28 + Math.random() * 32;
                    const tx = Math.cos(angle) * distance;
                    const ty = Math.sin(angle) * distance;
                    spark.style.setProperty('--spark-tx', `${tx.toFixed(1)}px`);
                    spark.style.setProperty('--spark-ty', `${ty.toFixed(1)}px`);
                    spark.style.left = '50%';
                    spark.style.top = '50%';
                    this.element.appendChild(spark);
                    setTimeout(() => {
                        if (spark.parentNode) spark.parentNode.removeChild(spark);
                    }, 480);
                }
            } catch (_) {}
        }

        triggerImpact() {
            if (!this.element || this.isDestroyed) return;

            this._playStrikeAudio();

            if (!this.prefersReducedMotion) {
                this.state.pressed = true;
                const el = this.element;

                this._spawnShockwave();
                this._spawnSparks();

                el.classList.remove(this.config.classImpact);
                void el.offsetWidth;
                el.classList.add(this.config.classImpact);

                if (this.impactTimerId) {
                    clearTimeout(this.impactTimerId);
                }

                this.impactTimerId = setTimeout(() => {
                    if (this.isDestroyed || !this.element) return;
                    this.element.classList.remove(this.config.classImpact);
                    this.state.pressed = false;
                    this.impactTimerId = null;
                }, this.config.impactDurationMs);
            }
        }

        _onReducedMotionChange(e) {
            this.prefersReducedMotion = e.matches;
            if (this.element) {
                if (this.prefersReducedMotion) {
                    this.element.classList.add(this.config.classReducedMotion);
                    this._resetCssProperties();
                } else {
                    this.element.classList.remove(this.config.classReducedMotion);
                }
            }
        }

        _init() {
            const hasElement = this._setupElement();
            if (!hasElement) {
                this.isDestroyed = true;
                return;
            }

            this._setupAudio();

            const el = this.element;

            el.addEventListener('pointerenter', this._onPointerEnter, { passive: true });
            el.addEventListener('pointerleave', this._onPointerLeave, { passive: true });
            el.addEventListener('pointerdown', this._onPointerDown, { passive: true });
            el.addEventListener('click', this._onClick);
            el.addEventListener('keydown', this._onKeyDown);

            if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
                window.addEventListener('pointermove', this._onPointerMove, { passive: true });

                if (typeof window.matchMedia === 'function') {
                    this.mediaQueryList = window.matchMedia('(prefers-reduced-motion: reduce)');
                    if (this.mediaQueryList && this.mediaQueryList.addEventListener) {
                        this.mediaQueryList.addEventListener('change', this._onReducedMotionChange);
                    } else if (this.mediaQueryList && this.mediaQueryList.addListener) {
                        this.mediaQueryList.addListener(this._onReducedMotionChange);
                    }
                }
            }

            this._runEntranceAnimation();

            activeInstances.add(this);
        }

        getState() {
            return {
                isDestroyed: this.isDestroyed,
                isSettled: this.isSettled,
                element: this.element,
                audioLoaded: this.audioLoaded,
                prefersReducedMotion: this.prefersReducedMotion,
                hovered: this.state.hovered,
                pressed: this.state.pressed,
                interactionStrength: this.state.interactionStrength,
                lightX: this.state.lightX,
                lightY: this.state.lightY,
                tiltX: this.state.tiltX,
                tiltY: this.state.tiltY,
                config: Object.assign({}, this.config)
            };
        }

        setOptions(newOptions = {}) {
            Object.assign(this.config, newOptions);
            if (newOptions.audioVolume !== undefined && this.audio) {
                this.audio.volume = Math.max(0, Math.min(1, newOptions.audioVolume));
            }
        }

        destroy() {
            if (this.isDestroyed) return;
            this.isDestroyed = true;

            if (this.entranceTimerId) {
                clearTimeout(this.entranceTimerId);
                this.entranceTimerId = null;
            }
            if (this.impactTimerId) {
                clearTimeout(this.impactTimerId);
                this.impactTimerId = null;
            }

            if (this.element) {
                this.element.removeEventListener('pointerenter', this._onPointerEnter);
                this.element.removeEventListener('pointerleave', this._onPointerLeave);
                this.element.removeEventListener('pointerdown', this._onPointerDown);
                this.element.removeEventListener('click', this._onClick);
                this.element.removeEventListener('keydown', this._onKeyDown);

                this.element.classList.remove(
                    this.config.classLoaded,
                    this.config.classEntering,
                    this.config.classSettled,
                    this.config.classHovered,
                    this.config.classImpact
                );

                const style = this.element.style;
                style.removeProperty(this.config.cssPropLightX);
                style.removeProperty(this.config.cssPropLightY);
                style.removeProperty(this.config.cssPropTiltX);
                style.removeProperty(this.config.cssPropTiltY);
                style.removeProperty(this.config.cssPropShiftX);
                style.removeProperty(this.config.cssPropShiftY);
                style.removeProperty(this.config.cssPropInteraction);

                if (this.isDynamicElement && this.element.parentNode) {
                    this.element.parentNode.removeChild(this.element);
                }
            }

            if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
                window.removeEventListener('pointermove', this._onPointerMove);

                if (this.mediaQueryList) {
                    if (this.mediaQueryList.removeEventListener) {
                        this.mediaQueryList.removeEventListener('change', this._onReducedMotionChange);
                    } else if (this.mediaQueryList.removeListener) {
                        this.mediaQueryList.removeListener(this._onReducedMotionChange);
                    }
                    this.mediaQueryList = null;
                }
            }

            if (this.audio) {
                this.audio.pause();
                this.audio.src = '';
                this.audio = null;
            }

            this.element = null;
            activeInstances.delete(this);
        }
    }

    function initLogoAnimation(options = {}) {
        const selector = options.selector || DEFAULT_CONFIG.selector;
        for (const instance of activeInstances) {
            if (instance.config.selector === selector && !instance.isDestroyed) {
                if (options.forceRestart) {
                    instance.destroy();
                } else {
                    return instance;
                }
            }
        }

        const controller = new LogoController(options);
        return controller.element ? controller : (options.returnInactive ? controller : null);
    }

    if (typeof global !== 'undefined') {
        global.initLogoAnimation = initLogoAnimation;
        global.initLogo = initLogoAnimation;
        global.LogoController = LogoController;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            initLogoAnimation,
            initLogo: initLogoAnimation,
            LogoController,
            DEFAULT_CONFIG,
            smoothstep
        };
    }

})(typeof window !== 'undefined' ? window : this);
