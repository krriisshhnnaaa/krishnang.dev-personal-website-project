/* One-shot audio cue when switching to work-in-progress stages (game3–game5) */
(function () {
  'use strict';

  var audio = new Audio('../../work_audio.mp3');
  audio.preload = 'auto';
  audio.loop = false;

  var played = false;

  function playOnce() {
    if (played) return;
    played = true;

    try {
      var promise = audio.play();
      if (promise && typeof promise.catch === 'function') {
        promise.catch(function () {
          played = false;
          var unlock = function () {
            if (played) return;
            played = true;
            audio.play().catch(function () {});
            window.removeEventListener('pointerdown', unlock);
            window.removeEventListener('keydown', unlock);
          };
          window.addEventListener('pointerdown', unlock, { once: true });
          window.addEventListener('keydown', unlock, { once: true });
        });
      }
    } catch (err) {
      // Ignore playback errors in restricted environments
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', playOnce, { once: true });
  } else {
    playOnce();
  }
})();
