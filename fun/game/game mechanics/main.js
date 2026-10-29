/**
 * Arcade Game Entry Point (Phaser.js 4 Engine)
 * File: fun/game/game mechanics/main.js
 */
function initArcadeGame() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  const SceneClass = window.ClickerGame;
  if (!SceneClass || typeof Phaser === 'undefined') {
    return;
  }

  if (window.phaserGame) {
    return; // Already initialized
  }

  // Remove placeholder canvas if present
  const oldCanvas = document.getElementById('game-canvas');
  if (oldCanvas) {
    oldCanvas.remove();
  }

  const config = {
    type: Phaser.AUTO,
    parent: 'canvas-container',
    width: 800,
    height: 650,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false
      }
    },
    scene: [SceneClass]
  };

  window.phaserGame = new Phaser.Game(config);
}

document.addEventListener('DOMContentLoaded', initArcadeGame);
window.addEventListener('clickergameready', initArcadeGame);
window.addEventListener('load', initArcadeGame);
