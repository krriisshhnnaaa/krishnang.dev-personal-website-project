/**
 * Arcade Game Entry Point (Phaser.js 4 Engine)
 * File: fun/game/game mechanics/main.js
 */
function initArcadeGame() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  const SceneClass = window.ActiveGameScene || window.ClickerGame || window.RocketRejectionGame;
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

window.switchArcadeGame = function(NewSceneClass) {
  if (window.phaserGame) {
    try {
      window.phaserGame.destroy(true);
      window.phaserGame = null;
    } catch (e) {
      console.warn('Error destroying existing phaser game instance:', e);
    }
  }
  window.ActiveGameScene = NewSceneClass;
  window.ClickerGame = NewSceneClass;
  initArcadeGame();
};

document.addEventListener('DOMContentLoaded', initArcadeGame);
window.addEventListener('clickergameready', initArcadeGame);
window.addEventListener('load', initArcadeGame);
