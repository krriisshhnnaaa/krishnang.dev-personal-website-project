/**
 * Level 1: Resume Runner vs The ATS Filter (Phaser.js 4 Engine)
 * Strictly matching agy.info:
 * - Engine: Phaser.js 4
 * - Type: Mario style game with a long path (5 * width = 4000px)
 * - Ground: Repeating ground assets across the entire path
 * - Platforms: Vertical spacing strictly = 70px per tier
 * - Number of ATS enemy entities = 7
 * - Enemy: ATS assets (ats_1, ats_2, ats_squashed), random patrol, stomp squash
 * - Player: Resume assets (resume_idle, resume_walk1/2, resume_jump, resume_hurt)
 * - Player HP: 3 hearts (damage hp -= 1, knockback, damage cooldown)
 * - Controls:
 *     SPACE: Jump
 *     D / ArrowRight: Move forward
 *     A / ArrowLeft: Move backward
 *     W: Jump
 *     S / ArrowDown: Lower mobility (crouch / crawl speed)
 * - Win Condition: Reach invitation message (goal_envelope) at end of path
 * - Victory Popup: "SUCCESS ! YOUR RESUME MADE IT TO THE HR ! go to SELECTION ROUND ?"
 * File: fun/game/game mechanics/L1/L1.js
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

  playJump() {
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.15);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
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
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(60, now + 0.25);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    } catch (e) {}
  }

  playStomp() {
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.18);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
    } catch (e) {}
  }

  playWin() {
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [261.63, 329.63, 392.0, 523.25];
      notes.forEach((freq, i) => {
        const now = this.ctx.currentTime + i * 0.12;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      });
    } catch (e) {}
  }
}

const sfx = new SoundFX();

const PhaserScene = (typeof Phaser !== 'undefined' && Phaser.Scene)
  ? Phaser.Scene
  : class {};

export class ClickerGame extends PhaserScene {
  constructor() {
    super('ClickerGame');
  }

  preload() {
    // Game assets directory path as specified in agy.info: /fun/game/game mechanics/L1/L1 assets
    const basePath = 'game mechanics/L1/L1assets/png/';
    this.load.image('resume_idle', basePath + 'resume_idle.png');
    this.load.image('resume_walk1', basePath + 'resume_walk1.png');
    this.load.image('resume_walk2', basePath + 'resume_walk2.png');
    this.load.image('resume_jump', basePath + 'resume_jump.png');
    this.load.image('resume_hurt', basePath + 'resume_hurt.png');
    this.load.image('ats_1', basePath + 'ats_1.png');
    this.load.image('ats_2', basePath + 'ats_2.png');
    this.load.image('ats_squashed', basePath + 'ats_squashed.png');
    this.load.image('ground_tile', basePath + 'ground_tile.png');
    this.load.image('bg_keywords', basePath + 'bg_keywords.png');
    this.load.image('goal_envelope', basePath + 'goal_envelope.png');
  }

  create() {
    sfx.init();

    // Reset any open modal from previous rounds and ensure physics is unpaused
    const existingModal = document.getElementById('game-modal');
    if (existingModal) {
      existingModal.style.display = 'none';
      existingModal.innerHTML = '';
    }
    if (this.physics && this.physics.resume) {
      this.physics.resume();
    }

    // World Dimensions: Long path = 5 * viewport width (5 * 800 = 4000px)
    this.worldWidth = 4000;
    this.worldHeight = 650;
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

    // Sky Background
    this.cameras.main.setBackgroundColor('#0b1329');

    // Parallax background with keyword clouds
    if (this.textures.exists('bg_keywords')) {
      this.bg = this.add.tileSprite(0, 0, 800, 650, 'bg_keywords')
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setAlpha(0.2);
    }

    // Platforms Group (Static)
    this.platforms = this.physics.add.staticGroup();

    // 1. Repeating ground assets across the entire path (0 to 4000px)
    // Ground surface rests at y = 550 (groundY 600 - height/2 50)
    const groundTileWidth = 128;
    const groundY = 600;
    for (let x = 0; x < this.worldWidth + groundTileWidth; x += groundTileWidth) {
      if (this.textures.exists('ground_tile')) {
        const tile = this.platforms.create(x + groundTileWidth / 2, groundY, 'ground_tile');
        tile.setDisplaySize(groundTileWidth, 100);
        tile.refreshBody();
      } else {
        const tile = this.add.rectangle(x + groundTileWidth / 2, groundY, groundTileWidth, 100, 0x1e3a8a);
        this.physics.add.existing(tile, true);
        this.platforms.add(tile);
      }
    }

    // 2. Floating platforms: per platform y coordinate spacing strictly = 70px
    // Ground surface is at y = 550.
    // Tier 1: 550 - 70 = 480
    // Tier 2: 480 - 70 = 410
    // Tier 3: 410 - 70 = 340
    // Tier 4: 340 - 70 = 270
    const addFloatingPlatform = (x, y, width = 180) => {
      const plat = this.add.rectangle(x, y, width, 18, 0x0284c7);
      plat.setStrokeStyle(2, 0x38bdf8, 0.8);
      this.physics.add.existing(plat, true);
      this.platforms.add(plat);
      return plat;
    };

    // Platform layout arranged along the 4000px trail with 70px vertical spacing:
    // Section 1 (Warmup)
    addFloatingPlatform(320, 480, 160);
    addFloatingPlatform(540, 410, 160); // 480 - 70 = 410
    addFloatingPlatform(760, 480, 160);

    // Section 2 (Mid-air stepping)
    addFloatingPlatform(1100, 480, 180);
    addFloatingPlatform(1320, 410, 180); // 480 - 70 = 410
    addFloatingPlatform(1540, 340, 160); // 410 - 70 = 340
    addFloatingPlatform(1760, 410, 180);
    addFloatingPlatform(1980, 480, 180);

    // Section 3 (High towers)
    addFloatingPlatform(2300, 480, 180);
    addFloatingPlatform(2500, 410, 160); // 480 - 70 = 410
    addFloatingPlatform(2700, 340, 160); // 410 - 70 = 340
    addFloatingPlatform(2900, 270, 150); // 340 - 70 = 270
    addFloatingPlatform(3100, 340, 160);
    addFloatingPlatform(3300, 410, 180);
    addFloatingPlatform(3520, 480, 180);

    // Final Stage before Invitation Message
    addFloatingPlatform(3780, 480, 220);

    // 3. WIN CONDITION: Goal Invitation Message (goal_envelope) at end of path
    const goalX = 3880;
    const goalY = 490;
    if (this.textures.exists('goal_envelope')) {
      this.goal = this.physics.add.staticSprite(goalX, goalY, 'goal_envelope');
      this.goal.setDisplaySize(64, 64);
      this.goal.refreshBody();
    } else {
      this.goal = this.add.rectangle(goalX, goalY, 50, 40, 0xfacc15);
      this.physics.add.existing(this.goal, true);
    }

    // Subtle breathing/floating animation on the goal invitation message
    this.tweens.add({
      targets: this.goal,
      y: goalY - 15,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        if (this.goal && this.goal.refreshBody) {
          this.goal.refreshBody();
        }
      }
    });

    // 4. Player Character (Resume character)
    if (this.textures.exists('resume_idle')) {
      this.player = this.physics.add.sprite(100, 480, 'resume_idle');
      this.player.setDisplaySize(40, 55);
    } else {
      this.player = this.add.rectangle(100, 480, 34, 48, 0xe53935);
      this.physics.add.existing(this.player);
    }

    this.player.body.setCollideWorldBounds(true);
    this.player.body.setGravityY(920);
    this.player.body.setMaxVelocity(280, 850);
    this.physics.add.collider(this.player, this.platforms);

    // Player State
    this.hp = 3;
    this.isKnockedBack = false;
    this.isInvulnerable = false;
    this.hasWon = false;
    this.walkAnimTimer = 0;
    this.walkFrame = 1;

    // 5. EXACTLY 7 ATS Enemy Entities
    this.enemies = this.physics.add.group();

    // 7 strategically positioned enemy encounters across ground and platforms
    const enemyConfigs = [
      { x: 620,  y: 536, min: 460,  max: 780,  speed: 100 },
      { x: 1320, y: 387, min: 1245, max: 1395, speed: 90 },
      { x: 1650, y: 536, min: 1500, max: 1850, speed: 110 },
      { x: 2150, y: 536, min: 1950, max: 2350, speed: 95 },
      { x: 2700, y: 317, min: 2635, max: 2765, speed: 85 },
      { x: 3180, y: 536, min: 3000, max: 3380, speed: 120 },
      { x: 3620, y: 536, min: 3480, max: 3750, speed: 105 }
    ];

    enemyConfigs.forEach((cfg, index) => {
      let enemy;

      if (this.textures.exists('ats_1')) {
        enemy = this.physics.add.sprite(cfg.x, cfg.y, 'ats_1');
        enemy.setDisplaySize(54, 28);
      } else {
        enemy = this.add.rectangle(
          cfg.x, cfg.y, 44, 28, 0x9333ea
        );
        this.physics.add.existing(enemy);
      }

      // Keep each enemy's physics body active and kinematic
      enemy.body.setEnable(true);
      enemy.body.setAllowGravity(false);
      enemy.body.setImmovable(true);

      // Patrol configuration
      enemy.patrolMin = cfg.min;
      enemy.patrolMax = cfg.max;
      enemy.patrolSpeed = cfg.speed;
      enemy.patrolDirection = 1;
      enemy.changeTimer = 0;
      enemy.nextTurnTime = 2000 + (index * 350);

      enemy.isSquashed = false;
      enemy.enemyIndex = index + 1;
      enemy.walkTimer = 0;

      // Initial movement
      enemy.body.setVelocityX(enemy.patrolSpeed);

      this.enemies.add(enemy);
    });

    // 6. Camera setup: Mario-style side-scrolling following player
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // 7. Collisions & Overlaps
    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerEnemyCollision, null, this);
    this.physics.add.overlap(this.player, this.goal, this.handleReachGoal, null, this);

    // 8. Keyboard Controls & User Interaction Sound Unlock
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D,W,S,SPACE');
    if (this.input.keyboard.addCapture) {
      this.input.keyboard.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
    }
    this.input.on('pointerdown', () => sfx.init());

    // 9. Camera HUD (Fixed to camera viewport)
    this.hudGroup = this.add.group();

    // Backdrop for HUD
    this.add.rectangle(400, 26, 800, 52, 0x050a18, 0.85)
      .setScrollFactor(0)
      .setDepth(100);

    // Title Badge
    this.titleText = this.add.text(24, 14, 'RESUME RUNNER: PASS THE ATS', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#38bdf8',
      fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(101);

    // Controls hint
    this.hintText = this.add.text(24, 32, '[D/→] Run  [SPACE/W/↑] Jump  [S/↓] Crouch', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#94a3b8'
    }).setScrollFactor(0).setDepth(101);

    // Hearts HUD for HP
    this.heartsText = this.add.text(780, 16, '❤️❤️❤️', {
      fontSize: '20px'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(101);

    // Distance to HR / Invitation Message indicator
    this.progressText = this.add.text(540, 24, 'PROGRESS: 0%', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#facc15'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
  }

  update(time, delta) {
    if (this.hasWon || this.hp <= 0) return;

    // Parallax background follow
    if (this.bg) {
      this.bg.tilePositionX = this.cameras.main.scrollX * 0.25;
    }

    // Update Progress Percentage in HUD
    const percent = Math.min(100, Math.max(0, Math.floor((this.player.x / 3880) * 100)));
    this.progressText.setText(`PROGRESS: ${percent}%`);

    const body = this.player.body;
    const onFloor = body.blocked.down || body.touching.down;

    // Player Movement (D = forward, A = backward, S = lower mobility)
    if (!this.isKnockedBack) {
      let speed = 260;

      // S key: small lower mobility (crouch crawl)
      if (this.keys.S.isDown || this.cursors.down.isDown) {
        speed = 110;
      }

      if (this.cursors.left.isDown || this.keys.A.isDown) {
        body.setVelocityX(-speed);
        if (this.player.setFlipX) this.player.setFlipX(true);
        this.animatePlayerWalk(delta);
      } else if (this.cursors.right.isDown || this.keys.D.isDown) {
        body.setVelocityX(speed);
        if (this.player.setFlipX) this.player.setFlipX(false);
        this.animatePlayerWalk(delta);
      } else {
        body.setVelocityX(0);
        if (onFloor && this.player.setTexture && this.textures.exists('resume_idle')) {
          this.player.setTexture('resume_idle');
        }
      }

      // Air state texture (jumping or falling)
      if (!onFloor && this.player.setTexture && this.textures.exists('resume_jump')) {
        this.player.setTexture('resume_jump');
      }

      // Jump Action (SPACE or W or Up arrow)
      const jumpPressed =
        Phaser.Input.Keyboard.JustDown(this.keys.SPACE) ||
        Phaser.Input.Keyboard.JustDown(this.keys.W) ||
        Phaser.Input.Keyboard.JustDown(this.cursors.up);

      if (jumpPressed && onFloor) {
        body.setVelocityY(-470);
        sfx.playJump();
        if (this.player.setTexture && this.textures.exists('resume_jump')) {
          this.player.setTexture('resume_jump');
        }
      }
    }

    // Fall below world failsafe
    if (this.player.y > this.worldHeight + 50) {
      this.triggerGameOver();
      return;
    }

    // Patrol all active ATS enemies
    this.enemies.getChildren().forEach((enemy) => {
      if (
        !enemy.active ||
        enemy.isSquashed ||
        !enemy.body ||
        !enemy.body.enable
      ) {
        return;
      }

      const enemyBody = enemy.body;

      // Random turnaround timer for dynamic patrolling
      enemy.changeTimer = (enemy.changeTimer || 0) + delta;
      if (enemy.changeTimer > enemy.nextTurnTime) {
        enemy.changeTimer = 0;
        enemy.nextTurnTime = Phaser.Math ? Phaser.Math.Between(1800, 3600) : 2500;
        if (Math.random() < 0.5) {
          enemy.patrolDirection *= -1;
        }
      }

      // Reverse direction before the enemy crosses its patrol limit
      const leftEdge = enemy.x - enemy.displayWidth / 2;
      const rightEdge = enemy.x + enemy.displayWidth / 2;

      if (enemy.patrolDirection > 0 && rightEdge >= enemy.patrolMax) {
        enemy.patrolDirection = -1;
        enemy.x = enemy.patrolMax - enemy.displayWidth / 2;
      } else if (enemy.patrolDirection < 0 && leftEdge <= enemy.patrolMin) {
        enemy.patrolDirection = 1;
        enemy.x = enemy.patrolMin + enemy.displayWidth / 2;
      }

      // Apply horizontal movement every frame
      enemyBody.setVelocityX(enemy.patrolDirection * enemy.patrolSpeed);

      // Face the direction of travel
      if (enemy.setFlipX) {
        enemy.setFlipX(enemy.patrolDirection < 0);
      }

      // Animate walking
      enemy.walkTimer += delta;
      if (enemy.walkTimer >= 180) {
        enemy.walkTimer = 0;
        if (
          this.textures.exists('ats_1') &&
          this.textures.exists('ats_2') &&
          enemy.setTexture
        ) {
          enemy.walkFrame = enemy.walkFrame === 1 ? 2 : 1;
          enemy.setTexture(enemy.walkFrame === 1 ? 'ats_1' : 'ats_2');
        }
      }
    });
  }

  animatePlayerWalk(delta) {
    const body = this.player.body;
    const onFloor = body.blocked.down || body.touching.down;
    if (!onFloor) return;

    this.walkAnimTimer += delta;
    if (this.walkAnimTimer >= 140) {
      this.walkAnimTimer = 0;
      this.walkFrame = this.walkFrame === 1 ? 2 : 1;
      const frameKey = this.walkFrame === 1 ? 'resume_walk1' : 'resume_walk2';
      if (this.player.setTexture && this.textures.exists(frameKey)) {
        this.player.setTexture(frameKey);
      }
    }
  }

  handlePlayerEnemyCollision(player, enemy) {
    if (enemy.isSquashed || this.hasWon) return;

    // Mario style stomp mechanic:
    // If player is falling downward and lands on top of the enemy
    const isStomp = player.body.velocity.y > 0 && (player.body.bottom <= enemy.body.bottom - 4);

    if (isStomp) {
      // Squash enemy!
      enemy.isSquashed = true;
      enemy.body.setVelocity(0, 0);
      enemy.body.enable = false;
      sfx.playStomp();

      if (this.textures.exists('ats_squashed')) {
        enemy.setTexture('ats_squashed');
      }

      // Bounce player upward
      player.body.setVelocityY(-340);

      // Fade out squashed enemy
      this.tweens.add({
        targets: enemy,
        alpha: 0,
        scaleY: 0.3,
        duration: 350,
        onComplete: () => {
          enemy.destroy();
        }
      });
      return;
    }

    // Otherwise: Player takes damage
    if (this.isInvulnerable) return;

    sfx.playHurt();
    this.hp--;
    this.updateHeartsDisplay();

    if (this.player.setTexture && this.textures.exists('resume_hurt')) {
      this.player.setTexture('resume_hurt');
    }

    // Knockback
    this.isKnockedBack = true;
    this.isInvulnerable = true;
    const direction = player.x < enemy.x ? -1 : 1;
    player.body.setVelocityX(direction * 260);
    player.body.setVelocityY(-260);

    // Restore control after 280ms
    this.time.delayedCall(280, () => {
      this.isKnockedBack = false;
    });

    // Flickering invulnerability for 1000ms
    this.tweens.add({
      targets: this.player,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 4,
      onComplete: () => {
        this.player.setAlpha(1);
        this.isInvulnerable = false;
      }
    });

    if (this.hp <= 0) {
      this.triggerGameOver();
    }
  }

  updateHeartsDisplay() {
    let hearts = '';
    for (let i = 0; i < Math.max(0, this.hp); i++) {
      hearts += '❤️';
    }
    this.heartsText.setText(hearts || '💔');
  }

  handleReachGoal(player, goal) {
    if (this.hasWon) return;
    this.hasWon = true;
    this.physics.pause();
    sfx.playWin();

    // Trigger HTML modal overlay if present
    const modal = document.getElementById('game-modal');
    if (modal) {
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-icon">📨</div>
          <h2 class="modal-title success">SUCCESS ! YOUR RESUME MADE IT TO THE HR !</h2>
          <p class="modal-question">go to SELECTION ROUND ?</p>
          <div class="modal-actions">
            <a href="../../forms/choicepage.html" class="btn-arcade btn-arcade-primary">
              ✓ YES, GO TO SELECTION ROUND
            </a>
            <button type="button" class="btn-arcade btn-arcade-secondary" onclick="window.location.reload()">
              ↺ PLAY AGAIN
            </button>
          </div>
        </div>
      `;
      modal.style.display = 'flex';
    } else {
      // In-canvas fallback modal
      this.add.rectangle(400, 300, 700, 220, 0x0f172a, 0.95)
        .setStrokeStyle(3, 0x38bdf8)
        .setScrollFactor(0)
        .setDepth(200);

      this.add.text(400, 240, 'SUCCESS ! YOUR RESUME MADE IT TO THE HR !', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#4ade80',
        fontStyle: 'bold'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

      this.add.text(400, 280, 'go to SELECTION ROUND ?', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#38bdf8'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

      const btn = this.add.text(400, 340, '✓ YES, GO TO SELECTION ROUND', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#0284c7',
        padding: { x: 18, y: 10 }
      }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => {
        window.location.href = '../../forms/choicepage.html';
      });
    }
  }

  triggerGameOver() {
    this.hp = 0;
    this.updateHeartsDisplay();
    this.physics.pause();
    sfx.playHurt();

    const modal = document.getElementById('game-modal');
    if (modal) {
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-icon">💀</div>
          <h2 class="modal-title gameover">GAME OVER</h2>
          <p class="modal-question">Your resume was filtered out by the ATS.</p>
          <div class="modal-actions">
            <button type="button" class="btn-arcade btn-arcade-primary" onclick="window.location.reload()">
              ↺ TRY AGAIN
            </button>
            <a href="../../index.html" class="btn-arcade btn-arcade-secondary">
              ← BACK TO HOME
            </a>
          </div>
        </div>
      `;
      modal.style.display = 'flex';
    } else {
      this.add.rectangle(400, 300, 500, 180, 0x0f172a, 0.95)
        .setStrokeStyle(3, 0xf43f5e)
        .setScrollFactor(0)
        .setDepth(200);

      this.add.text(400, 260, 'GAME OVER', {
        fontSize: '44px',
        color: '#f43f5e',
        fontStyle: 'bold'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

      const restart = this.add.text(400, 330, 'CLICK TO RESTART', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#e11d48',
        padding: { x: 16, y: 8 }
      }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setInteractive({ useHandCursor: true });

      restart.on('pointerdown', () => {
        this.scene.restart();
      });
    }
  }
}

// Expose globally on window
if (typeof window !== 'undefined') {
  window.ClickerGame = ClickerGame;
}
