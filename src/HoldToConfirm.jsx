import React, { useState, useRef } from "react";
import "./HoldToConfirm.css";

export function HoldToConfirm({ onConfirm, ms = 800 }) {
  const [holding, setHolding] = useState(false);
  const [done, setDone] = useState(false);
  const timer = useRef(null);

  const start = (e) => {
    if (e.button && e.button !== 0) return;
    setHolding(true);
    timer.current = setTimeout(() => {
      setHolding(false);
      setDone(true);
      if (typeof onConfirm === "function") {
        onConfirm();
      }
      setTimeout(() => setDone(false), 2000);
    }, ms);
  };

  const cancel = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setHolding(false);
  };

  const handleClick = () => {
    if (done) return;
  };

  let btnClass = "hold-btn";
  if (done) btnClass += " done";
  else if (holding) btnClass += " holding";

  return (
    <div className="flex flex-col items-center select-none">
      <button
        type="button"
        className={btnClass}
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onClick={handleClick}
        aria-label="Hire Me ? Hold to download my resume"
        title="Hold to download resume.pdf"
      >
        <svg className="ring" viewBox="0 0 72 72" aria-hidden="true">
          <circle className="track" cx="36" cy="36" r="33" />
          <circle className="prog" cx="36" cy="36" r="33" />
        </svg>
        <span>{done ? "✓" : "Hire Me ? "}</span>
      </button>
      <span className="hold-caption">Download My Resume</span>
    </div>
  );
}

export default HoldToConfirm;
