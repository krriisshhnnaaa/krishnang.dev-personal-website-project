/**
 * 2D Physics Engine for Resume Runner Arcade Game
 * Path: /fun/game/'game backend'/physics.js
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GamePhysics = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class Vector2D {
    constructor(x = 0, y = 0) {
      this.x = x;
      this.y = y;
    }

    set(x, y) {
      this.x = x;
      this.y = y;
      return this;
    }

    copy(v) {
      this.x = v.x;
      this.y = v.y;
      return this;
    }

    add(v) {
      this.x += v.x;
      this.y += v.y;
      return this;
    }

    sub(v) {
      this.x -= v.x;
      this.y -= v.y;
      return this;
    }

    scale(s) {
      this.x *= s;
      this.y *= s;
      return this;
    }

    clone() {
      return new Vector2D(this.x, this.y);
    }
  }

  class Box2D {
    constructor(x = 0, y = 0, width = 0, height = 0, type = 'solid') {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.type = type; // 'solid', 'platform', 'hazard', 'goal'
    }

    get left() { return this.x; }
    get right() { return this.x + this.width; }
    get top() { return this.y; }
    get bottom() { return this.y + this.height; }

    intersects(other) {
      return (
        this.left < other.right &&
        this.right > other.left &&
        this.top < other.bottom &&
        this.bottom > other.top
      );
    }

    contains(px, py) {
      return (
        px >= this.left &&
        px <= this.right &&
        py >= this.top &&
        py <= this.bottom
      );
    }
  }

  class PhysicsBody {
    constructor(options = {}) {
      this.pos = new Vector2D(options.x || 0, options.y || 0);
      this.prevPos = this.pos.clone();
      this.vel = new Vector2D(options.vx || 0, options.vy || 0);
      this.acc = new Vector2D(0, 0);
      this.size = new Vector2D(options.width || 32, options.height || 44);
      this.isGrounded = false;
      this.isStatic = options.isStatic || false;
      this.gravityScale = options.gravityScale !== undefined ? options.gravityScale : 1.0;
      this.friction = options.friction !== undefined ? options.friction : 0.85;
      this.maxSpeedX = options.maxSpeedX || 450;
      this.maxSpeedY = options.maxSpeedY || 950;
      this.tag = options.tag || 'entity';
    }

    get box() {
      return new Box2D(this.pos.x, this.pos.y, this.size.x, this.size.y);
    }

    applyForce(fx, fy) {
      this.acc.x += fx;
      this.acc.y += fy;
    }
  }

  class PhysicsWorld {
    constructor(options = {}) {
      this.gravity = new Vector2D(0, options.gravity || 1600);
      this.bounds = {
        minX: options.minX || 0,
        maxX: options.maxX || 4000,
        minY: options.minY || 0,
        maxY: options.maxY || 1000
      };
      this.colliders = [];
      this.bodies = [];
    }

    addCollider(box) {
      this.colliders.push(box);
      return box;
    }

    addBody(body) {
      this.bodies.push(body);
      return body;
    }

    removeBody(body) {
      const idx = this.bodies.indexOf(body);
      if (idx !== -1) {
        this.bodies.splice(idx, 1);
      }
    }

    step(dt) {
      // Clamp dt to avoid physics spiral on lag spike
      const clampedDt = Math.min(dt, 0.05);

      for (let i = 0; i < this.bodies.length; i++) {
        const body = this.bodies[i];
        if (body.isStatic) continue;

        body.prevPos.copy(body.pos);

        // Apply Gravity
        body.vel.y += this.gravity.y * body.gravityScale * clampedDt;

        // Apply Acceleration
        body.vel.x += body.acc.x * clampedDt;
        body.vel.y += body.acc.y * clampedDt;
        body.acc.set(0, 0);

        // Apply Friction on ground
        if (body.isGrounded) {
          body.vel.x *= Math.pow(body.friction, clampedDt * 60);
        }

        // Clamp maximum speeds
        if (Math.abs(body.vel.x) > body.maxSpeedX) {
          body.vel.x = Math.sign(body.vel.x) * body.maxSpeedX;
        }
        if (Math.abs(body.vel.y) > body.maxSpeedY) {
          body.vel.y = Math.sign(body.vel.y) * body.maxSpeedY;
        }

        // 1. HORIZONTAL MOVEMENT & COLLISION
        body.pos.x += body.vel.x * clampedDt;

        // Clamp to level boundary
        if (body.pos.x < this.bounds.minX) {
          body.pos.x = this.bounds.minX;
          body.vel.x = 0;
        } else if (body.pos.x + body.size.x > this.bounds.maxX) {
          body.pos.x = this.bounds.maxX - body.size.x;
          body.vel.x = 0;
        }

        let bodyBox = body.box;
        for (let j = 0; j < this.colliders.length; j++) {
          const col = this.colliders[j];
          if (col.type !== 'solid') continue;

          if (bodyBox.intersects(col)) {
            if (body.vel.x > 0) {
              body.pos.x = col.left - body.size.x;
            } else if (body.vel.x < 0) {
              body.pos.x = col.right;
            }
            body.vel.x = 0;
            bodyBox = body.box;
          }
        }

        // 2. VERTICAL MOVEMENT & COLLISION
        body.pos.y += body.vel.y * clampedDt;
        body.isGrounded = false;
        bodyBox = body.box;

        for (let j = 0; j < this.colliders.length; j++) {
          const col = this.colliders[j];

          if (col.type === 'solid') {
            if (bodyBox.intersects(col)) {
              if (body.vel.y > 0) {
                // Falling onto surface
                body.pos.y = col.top - body.size.y;
                body.vel.y = 0;
                body.isGrounded = true;
              } else if (body.vel.y < 0) {
                // Hitting ceiling
                body.pos.y = col.bottom;
                body.vel.y = 0;
              }
              bodyBox = body.box;
            }
          } else if (col.type === 'platform') {
            // One-way jump-through platform from above
            const prevBottom = body.prevPos.y + body.size.y;
            if (body.vel.y > 0 && prevBottom <= col.top && bodyBox.intersects(col)) {
              body.pos.y = col.top - body.size.y;
              body.vel.y = 0;
              body.isGrounded = true;
              bodyBox = body.box;
            }
          }
        }

        // Bottom boundary check
        if (body.pos.y + body.size.y >= this.bounds.maxY) {
          body.pos.y = this.bounds.maxY - body.size.y;
          body.vel.y = 0;
          body.isGrounded = true;
        }
      }
    }
  }

  class Camera2D {
    constructor(viewportWidth = 800, viewportHeight = 1000, worldWidth = 4000, worldHeight = 1000) {
      this.viewportWidth = viewportWidth;
      this.viewportHeight = viewportHeight;
      this.worldWidth = worldWidth;
      this.worldHeight = worldHeight;
      this.x = 0;
      this.y = 0;
      this.targetX = 0;
      this.targetY = 0;
      this.smoothing = 0.08;
      this.deadzoneX = 220;
    }

    follow(targetX, targetY) {
      // Center target or follow with horizontal offset
      const desiredX = targetX - this.viewportWidth * 0.35;
      this.targetX = Math.max(0, Math.min(desiredX, this.worldWidth - this.viewportWidth));
      this.x += (this.targetX - this.x) * this.smoothing;
    }

    toScreenX(worldX) {
      return worldX - this.x;
    }

    toScreenY(worldY) {
      return worldY - this.y;
    }
  }

  return {
    Vector2D,
    Box2D,
    PhysicsBody,
    PhysicsWorld,
    Camera2D
  };
});
