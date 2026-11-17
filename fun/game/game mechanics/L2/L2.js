/**
 * Level 2: Rocket Rejection (Phaser.js 4 Engine)
 * Strictly matching agy.info action NOW instructions:
 * - Game Title: "rocket rejection"
 * - Engine: Phaser.js 4
 * - Assets path: /fun/game/game mechanics/L2/assets
 * - Rocket: bottom of game window
 * - Asteroids: rejection mail (asset: asteroid_x_small@4x ; asteroid_x_small, plus medium/large/word_slab)
 * - Tiles: constant motion downward
 *   simulate tiles downward motion:
 *   this.bg = this.add.tileSprite(0, 0, w, h, 'carpet').setOrigin(0) and then this.bg.tilePositionY -= speed in update().
 * - Actions:
 *     S: rocket move left
 *     D: rocket move right
 *     SPACE / W: shoot
 * - Goal: survive time: 5*60 seconds (300 seconds)
 * - Victory Popup:
 *     "survive more ? (continue game with clock reset) | move to level 3 ? (continue to game3.html)"
 * File: fun/game/game mechanics/L2/L2.js
 */

// Sound Synthesizer via Web Audio API (zero external sound file dependencies)
class SoundFX {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playShoot() {
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(920, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.11);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  playHit() {
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.08);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {}
  }

  playExplode() {
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(30, now + 0.22);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.23);
    } catch (e) {}
  }

  playHurt() {
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.linearRampToValueAtTime(70, now + 0.28);
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.29);
    } catch (e) {}
  }

  playWin() {
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [329.63, 392.0, 523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const now = this.ctx.currentTime + i * 0.12;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.26);
      });
    } catch (e) {}
  }
}

const sfx = new SoundFX();

const PhaserScene = (typeof Phaser !== 'undefined' && Phaser.Scene)
  ? Phaser.Scene
  : class {};

export class RocketRejectionGame extends PhaserScene {
  constructor() {
    super('RocketRejectionGame');
  }

  preload() {
    // Base assets directory: game mechanics/L2/assets/
    const basePath = 'game mechanics/L2/assets/';

    // Carpet tiles for downward motion simulation (agy.info)
    this.load.image('carpet', basePath + 'bg_carpet_tile@4x.png');
    this.load.image('carpet_raw', basePath + 'bg_carpet_tile.png');
    this.load.image('bg_office', basePath + 'bg_office@4x.png');

    // Asteroids = rejection mail assets (agy.info: asteroid_x_small@4x ; asteroid_x_small)
    this.load.image('asteroid_x_small', basePath + 'asteroid_x_small@4x.png');
    this.load.image('asteroid_x_small_raw', basePath + 'asteroid_x_small.png');
    this.load.image('asteroid_x_medium', basePath + 'asteroid_x_medium@4x.png');
    this.load.image('asteroid_rejection_large', basePath + 'asteroid_rejection_large@4x.png');
    this.load.image('asteroid_word_slab', basePath + 'asteroid_word_slab@4x.png');

    // Rocket and laser projectiles
    this.load.image('rocket', basePath + 'rocket.png');
    this.load.image('laser', basePath + 'laser.png');
  }

  create() {
    sfx.init();

    // Reset modals if previously visible
    const existingModal = document.getElementById('game-modal');
    if (existingModal) {
      existingModal.style.display = 'none';
      existingModal.innerHTML = '';
    }
    if (this.physics && this.physics.resume) {
      this.physics.resume();
    }

    // Canvas dimensions: 800 x 650
    const w = 800;
    const h = 650;
    this.physics.world.setBounds(0, 0, w, h);

    // Dark space/office background base
    this.cameras.main.setBackgroundColor('#070b16');

    // 1. SIMULATE TILES DOWNWARD MOTION (strictly as specified in agy.info):
    // "this.bg = this.add.tileSprite(0, 0, w, h, 'carpet').setOrigin(0) and then this.bg.tilePositionY -= speed in update()."
    if (this.textures.exists('carpet')) {
      this.bg = this.add.tileSprite(0, 0, w, h, 'carpet').setOrigin(0);
      this.bg.setAlpha(0.88);
    } else if (this.textures.exists('carpet_raw')) {
      this.bg = this.add.tileSprite(0, 0, w, h, 'carpet_raw').setOrigin(0);
      this.bg.setAlpha(0.88);
    } else {
      // Fallback graphics tileSprite
      this.bg = this.add.tileSprite(0, 0, w, h, '__DEFAULT').setOrigin(0);
    }
    this.scrollSpeed = 3.6;

    // Starfield / particle dust drifting down
    this.dustParticles = [];
    for (let i = 0; i < 40; i++) {
      const dust = this.add.circle(
        Phaser.Math.Between(0, w),
        Phaser.Math.Between(0, h),
        Phaser.Math.Between(1, 2),
        0x38bdf8,
        Phaser.Math.FloatBetween(0.2, 0.7)
      );
      dust.speed = Phaser.Math.FloatBetween(1.5, 4.2);
      this.dustParticles.push(dust);
    }

    // 2. ROCKET: Placed at bottom of game window (agy.info)
    const rocketStartX = 400;
    const rocketStartY = 575; // bottom of game window with margin
    if (this.textures.exists('rocket')) {
      this.rocket = this.physics.add.sprite(rocketStartX, rocketStartY, 'rocket');
      this.rocket.setDisplaySize(52, 65);
    } else {
      // Canvas / graphics fallback
      this.rocket = this.add.rectangle(rocketStartX, rocketStartY, 40, 56, 0x38bdf8);
      this.physics.add.existing(this.rocket);
    }

    this.rocket.setCollideWorldBounds(true);
    this.rocket.setDepth(15);
    if (this.rocket.body) {
      this.rocket.body.setSize(38, 50);
      this.rocket.body.setOffset(7, 8);
    }

    // Rocket thruster flame particle emitter / graphics
    this.thrusterFlame = this.add.triangle(
      this.rocket.x,
      this.rocket.y + 36,
      0, 0,
      12, 0,
      6, 16,
      0xf97316
    ).setDepth(14);

    // Rocket State
    this.rocketSpeed = 380;
    this.hp = 3;
    this.maxHp = 3;
    this.score = 0;
    this.isInvulnerable = false;
    this.isPlaying = true;
    this.hasWon = false;
    this.lastShotTime = 0;
    this.shotCooldown = 180; // ms between laser bursts

    // 3. GOAL: Survive time: 5*60 seconds (300 seconds)
    this.surviveGoal = 5 * 60; // 300 seconds (5 minutes)
    this.elapsedSeconds = 0;

    // 4. GROUPS: Lasers and Asteroids (Rejection Mails)
    this.lasers = this.physics.add.group();
    this.asteroids = this.physics.add.group();

    // Spawning parameters
    this.nextAsteroidTime = 0;
    this.spawnInterval = 780; // ms

    // 5. ACTIONS: S: rocket move left ; D: rocket move right ; SPACE/W: shoot
    this.keys = this.input.keyboard.addKeys({
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      W: Phaser.Input.Keyboard.KeyCodes.W,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      // Optional aliases for accessibility
      A: Phaser.Input.Keyboard.KeyCodes.A,
      LEFT: Phaser.Input.Keyboard.KeyCodes.LEFT,
      RIGHT: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      UP: Phaser.Input.Keyboard.KeyCodes.UP
    });

    // Prevent default browser scrolling on SPACE, S, W
    if (this.input.keyboard.addCapture) {
      this.input.keyboard.addCapture([
        Phaser.Input.Keyboard.KeyCodes.SPACE,
        Phaser.Input.Keyboard.KeyCodes.S,
        Phaser.Input.Keyboard.KeyCodes.D,
        Phaser.Input.Keyboard.KeyCodes.W
      ]);
    }

    // 6. COLLISIONS & OVERLAPS
    // Laser hits Asteroid
    this.physics.add.overlap(this.lasers, this.asteroids, (laser, asteroid) => {
      this.handleLaserHitAsteroid(laser, asteroid);
    });

    // Asteroid hits Rocket
    this.physics.add.overlap(this.rocket, this.asteroids, (rocket, asteroid) => {
      this.handleRocketHitAsteroid(rocket, asteroid);
    });

    // Initialize HUD display
    this.initHud();

    // Developer testing helper on window and shortcut (Shift+T or Shift+K)
    window.__winRocketRejection = () => {
      console.log('[RocketRejection] Debug trigger victory invoked.');
      this.triggerVictory();
    };

    this.input.keyboard.on('keydown', (event) => {
      if (event.shiftKey && (event.key === 'T' || event.key === 't' || event.key === 'K' || event.key === 'k')) {
        console.log('[RocketRejection] Quick-test shortcut pressed.');
        this.elapsedSeconds = Math.max(0, this.surviveGoal - 0.5);
      }
    });
  }

  update(time, delta) {
    if (!this.isPlaying) return;

    // 1. SIMULATE TILES DOWNWARD MOTION (strictly per agy.info):
    // "and then this.bg.tilePositionY -= speed in update()."
    if (this.bg) {
      this.bg.tilePositionY -= this.scrollSpeed;
    }

    // Animate background dust particles
    for (let i = 0; i < this.dustParticles.length; i++) {
      const dust = this.dustParticles[i];
      dust.y += dust.speed;
      if (dust.y > 660) {
        dust.y = -10;
        dust.x = Phaser.Math.Between(0, 800);
      }
    }

    // 2. ACTIONS: S: rocket move left ; D: rocket move right ; SPACE/W: shoot
    const moveLeft = this.keys.S.isDown || this.keys.A.isDown || this.keys.LEFT.isDown;
    const moveRight = this.keys.D.isDown || this.keys.RIGHT.isDown;

    if (moveLeft && !moveRight) {
      this.rocket.setVelocityX(-this.rocketSpeed);
      this.rocket.setAngle(-6); // subtle banking left
    } else if (moveRight && !moveLeft) {
      this.rocket.setVelocityX(this.rocketSpeed);
      this.rocket.setAngle(6); // subtle banking right
    } else {
      this.rocket.setVelocityX(0);
      this.rocket.setAngle(0);
    }

    // Keep rocket locked at bottom of window
    this.rocket.y = 575;

    // Update thruster flame position and flicker
    if (this.thrusterFlame) {
      this.thrusterFlame.x = this.rocket.x - 6;
      this.thrusterFlame.y = this.rocket.y + 33;
      this.thrusterFlame.setScale(Phaser.Math.FloatBetween(0.8, 1.25));
    }

    // Shoot: SPACE or W
    const isShooting = this.keys.SPACE.isDown || this.keys.W.isDown || this.keys.UP.isDown;
    if (isShooting && time > this.lastShotTime + this.shotCooldown) {
      this.shootLaser(time);
    }

    // 3. ASTEROID (REJECTION MAIL) SPAWNING
    if (time > this.nextAsteroidTime) {
      this.spawnAsteroid();
      // Increase spawn rate progressively as timer approaches 5 minutes
      const progress = Math.min(1, this.elapsedSeconds / this.surviveGoal);
      this.spawnInterval = Math.max(340, 800 - progress * 420);
      this.nextAsteroidTime = time + this.spawnInterval;
    }

    // 4. CLEANUP OFF-SCREEN ENTITIES
    this.asteroids.getChildren().forEach(ast => {
      if (ast && ast.active) {
        if (ast.rotationSpeed) ast.rotation += ast.rotationSpeed;
        if (ast.y > 690) {
          ast.destroy();
        }
      }
    });

    this.lasers.getChildren().forEach(laser => {
      if (laser && laser.active && laser.y < -30) {
        laser.destroy();
      }
    });

    // 5. SURVIVE TIMER (Goal: 5*60 seconds = 300s)
    this.elapsedSeconds += delta / 1000;
    this.updateHud();

    if (this.elapsedSeconds >= this.surviveGoal && !this.hasWon) {
      this.triggerVictory();
    }
  }

  shootLaser(time) {
    this.lastShotTime = time;
    sfx.playShoot();

    const spawnY = this.rocket.y - 30;
    // Dual laser blasters on wingtips
    const offsets = [-14, 14];
    offsets.forEach(offset => {
      let laser;
      if (this.textures.exists('laser')) {
        laser = this.lasers.create(this.rocket.x + offset, spawnY, 'laser');
        laser.setDisplaySize(12, 26);
      } else {
        laser = this.add.rectangle(this.rocket.x + offset, spawnY, 4, 18, 0x38bdf8);
        this.physics.add.existing(laser);
        this.lasers.add(laser);
      }
      laser.setVelocityY(-680);
      laser.setDepth(12);
    });
  }

  spawnAsteroid() {
    const x = Phaser.Math.Between(45, 755);
    const y = -40;

    // Types of rejection mails (small red X, medium, word slab, large)
    const roll = Math.random();
    let key = 'asteroid_x_small';
    let hp = 1;
    let sizeW = 42;
    let sizeH = 42;
    let points = 100;
    let speedY = Phaser.Math.Between(160, 260);

    if (roll > 0.86 && this.textures.exists('asteroid_rejection_large')) {
      key = 'asteroid_rejection_large';
      hp = 3;
      sizeW = 66;
      sizeH = 66;
      points = 350;
      speedY = Phaser.Math.Between(130, 200);
    } else if (roll > 0.72 && this.textures.exists('asteroid_word_slab')) {
      key = 'asteroid_word_slab';
      hp = 2;
      sizeW = 94;
      sizeH = 26;
      points = 250;
      speedY = Phaser.Math.Between(150, 220);
    } else if (roll > 0.52 && this.textures.exists('asteroid_x_medium')) {
      key = 'asteroid_x_medium';
      hp = 2;
      sizeW = 50;
      sizeH = 50;
      points = 200;
      speedY = Phaser.Math.Between(160, 240);
    }

    const asteroid = this.asteroids.create(x, y, key);
    asteroid.setDisplaySize(sizeW, sizeH);
    asteroid.setVelocityY(speedY);
    asteroid.setVelocityX(Phaser.Math.Between(-30, 30));
    asteroid.hp = hp;
    asteroid.maxHp = hp;
    asteroid.points = points;
    asteroid.rotationSpeed = (Math.random() - 0.5) * 0.04;
    asteroid.setDepth(6);
  }

  handleLaserHitAsteroid(laser, asteroid) {
    if (!laser.active || !asteroid.active) return;
    laser.destroy();

    asteroid.hp -= 1;
    if (asteroid.hp <= 0) {
      this.createAsteroidExplosion(asteroid.x, asteroid.y, asteroid.points);
      this.score += asteroid.points;
      sfx.playExplode();
      asteroid.destroy();
    } else {
      sfx.playHit();
      this.tweens.add({
        targets: asteroid,
        alpha: 0.35,
        duration: 50,
        yoyo: true,
        repeat: 1
      });
    }
    this.updateHud();
  }

  handleRocketHitAsteroid(rocket, asteroid) {
    if (!asteroid.active || this.isInvulnerable || !this.isPlaying) return;

    asteroid.destroy();
    this.createAsteroidExplosion(asteroid.x, asteroid.y);
    this.takeDamage();
  }

  takeDamage() {
    this.hp -= 1;
    sfx.playHurt();
    this.cameras.main.shake(160, 0.012);
    this.updateHud();

    if (this.hp <= 0) {
      this.triggerGameOver();
    } else {
      // Invulnerability period
      this.isInvulnerable = true;
      this.tweens.add({
        targets: this.rocket,
        alpha: 0.2,
        duration: 100,
        yoyo: true,
        repeat: 7,
        onComplete: () => {
          if (this.rocket) {
            this.rocket.alpha = 1;
          }
          this.isInvulnerable = false;
        }
      });
    }
  }

  createAsteroidExplosion(x, y, points) {
    // Spark burst
    for (let i = 0; i < 8; i++) {
      const spark = this.add.circle(x, y, Phaser.Math.Between(2, 5), 0xf43f5e, 1).setDepth(20);
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.3;
      const speed = Phaser.Math.Between(60, 140);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(220, 380),
        onComplete: () => spark.destroy()
      });
    }

    // Floating score popup
    if (points) {
      const scoreTxt = this.add.text(x, y - 10, `+${points}`, {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '14px',
        color: '#38bdf8',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(25);

      this.tweens.add({
        targets: scoreTxt,
        y: y - 35,
        alpha: 0,
        duration: 450,
        ease: 'Cubic.easeOut',
        onComplete: () => scoreTxt.destroy()
      });
    }
  }

  initHud() {
    // Check if DOM HUD elements exist
    this.hudTimeVal = document.getElementById('hud-time-val');
    this.hudScoreVal = document.getElementById('hud-score-val');
    this.hudProgressFill = document.getElementById('hud-progress-fill');
    this.hudShieldsContainer = document.getElementById('hud-shields-container');

    // Also render an in-canvas HUD backup in case external DOM HUD is not loaded
    if (!this.hudTimeVal) {
      this.canvasHudText = this.add.text(20, 18, '', {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '14px',
        color: '#f8fafc',
        backgroundColor: 'rgba(7, 11, 22, 0.75)',
        padding: { x: 12, y: 8 }
      }).setScrollFactor(0).setDepth(50);
    }
    this.updateHud();
  }

  updateHud() {
    const remaining = Math.max(0, this.surviveGoal - this.elapsedSeconds);
    const timeFormatted = this.formatTime(this.elapsedSeconds);
    const goalFormatted = this.formatTime(this.surviveGoal);
    const progressPercent = Math.min(100, (this.elapsedSeconds / this.surviveGoal) * 100);

    // Update DOM HUD if available
    if (this.hudTimeVal) {
      this.hudTimeVal.textContent = `${timeFormatted} / ${goalFormatted}`;
    }
    if (this.hudScoreVal) {
      this.hudScoreVal.textContent = this.score.toLocaleString();
    }
    if (this.hudProgressFill) {
      this.hudProgressFill.style.width = `${progressPercent.toFixed(1)}%`;
    }
    if (this.hudShieldsContainer) {
      let shieldsHtml = '';
      for (let i = 0; i < this.maxHp; i++) {
        const activeClass = i < this.hp ? 'active' : 'depleted';
        shieldsHtml += `<span class="shield ${activeClass}">🛡️</span>`;
      }
      this.hudShieldsContainer.innerHTML = shieldsHtml;
    }

    // In-canvas fallback HUD
    if (this.canvasHudText) {
      const shieldEmojis = '🛡️'.repeat(Math.max(0, this.hp));
      this.canvasHudText.setText(
        `TIME: ${timeFormatted} / ${goalFormatted}  |  SHIELDS: ${shieldEmojis || 'CRITICAL'}  |  SCORE: ${this.score}`
      );
    }
  }

  formatTime(secondsTotal) {
    const s = Math.floor(secondsTotal);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Victory Popup (Strictly per agy.info):
   * goal : survive time : 5*60 seconds
   * after goal : popup : survive more ? (continue game with clock reset) | move to level 3 ? (continue to game3.html)
   */
  triggerVictory() {
    this.hasWon = true;
    this.isPlaying = false;
    this.physics.pause();
    sfx.playWin();

    const modal = document.getElementById('game-modal');
    if (modal) {
      modal.innerHTML = `
        <div class="modal-content victory-content">
          <div class="modal-badge">MISSION COMPLETE</div>
          <div class="modal-icon">🏆</div>
          <h2 class="modal-title success">SURVIVED 5 MINUTES!</h2>
          <p class="modal-subtitle">You outmaneuvered and vaporized every rejection mail.</p>
          <div class="modal-stats">
            <div><span>TIME SURVIVED</span><strong>05:00</strong></div>
            <div><span>REJECTIONS SHREDDED</span><strong>${this.score.toLocaleString()}</strong></div>
          </div>
          <div class="modal-choice-box">
            <p class="modal-question">survive more ? or move to level 3 ?</p>
            <div class="modal-actions">
              <button type="button" class="btn-arcade btn-arcade-secondary" id="btn-survive-more">
                ↺ SURVIVE MORE (Reset Clock)
              </button>
              <a href="game3.html" class="btn-arcade btn-arcade-primary" id="btn-move-level3">
                🚀 MOVE TO LEVEL 3 →
              </a>
            </div>
          </div>
        </div>
      `;
      modal.style.display = 'flex';

      const surviveMoreBtn = document.getElementById('btn-survive-more');
      if (surviveMoreBtn) {
        surviveMoreBtn.addEventListener('click', () => {
          modal.style.display = 'none';
          this.hasWon = false;
          this.elapsedSeconds = 0; // reset clock as specified in agy.info
          this.hp = Math.max(this.hp, 3); // restore shields
          this.updateHud();
          this.physics.resume();
          this.isPlaying = true;
        });
      }
    } else {
      // In-canvas fallback victory dialog
      this.showInCanvasVictory();
    }
  }

  showInCanvasVictory() {
    const bg = this.add.rectangle(400, 325, 620, 320, 0x070b16, 0.95)
      .setStrokeStyle(2, 0x38bdf8)
      .setDepth(100);

    const title = this.add.text(400, 220, 'SURVIVED 5 MINUTES! MISSION COMPLETE', {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '20px',
      color: '#4ade80',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(101);

    const question = this.add.text(400, 265, 'survive more ? or move to level 3 ?', {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '16px',
      color: '#38bdf8'
    }).setOrigin(0.5).setDepth(101);

    // Button 1: Survive More
    const btnSurvive = this.add.text(280, 335, '↺ SURVIVE MORE', {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '15px',
      color: '#ffffff',
      backgroundColor: '#334155',
      padding: { x: 16, y: 10 }
    }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });

    btnSurvive.on('pointerdown', () => {
      bg.destroy();
      title.destroy();
      question.destroy();
      btnSurvive.destroy();
      btnLevel3.destroy();
      this.hasWon = false;
      this.elapsedSeconds = 0;
      this.hp = Math.max(this.hp, 3);
      this.updateHud();
      this.physics.resume();
      this.isPlaying = true;
    });

    // Button 2: Move to Level 3
    const btnLevel3 = this.add.text(520, 335, '🚀 MOVE TO LEVEL 3', {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '15px',
      color: '#ffffff',
      backgroundColor: '#0284c7',
      padding: { x: 16, y: 10 }
    }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });

    btnLevel3.on('pointerdown', () => {
      window.location.href = 'game3.html';
    });
  }

  triggerGameOver() {
    this.isPlaying = false;
    this.physics.pause();

    const modal = document.getElementById('game-modal');
    if (modal) {
      modal.innerHTML = `
        <div class="modal-content gameover-content">
          <div class="modal-icon">💥</div>
          <h2 class="modal-title failure">ROCKET OVERWHELMED!</h2>
          <p class="modal-subtitle">Rejection letters breached your defenses.</p>
          <div class="modal-stats">
            <div><span>SURVIVED</span><strong>${this.formatTime(this.elapsedSeconds)} / 05:00</strong></div>
            <div><span>SCORE</span><strong>${this.score.toLocaleString()}</strong></div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-arcade btn-arcade-primary" id="btn-retry-level2">
              ↺ RETRY LEVEL 2
            </button>
            <a href="game.html" class="btn-arcade btn-arcade-secondary">
              ← LEVEL 1: PASS THE ATS
            </a>
          </div>
        </div>
      `;
      modal.style.display = 'flex';

      const retryBtn = document.getElementById('btn-retry-level2');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          modal.style.display = 'none';
          this.scene.restart();
        });
      }
    }
  }
}

// Export aliases so any loader / main script can instantiate
export { RocketRejectionGame as ClickerGame };
if (typeof window !== 'undefined') {
  window.RocketRejectionGame = RocketRejectionGame;
}
