/**
 * ==============================================================================
 * logo.js (logo-animation.js) — Interactive Metallic Logo Controller
 * ==============================================================================
 * 
 * Functional Scope & Architectural Distinction (per instructions):
 * - Controls the interactive personal logo: </>
 * - The logo appears near the beginning of the webpage as a visually prominent
 *   object with a physical metallic appearance and palpable presence.
 * - Manages physical interaction:
 *   1. Logo element discovery / graceful fallback
 *   2. Initial entrance animation ("settling into reality")
 *   3. Idle state (subtle weight, no erratic bouncing)
 *   4. Pointer-based lighting & subtle 3D tilt via CSS custom properties
 *   5. Click interaction triggering physical impact vibration
 *   6. Metallic strike audio playback with cooldown protection
 *   7. Full keyboard accessibility (Enter / Space keypress)
 *   8. Respects prefers-reduced-motion
 *   9. Teardown and cleanup lifecycle
 * 
 * Architectural Boundaries:
 * - What this module OWNS:
 *   1. Discovering #personal-logo (or configured selector)
 *   2. Dynamic CSS variable updates:
 *      --logo-light-x, --logo-light-y
 *      --logo-tilt-x, --logo-tilt-y
 *      --logo-interaction-strength
 *   3. Audio instantiation & click-triggered playback of metal-strike sound
 *   4. Cooldown throttling for audio strikes (default 120ms)
 *   5. Impact state toggling (.logo--impact)
 *   6. Accessibility attributes (role="button", tabindex="0", aria-label)
 *   7. Event listener lifecycle & controller API
 * 
 * - What this module DOES NOT own:
 *   1. Background cosmic particles (handled by bg-animations.js)
 *   2. Terminal functionality (handled by terminal.js)
 *   3. Page navigation
 *   4. Blog functionality
 *   5. Education animation
 *   6. Global colors/theme
 *   7. General typography & layout
 *   8. Drawing metal textures directly (delegated to logo-animation.css)
 * 
 * Interaction Architecture:
 * 
 *                        ┌──────────────┐
 *                        │    Cursor    │
 *                        └──────┬───────┘
 *                               ↓
 *                      pointer position
 *                               ↓
 *                     distance + direction
 *                               ↓
 *                      interaction strength
 *                               ↓
 *                     CSS lighting variables
 *                               ↓
 *                        metallic logo
 * 
 * Click / Space / Enter ─────────────┐
 *                                    ↓
 *                               impact state
 *                                    ↓
 *                          ┌─────────┴─────────┐
 *                          ↓                   ↓
 *                    CSS vibration       metal audio
 *                          ↓                   ↓
 *                          └─────────┬─────────┘
 *                                    ↓
 *                                 settle
 * ==============================================================================
 */

(function (global) {
    'use strict';

    // ==========================================================================
    // 1. Configuration & Tunable Constants
    // ==========================================================================

    /**
     * Default configuration for the interactive metallic logo.
     * All options can be overridden via options passed to initLogoAnimation().
     */
    const DEFAULT_CONFIG = {
        // DOM Discovery Selectors
        selector: '#personal-logo, .personal-logo, [data-personal-logo]',
        containerSelector: 'header, nav, .nav-container, body',

        // Audio Configuration
        // Stored locally in the project per instructions specification
        audioSrc: 'AUDIO.mp3',
        audioFallbackSrc: 'assets/audio/metal-strike.mp3',
        audioCooldown: 120, // ms cooldown between strikes (per instructions: audioCooldown: 120)
        audioVolume: 0.75,  // audio volume (0.0 to 1.0)

        // Lighting & Spatial Physics
        interactionRadius: 320,  // Distance in px where cursor begins affecting lighting
        maxTiltDeg: 6.5,         // Maximum subtle 3D rotational tilt angle (degrees)
        maxDisplacementPx: 2.5,  // Maximum subtle position translation (px)
        lightShiftRange: 40,     // Percentage range for moving specular highlight (-40% to +40%)
        defaultLightX: 50,       // Default ambient light X percentage
        defaultLightY: 30,       // Default ambient light Y percentage (overhead starlight)

        // CSS Class Names
        classLoaded: 'logo--loaded',
        classEntering: 'logo--entering',
        classSettled: 'logo--settled',
        classHovered: 'logo--hovered',
        classImpact: 'logo--impact',
        classReducedMotion: 'logo--reduced-motion',

        // CSS Custom Property Names
        cssPropLightX: '--logo-light-x',
        cssPropLightY: '--logo-light-y',
        cssPropTiltX: '--logo-tilt-x',
        cssPropTiltY: '--logo-tilt-y',
        cssPropShiftX: '--logo-shift-x',
        cssPropShiftY: '--logo-shift-y',
        cssPropInteraction: '--logo-interaction-strength',

        // Animation Timings
        entranceDurationMs: 650, // Duration of the settling entrance animation
        impactDurationMs: 180,   // Duration of the strike compression & vibration

        // Fallback creation behavior:
        // Per spec: "If element doesn't exist: don't crash, don't create random UI, return safely"
        createIfMissing: false
    };

    /**
     * Active instances registry for cleanup and duplicate prevention.
     */
    const activeInstances = new Set();

    // ==========================================================================
    // 2. Mathematical & Environmental Helpers
    // ==========================================================================

    /**
     * Standard Hermite smoothstep function.
     * Produces a smooth S-curve interpolation between 0 and 1.
     * 
     * @param {number} min - Lower bound
     * @param {number} max - Upper bound
     * @param {number} value - Input value
     * @returns {number} Value clamped to [0, 1]
     */
    function smoothstep(min, max, value) {
        const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
        return x * x * (3 - 2 * x);
    }

    /**
     * Checks if the user's operating system prefers reduced motion.
     * 
     * @returns {boolean}
     */
    function checkReducedMotion() {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return false;
        }
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    // ==========================================================================
    // 3. LogoController Class
    // ==========================================================================

    class LogoController {
        /**
         * @param {Object} [options] - Configuration overrides
         */
        constructor(options = {}) {
            this.config = Object.assign({}, DEFAULT_CONFIG, options);

            // Lifecycle flags
            this.isDestroyed = false;
            this.isSettled = false;
            this.prefersReducedMotion = checkReducedMotion();

            // Interactive state
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

            // DOM & Audio references
            this.element = null;
            this.audio = null;
            this.audioLoaded = false;
            this.isDynamicElement = false;

            // Timer references for precise cleanup
            this.entranceTimerId = null;
            this.impactTimerId = null;
            this.mediaQueryList = null;

            // Bound event handlers
            this._onPointerMove = this._onPointerMove.bind(this);
            this._onPointerEnter = this._onPointerEnter.bind(this);
            this._onPointerLeave = this._onPointerLeave.bind(this);
            this._onPointerDown = this._onPointerDown.bind(this);
            this._onClick = this._onClick.bind(this);
            this._onKeyDown = this._onKeyDown.bind(this);
            this._onReducedMotionChange = this._onReducedMotionChange.bind(this);

            // Initialize
            this._init();
        }

        // ======================================================================
        // 4. Logo Discovery & Element Setup
        // ======================================================================

        /**
         * Discovers or optionally creates the personal logo element.
         * Per spec: If element doesn't exist, don't crash, return safely.
         * 
         * @private
         * @returns {boolean} True if logo element is successfully resolved
         */
        _setupElement() {
            if (typeof document === 'undefined') {
                return false;
            }

            // Look for existing element matching selector
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
                // Return false gracefully as specified
                return false;
            }

            this.element = el;

            // Accessibility configuration
            this._setupAccessibility();

            // Set initial CSS custom properties
            this._resetCssProperties();

            return true;
        }

        /**
         * Configures accessibility attributes on the logo element.
         * Ensures tabindex="0", role="button", and aria-label.
         * 
         * @private
         */
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

        // ======================================================================
        // 5. Audio Setup & Playback Protection
        // ======================================================================

        /**
         * Initializes the HTML5 Audio instance with local audio file.
         * 
         * @private
         */
        _setupAudio() {
            if (typeof Audio === 'undefined') {
                return;
            }

            try {
                const audio = new Audio();
                audio.preload = 'auto';
                audio.volume = Math.max(0, Math.min(1, this.config.audioVolume));

                // Primary path (stored locally in project)
                audio.src = this.config.audioSrc;

                // Graceful fallback listener if primary path differs
                audio.addEventListener('error', () => {
                    if (this.config.audioFallbackSrc && audio.src !== this.config.audioFallbackSrc) {
                        audio.src = this.config.audioFallbackSrc;
                        audio.load();
                    }
                }, { once: true });

                this.audio = audio;
                this.audioLoaded = true;
            } catch (err) {
                // Audio failure shouldn't crash the UI
                this.audio = null;
                this.audioLoaded = false;
            }
        }

        /**
         * Plays the metallic strike sound with cooldown protection.
         * Ensures repeated rapid clicks produce distinct individual strikes
         * without chaotic overlapping or performance degradation.
         * 
         * @returns {boolean} True if strike audio was played
         * @private
         */
        _playStrikeAudio() {
            const now = performance.now();

            // Cooldown protection check (per instructions: audioCooldown default 120ms)
            if (now - this.state.lastStrikeTime < this.config.audioCooldown) {
                return false; // Rapid click ignored during active cooldown
            }

            this.state.lastStrikeTime = now;

            if (!this.audio) {
                return false;
            }

            try {
                // Resetting currentTime allows immediate crisp repeated strikes
                this.audio.currentTime = 0;
                const playPromise = this.audio.play();

                if (playPromise && typeof playPromise.catch === 'function') {
                    playPromise.catch(() => {
                        // Safely handle browser autoplay policy restriction
                    });
                }
                return true;
            } catch (err) {
                return false;
            }
        }

        // ======================================================================
        // 6. Entrance Animation
        // ======================================================================

        /**
         * Triggers the subtle "settling into reality" entrance animation.
         * Avoids spins, explosions, or neon flashes; feels like a heavy object
         * being placed into the scene.
         * 
         * @private
         */
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

        // ======================================================================
        // 7. Pointer Tracking & Lighting Calculation
        // ======================================================================

        /**
         * Calculates cursor distance and relative angle to the logo, updating
         * CSS custom properties to dynamically shift specular highlights and 3D tilt.
         * 
         * Behaves like an object observed under a moving light source rather than
         * physically following the cursor like a widget.
         * 
         * @param {PointerEvent|MouseEvent} e
         * @private
         */
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
                // Smooth falloff: 1 at center, 0 at interaction boundary
                const s = smoothstep(0, radius, distance);
                const influence = 1 - s;

                // Normalized offset within the bounding interaction field [-1, 1]
                const normX = Math.max(-1, Math.min(1, dx / (radius * 0.75)));
                const normY = Math.max(-1, Math.min(1, dy / (radius * 0.75)));

                // 1. Specular highlight position (shifts toward cursor light source)
                const lightX = this.config.defaultLightX + (normX * this.config.lightShiftRange);
                const lightY = this.config.defaultLightY + (normY * this.config.lightShiftRange);

                // 2. Subtle 3D tilt (pitch around X axis, yaw around Y axis)
                const tiltX = -normY * this.config.maxTiltDeg * influence;
                const tiltY = normX * this.config.maxTiltDeg * influence;

                // 3. Subtle micro-displacement (weighted object resistance)
                const shiftX = normX * this.config.maxDisplacementPx * influence;
                const shiftY = normY * this.config.maxDisplacementPx * influence;

                this.state.interactionStrength = influence;
                this.state.lightX = lightX;
                this.state.lightY = lightY;
                this.state.tiltX = tiltX;
                this.state.tiltY = tiltY;

                // Update CSS Custom Properties
                const style = this.element.style;
                style.setProperty(this.config.cssPropLightX, `${lightX.toFixed(2)}%`);
                style.setProperty(this.config.cssPropLightY, `${lightY.toFixed(2)}%`);
                style.setProperty(this.config.cssPropTiltX, `${tiltX.toFixed(2)}deg`);
                style.setProperty(this.config.cssPropTiltY, `${tiltY.toFixed(2)}deg`);
                style.setProperty(this.config.cssPropShiftX, `${shiftX.toFixed(2)}px`);
                style.setProperty(this.config.cssPropShiftY, `${shiftY.toFixed(2)}px`);
                style.setProperty(this.config.cssPropInteraction, influence.toFixed(3));
            } else if (this.state.interactionStrength > 0) {
                // Reset when cursor leaves interaction radius
                this._resetCssProperties();
            }
        }

        /**
         * Resets dynamic CSS custom properties back to ambient rest defaults.
         * @private
         */
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

        // ======================================================================
        // 8. Hover, Click & Keyboard Handling
        // ======================================================================

        /**
         * Pointer enter handler.
         * @private
         */
        _onPointerEnter() {
            this.state.hovered = true;
            if (this.element) {
                this.element.classList.add(this.config.classHovered);
            }
        }

        /**
         * Pointer leave handler.
         * @private
         */
        _onPointerLeave() {
            this.state.hovered = false;
            if (this.element) {
                this.element.classList.remove(this.config.classHovered);
            }
            this._resetCssProperties();
        }

        /**
         * Pointer down handler.
         * @private
         */
        _onPointerDown(e) {
            // Only trigger on primary mouse button or touch
            if (e.button !== 0) return;
            this.triggerImpact();
        }

        /**
         * Click handler.
         * @private
         */
        _onClick(e) {
            e.preventDefault();
            this.triggerImpact();
        }

        /**
         * Keyboard interaction handler (Enter or Space triggers impact).
         * 
         * @param {KeyboardEvent} e
         * @private
         */
        _onKeyDown(e) {
            if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
                e.preventDefault(); // Prevent page scrolling on Space
                this.triggerImpact();
            }
        }

        /**
         * Triggers the physical impact response:
         * 1. Plays local metal-strike audio with cooldown protection
         * 2. Triggers micro-compression and vibration animation via CSS class
         * 3. Settles back smoothly to rest state
         * 
         * Can be called programmatically via controller.triggerImpact().
         */
        triggerImpact() {
            if (!this.element || this.isDestroyed) return;

            // 1. Play metallic strike audio
            this._playStrikeAudio();

            // 2. Physical impact vibration (disabled if reduced motion)
            if (!this.prefersReducedMotion) {
                this.state.pressed = true;
                const el = this.element;

                // Retrigger class cleanly even on repeated rapid clicks
                el.classList.remove(this.config.classImpact);
                void el.offsetWidth; // Force CSS reflow
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

        // ======================================================================
        // 9. Reduced Motion Handling
        // ======================================================================

        /**
         * Handles system prefers-reduced-motion preference changes.
         * 
         * @param {MediaQueryListEvent} e
         * @private
         */
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

        // ======================================================================
        // 10. Initialization & Event Binding
        // ======================================================================

        /**
         * Initializes element discovery, audio, listeners, and entrance animation.
         * @private
         */
        _init() {
            const hasElement = this._setupElement();
            if (!hasElement) {
                // Return safely without error if element not found in DOM
                this.isDestroyed = true;
                return;
            }

            // Setup audio system
            this._setupAudio();

            const el = this.element;

            // Attach element interaction listeners
            el.addEventListener('pointerenter', this._onPointerEnter, { passive: true });
            el.addEventListener('pointerleave', this._onPointerLeave, { passive: true });
            el.addEventListener('pointerdown', this._onPointerDown, { passive: true });
            el.addEventListener('click', this._onClick);
            el.addEventListener('keydown', this._onKeyDown);

            // Attach document-wide pointer tracking for ambient lighting calculations
            if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
                window.addEventListener('pointermove', this._onPointerMove, { passive: true });

                // Reduced motion media query listener
                if (typeof window.matchMedia === 'function') {
                    this.mediaQueryList = window.matchMedia('(prefers-reduced-motion: reduce)');
                    if (this.mediaQueryList && this.mediaQueryList.addEventListener) {
                        this.mediaQueryList.addEventListener('change', this._onReducedMotionChange);
                    } else if (this.mediaQueryList && this.mediaQueryList.addListener) {
                        this.mediaQueryList.addListener(this._onReducedMotionChange);
                    }
                }
            }

            // Trigger initial entrance animation
            this._runEntranceAnimation();

            // Track instance
            activeInstances.add(this);
        }

        // ======================================================================
        // 11. Public Controller API & Cleanup
        // ======================================================================

        /**
         * Returns current controller snapshot.
         * 
         * @returns {Object} State summary
         */
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

        /**
         * Dynamically updates configuration parameters.
         * 
         * @param {Object} newOptions - Partial configuration overrides
         */
        setOptions(newOptions = {}) {
            Object.assign(this.config, newOptions);
            if (newOptions.audioVolume !== undefined && this.audio) {
                this.audio.volume = Math.max(0, Math.min(1, newOptions.audioVolume));
            }
        }

        /**
         * Complete teardown: removes pointer, keyboard, and click listeners,
         * cancels active timers, releases audio resources, and restores CSS properties.
         */
        destroy() {
            if (this.isDestroyed) return;
            this.isDestroyed = true;

            // 1. Clear pending timers
            if (this.entranceTimerId) {
                clearTimeout(this.entranceTimerId);
                this.entranceTimerId = null;
            }
            if (this.impactTimerId) {
                clearTimeout(this.impactTimerId);
                this.impactTimerId = null;
            }

            // 2. Remove element listeners
            if (this.element) {
                this.element.removeEventListener('pointerenter', this._onPointerEnter);
                this.element.removeEventListener('pointerleave', this._onPointerLeave);
                this.element.removeEventListener('pointerdown', this._onPointerDown);
                this.element.removeEventListener('click', this._onClick);
                this.element.removeEventListener('keydown', this._onKeyDown);

                // Remove CSS classes
                this.element.classList.remove(
                    this.config.classLoaded,
                    this.config.classEntering,
                    this.config.classSettled,
                    this.config.classHovered,
                    this.config.classImpact
                );

                // Restore modified CSS custom properties
                const style = this.element.style;
                style.removeProperty(this.config.cssPropLightX);
                style.removeProperty(this.config.cssPropLightY);
                style.removeProperty(this.config.cssPropTiltX);
                style.removeProperty(this.config.cssPropTiltY);
                style.removeProperty(this.config.cssPropShiftX);
                style.removeProperty(this.config.cssPropShiftY);
                style.removeProperty(this.config.cssPropInteraction);

                // If dynamically created element, remove from DOM
                if (this.isDynamicElement && this.element.parentNode) {
                    this.element.parentNode.removeChild(this.element);
                }
            }

            // 3. Remove window listeners
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

            // 4. Release audio references
            if (this.audio) {
                this.audio.pause();
                this.audio.src = '';
                this.audio = null;
            }

            // 5. Clear references
            this.element = null;
            activeInstances.delete(this);
        }
    }

    // ==========================================================================
    // 12. Public Initializer & Export
    // ==========================================================================

    /**
     * Initializes the interactive metallic logo.
     * Prevents duplicate instances on the same DOM element.
     * 
     * @param {Object} [options] - Configuration overrides
     * @returns {LogoController|null} Controller instance or null if element not found
     */
    function initLogoAnimation(options = {}) {
        // Multi-init guard: return existing active instance if already bound to matching selector
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

    // Expose globally on window
    if (typeof global !== 'undefined') {
        global.initLogoAnimation = initLogoAnimation;
        global.initLogo = initLogoAnimation; // Convenience alias
        global.LogoController = LogoController;
    }

    // CommonJS support for test suites, bundlers, and Node environments
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
