import { useState, useRef, useEffect, useCallback } from "react";

const CHARS = '!<>-_/[]{}=+*^?#';

export function useScramble(text) {
  const [display, setDisplay] = useState(text);
  const intervalRef = useRef(null);

  const play = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    let frame = 0;
    const total = 24;
    intervalRef.current = setInterval(() => {
      frame++;
      setDisplay(text.split('').map((c, i) => {
        if (c === ' ') return ' ';
        const progress = frame - i * 1.2;
        return progress > total * 0.6
          ? c
          : CHARS[Math.floor(Math.random() * CHARS.length)];
      }).join(''));
      if (frame > total + text.length) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setDisplay(text);
      }
    }, 35);
  }, [text]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return [display, play];
}

export default useScramble;
