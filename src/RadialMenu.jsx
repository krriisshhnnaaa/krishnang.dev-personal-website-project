import React, { useState } from "react";
import "../CSS/radial-menu.css";

/**
 * Compact Radial Action Menu
 * Specification: agy.info (action NOW)
 *
 * A dark circular + button anchors the centre; four tiny actions begin stacked
 * behind it, then orbit outward in cardinal directions on hover with an overshooting
 * spring transition.
 *
 * Action A = open connect.html
 * Action B = open choicepage.html
 * Action C = open game.html
 * Action D = open review.html / index.html
 */
export function RadialMenu({ basePath = "" }) {
  const [active, setActive] = useState(false);

  const connectPath = basePath ? `${basePath}forms/connect.html` : "forms/connect.html";
  const choicePath = basePath ? `${basePath}forms/choicepage.html` : "forms/choicepage.html";
  const gamePath = basePath ? `${basePath}fun/game/game.html` : "fun/game/game.html";
  const reviewPath = basePath ? `${basePath}forms/review.html` : "forms/review.html";

  return (
    <div className="radial-menu-container">
      <nav
        className={`menu ${active ? "active" : ""}`}
        aria-label="Radial action menu"
        onMouseLeave={() => setActive(false)}
      >
        {/* Central Anchor: Dark circular + button */}
        <button
          type="button"
          className="center-btn"
          aria-label="Toggle navigation actions"
          title="Quick Navigation Actions"
          onClick={() => setActive((prev) => !prev)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Action A (North): Open connect.html */}
        <a
          href={connectPath}
          className="action action-n"
          aria-label="Action A: Connect"
          title="Action A: Open connect.html"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          <span className="tooltip">Action A: Connect</span>
        </a>

        {/* Action B (East): Open choicepage.html */}
        <a
          href={choicePath}
          className="action action-e"
          aria-label="Action B: Choice Page"
          title="Action B: Open choicepage.html"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
          <span className="tooltip">Action B: Choice</span>
        </a>

        {/* Action C (South): Open game.html */}
        <a
          href={gamePath}
          className="action action-s"
          aria-label="Action C: Play Arcade Game"
          title="Action C: Open game.html"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          <span className="tooltip">Action C: Game</span>
        </a>

        {/* Action D (West): Open review.html */}
        <a
          href={reviewPath}
          className="action action-w"
          aria-label="Action D: Reviews"
          title="Action D: Open review.html"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span className="tooltip">Action D: Review</span>
        </a>
      </nav>
    </div>
  );
}

export default RadialMenu;
