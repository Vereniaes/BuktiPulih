// Count two separate reading swipes near the end, without blocking native scroll.
"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export function useDoubleSwipe(end: RefObject<HTMLDivElement | null>, enabled: boolean, onLoad: () => void) {
  const [swipes, setSwipes] = useState(0);
  const reset = useRef(() => {});
  useEffect(() => {
    const marker = end.current;
    if (!marker || !enabled || typeof IntersectionObserver === "undefined") return;
    const mobile = matchMedia("(max-width: 620px) and (pointer: coarse)");
    let near = false, count = 0;
    let start: { x: number; y: number } | null = null;
    const clear = () => { count = 0; start = null; setSwipes(0); };
    reset.current = clear;
    const observer = new IntersectionObserver(([entry]) => {
      near = entry.isIntersecting;
      if (!near && !start) clear();
    }, { rootMargin: "0px 0px 240px 0px" });
    observer.observe(marker);
    const begin = (event: TouchEvent) => {
      start = null;
      if (!mobile.matches || !near || event.touches.length !== 1 || document.querySelector('dialog[open], [aria-modal="true"]')) return;
      if ((event.target as Element).closest("input, textarea, select, button, video")) return;
      const touch = event.touches[0]; start = { x: touch.clientX, y: touch.clientY };
    };
    const finish = (event: TouchEvent) => {
      const from = start; start = null;
      if (!from || !mobile.matches || event.touches.length || !event.changedTouches.length) return;
      const touch = event.changedTouches[0], dy = from.y - touch.clientY, dx = Math.abs(from.x - touch.clientX);
      if (dy < 48 || dy <= dx) return;
      count += 1;
      if (count === 2) { clear(); onLoad(); } else setSwipes(count);
    };
    window.addEventListener("touchstart", begin, { passive: true });
    window.addEventListener("touchend", finish, { passive: true });
    window.addEventListener("touchcancel", clear, { passive: true });
    mobile.addEventListener("change", clear);
    return () => {
      observer.disconnect(); reset.current = () => {};
      window.removeEventListener("touchstart", begin); window.removeEventListener("touchend", finish); window.removeEventListener("touchcancel", clear);
      mobile.removeEventListener("change", clear);
    };
  }, [end, enabled, onLoad]);
  return { swipes, reset: () => reset.current() };
}
