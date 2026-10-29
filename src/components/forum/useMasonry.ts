// Pack post cards into balanced columns after their widths and content are measured.
"use client";

import { useLayoutEffect, useRef } from "react";

export function useMasonry(itemIds: readonly string[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const orderKey = JSON.stringify(itemIds);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const cards = Array.from(container.children) as HTMLElement[];
        if (!cards.length) return;

        const style = getComputedStyle(container);
        const gap = Number.parseFloat(style.columnGap) || 0;
        const width = container.clientWidth;
        const columns = Math.max(1, Math.min(cards.length, 3, Math.floor((width + gap) / (320 + gap))));
        const cardWidth = Math.max(0, (width - gap * (columns - 1)) / columns);

        // Set widths together before measuring so text and media reflow consistently.
        if (container.dataset.masonryReady !== "true") container.dataset.masonryReady = "true";
        for (const card of cards) {
          const nextWidth = `${cardWidth}px`;
          if (card.style.width !== nextWidth) card.style.width = nextWidth;
        }

        const cardHeights = cards.map(card => card.getBoundingClientRect().height);
        const heights = Array<number>(columns).fill(0);
        cards.forEach((card, index) => {
          const column = heights.indexOf(Math.min(...heights));
          const left = column * (cardWidth + gap);
          const top = heights[column];
          const position = `translate(${left}px, ${top}px)`;
          if (card.style.transform !== position) card.style.transform = position;
          heights[column] += cardHeights[index] + gap;
        });

        const contentHeight = Math.max(0, Math.max(...heights) - gap);
        const nextHeight = `${contentHeight}px`;
        if (container.style.height !== nextHeight) container.style.height = nextHeight;
      });
    };

    const observer = new ResizeObserver(schedule);
    observer.observe(container);
    Array.from(container.children).forEach((card) => observer.observe(card));
    schedule();

    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [orderKey]);

  return containerRef;
}
