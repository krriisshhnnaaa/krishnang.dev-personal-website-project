/* Automatic button-free exec-once audio cue & same-document switcher for game3–game5 */
(function () {
  'use strict';

  var WIP_PATTERN = /(?:^|\/)(game[345]\.html)(?:[?#].*)?$/i;
  var audioEl = document.getElementById('wip-audio');
  var audio = audioEl || new Audio('../../work_audio.mp3');
  audio.preload = 'auto';
  audio.loop = false;

  var playedForCurrentView = false;
  var fallbackTried = false;
  var gestureBound = false;

  audio.addEventListener('error', function () {
    if (!fallbackTried) {
      fallbackTried = true;
      audio.src = '/work_audio.mp3';
      audio.load();
    }
  });

  function isWipPath(pathname) {
    return WIP_PATTERN.test(pathname || '');
  }

  function cleanupListeners() {
    window.removeEventListener('touchend', onUserGesture, true);
    window.removeEventListener('click', onUserGesture, true);
    window.removeEventListener('keydown', onUserGesture, true);
    gestureBound = false;
  }

  function onUserGesture() {
    if (!playedForCurrentView && isWipPath(window.location.pathname)) {
      playAudioOnce();
    }
  }

  function bindGestureUnlock() {
    if (gestureBound || playedForCurrentView) return;
    gestureBound = true;
    window.addEventListener('touchend', onUserGesture, true);
    window.addEventListener('click', onUserGesture, true);
    window.addEventListener('keydown', onUserGesture, true);
  }

  function playAudioOnce() {
    if (playedForCurrentView) return;
    playedForCurrentView = true;

    try {
      audio.currentTime = 0;
    } catch (e) {}

    try {
      var promise = audio.play();
      if (promise && typeof promise.then === 'function') {
        promise.then(function () {
          cleanupListeners();
        }).catch(function (err) {
          playedForCurrentView = false;
          if (err && err.name !== 'NotAllowedError') {
            audio.addEventListener('canplaythrough', function () {
              if (!playedForCurrentView && isWipPath(window.location.pathname)) {
                playAudioOnce();
              }
            }, { once: true });
          }
          bindGestureUnlock();
        });
      } else {
        cleanupListeners();
      }
    } catch (err) {
      playedForCurrentView = false;
      bindGestureUnlock();
    }
  }

  function destroyPhaserIfActive() {
    if (window.phaserGame) {
      try {
        window.phaserGame.destroy(true);
      } catch (e) {}
      window.phaserGame = null;
    }
  }

  function switchToWipPage(href, pushHistory) {
    var targetUrl = new URL(href, window.location.href);
    playedForCurrentView = false;
    cleanupListeners();

    // Execute playAudio synchronously inside the click gesture for automatic unmuted playback
    playAudioOnce();
    destroyPhaserIfActive();

    fetch(targetUrl.href, { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var nextMain = doc.querySelector('main.game-page-wrapper');
        var currentMain = document.querySelector('main.game-page-wrapper');
        if (!nextMain || !currentMain) {
          window.location.href = targetUrl.href;
          return;
        }
        currentMain.replaceWith(nextMain);
        if (doc.title) {
          document.title = doc.title;
        }
        if (pushHistory) {
          history.pushState({ wipHref: targetUrl.href }, '', targetUrl.href);
        }
        window.scrollTo(0, 0);
      })
      .catch(function () {
        window.location.href = targetUrl.href;
      });
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    var link = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!link) return;

    var rawHref = link.getAttribute('href');
    if (!rawHref) return;

    var resolved;
    try {
      resolved = new URL(rawHref, window.location.href);
    } catch (err) {
      return;
    }

    if (resolved.origin !== window.location.origin) return;
    if (!isWipPath(resolved.pathname)) return;

    e.preventDefault();
    switchToWipPage(resolved.href, true);
  });

  window.addEventListener('popstate', function () {
    if (isWipPath(window.location.pathname)) {
      switchToWipPage(window.location.href, false);
    } else {
      window.location.reload();
    }
  });

  window.WipArcadeAudio = {
    playOnce: playAudioOnce
  };

  if (isWipPath(window.location.pathname)) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', playAudioOnce, { once: true });
    } else {
      playAudioOnce();
    }
  }
})();
