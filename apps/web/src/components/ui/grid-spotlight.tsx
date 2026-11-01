"use client";

import { useEffect, useRef, useState } from "react";

interface GridSpotlightProps {
  className?: string;
  gridSize?: number;
  spotlightRadius?: number;
  glowRadius?: number;
  showHighlightSquares?: boolean;
}

const SQUARE_OFFSETS = [
  // Primary cell directly under cursor
  { dx: 0, dy: 0, baseOpacity: 0.9, fill: "rgba(34, 211, 238, 0.12)", stroke: "rgba(34, 211, 238, 0.45)" },
  // Direct cross neighbors
  { dx: 1, dy: 0, baseOpacity: 0.5, fill: "rgba(34, 211, 238, 0.05)", stroke: "rgba(34, 211, 238, 0.25)" },
  { dx: -1, dy: 0, baseOpacity: 0.5, fill: "rgba(34, 211, 238, 0.05)", stroke: "rgba(34, 211, 238, 0.25)" },
  { dx: 0, dy: 1, baseOpacity: 0.5, fill: "rgba(34, 211, 238, 0.05)", stroke: "rgba(34, 211, 238, 0.25)" },
  { dx: 0, dy: -1, baseOpacity: 0.5, fill: "rgba(34, 211, 238, 0.05)", stroke: "rgba(34, 211, 238, 0.25)" },
  // Diagonal neighbors with subtle lime accent
  { dx: 1, dy: 1, baseOpacity: 0.25, fill: "rgba(163, 230, 53, 0.03)", stroke: "rgba(163, 230, 53, 0.18)" },
  { dx: -1, dy: -1, baseOpacity: 0.25, fill: "rgba(163, 230, 53, 0.03)", stroke: "rgba(163, 230, 53, 0.18)" },
  { dx: 1, dy: -1, baseOpacity: 0.25, fill: "rgba(163, 230, 53, 0.03)", stroke: "rgba(163, 230, 53, 0.18)" },
  { dx: -1, dy: 1, baseOpacity: 0.25, fill: "rgba(163, 230, 53, 0.03)", stroke: "rgba(163, 230, 53, 0.18)" },
];

export function GridSpotlight({
  className = "absolute inset-x-0 top-0 h-[780px]",
  gridSize = 48,
  spotlightRadius = 380,
  glowRadius = 600,
  showHighlightSquares = true,
}: GridSpotlightProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rectsRef = useRef<(SVGRectElement | null)[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const container = containerRef.current;
    if (!container) return;

    // Check for reduced motion preference or hover capability
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canHover = window.matchMedia("(hover: hover)").matches;

    const rect = container.getBoundingClientRect();
    const initialX = rect.width > 0 ? rect.width / 2 : window.innerWidth / 2;
    const initialY = Math.min(220, rect.height / 2);

    const pos = {
      currentX: initialX,
      currentY: initialY,
      targetX: initialX,
      targetY: initialY,
      opacity: 0.35,
      targetOpacity: 0.35,
      active: false,
      rafId: 0,
    };

    container.style.setProperty("--mouse-x", `${initialX}px`);
    container.style.setProperty("--mouse-y", `${initialY}px`);
    container.style.setProperty("--spotlight-opacity", "0.35");

    // Position initial highlight squares
    if (showHighlightSquares && rectsRef.current.length > 0) {
      const baseCellX = Math.floor(initialX / gridSize) * gridSize;
      const baseCellY = Math.floor(initialY / gridSize) * gridSize;
      SQUARE_OFFSETS.forEach((offset, idx) => {
        const el = rectsRef.current[idx];
        if (el) {
          el.setAttribute("x", String(baseCellX + offset.dx * gridSize));
          el.setAttribute("y", String(baseCellY + offset.dy * gridSize));
          el.setAttribute("opacity", String((offset.baseOpacity * 0.35).toFixed(3)));
        }
      });
    }

    if (prefersReducedMotion || !canHover) {
      // Touch or reduced motion fallback: keep static elegant resting position
      return;
    }

    const update = () => {
      const currentContainer = containerRef.current;
      if (!currentContainer) {
        pos.active = false;
        return;
      }

      // Smooth damping (lerp)
      const ease = 0.12;
      const dx = pos.targetX - pos.currentX;
      const dy = pos.targetY - pos.currentY;
      const dop = pos.targetOpacity - pos.opacity;

      pos.currentX += dx * ease;
      pos.currentY += dy * ease;
      pos.opacity += dop * 0.08;

      currentContainer.style.setProperty("--mouse-x", `${pos.currentX.toFixed(2)}px`);
      currentContainer.style.setProperty("--mouse-y", `${pos.currentY.toFixed(2)}px`);
      currentContainer.style.setProperty("--spotlight-opacity", pos.opacity.toFixed(3));

      if (showHighlightSquares && rectsRef.current.length > 0) {
        const cellX = Math.floor(pos.currentX / gridSize) * gridSize;
        const cellY = Math.floor(pos.currentY / gridSize) * gridSize;

        SQUARE_OFFSETS.forEach((offset, idx) => {
          const el = rectsRef.current[idx];
          if (el) {
            el.setAttribute("x", String(cellX + offset.dx * gridSize));
            el.setAttribute("y", String(cellY + offset.dy * gridSize));
            el.setAttribute("opacity", String((offset.baseOpacity * pos.opacity).toFixed(3)));
          }
        });
      }

      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1 || Math.abs(dop) > 0.005) {
        pos.rafId = requestAnimationFrame(update);
      } else {
        pos.active = false;
      }
    };

    const startAnimation = () => {
      if (!pos.active) {
        pos.active = true;
        pos.rafId = requestAnimationFrame(update);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const c = containerRef.current;
      if (!c) return;

      const r = c.getBoundingClientRect();
      const relX = e.clientX - r.left;
      const relY = e.clientY - r.top;

      // Track cursor while within or near the container
      const isNear =
        relX >= -100 &&
        relX <= r.width + 100 &&
        relY >= -100 &&
        relY <= r.height + 100;

      if (isNear) {
        pos.targetX = relX;
        pos.targetY = relY;
        pos.targetOpacity = 1;
        startAnimation();
      } else if (pos.targetOpacity > 0.3) {
        pos.targetOpacity = 0.25;
        startAnimation();
      }
    };

    const handlePointerLeave = () => {
      pos.targetOpacity = 0.25;
      startAnimation();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", handlePointerLeave, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("mouseleave", handlePointerLeave);
      if (pos.rafId) {
        cancelAnimationFrame(pos.rafId);
      }
    };
  }, [gridSize, showHighlightSquares]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-none select-none overflow-hidden ${className}`}
      style={{
        // Default values for CSS variables prior to pointer movement or SSR
        ["--mouse-x" as string]: "50%",
        ["--mouse-y" as string]: "220px",
        ["--spotlight-opacity" as string]: "0.35",
      }}
    >
      {/* 1. Base static grid (48px pattern) with smooth bottom falloff */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.045) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.045) 1px, transparent 1px)
          `,
          backgroundSize: `${gridSize}px ${gridSize}px`,
          maskImage: "radial-gradient(ellipse 85% 65% at 50% 0%, black 30%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse 85% 65% at 50% 0%, black 30%, transparent 78%)",
        }}
      />

      {/* 2. Soft atmospheric mouse-following radial glow */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: "var(--spotlight-opacity, 0.35)",
          background: `radial-gradient(${glowRadius}px circle at var(--mouse-x, 50%) var(--mouse-y, 220px), rgba(34, 211, 238, 0.14), rgba(8, 145, 178, 0.07) 32%, rgba(163, 230, 53, 0.035) 55%, transparent 75%)`,
        }}
      />

      {/* 3. Illuminated grid lines around the cursor (radial mask over cyan grid) */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: "var(--spotlight-opacity, 0.35)",
          backgroundImage: `
            linear-gradient(to right, rgba(34, 211, 238, 0.45) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(34, 211, 238, 0.45) 1px, transparent 1px)
          `,
          backgroundSize: `${gridSize}px ${gridSize}px`,
          maskImage: `radial-gradient(${spotlightRadius}px circle at var(--mouse-x, 50%) var(--mouse-y, 220px), black 0%, rgba(0,0,0,0.5) 45%, transparent 80%)`,
          WebkitMaskImage: `radial-gradient(${spotlightRadius}px circle at var(--mouse-x, 50%) var(--mouse-y, 220px), black 0%, rgba(0,0,0,0.5) 45%, transparent 80%)`,
        }}
      />

      {/* 4. Intersection dots at grid vertices illuminated near mouse */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: "var(--spotlight-opacity, 0.35)",
          backgroundImage: "radial-gradient(circle 1.5px at 0 0, rgba(34, 211, 238, 0.75) 100%, transparent 0)",
          backgroundSize: `${gridSize}px ${gridSize}px`,
          maskImage: `radial-gradient(280px circle at var(--mouse-x, 50%) var(--mouse-y, 220px), black 0%, transparent 72%)`,
          WebkitMaskImage: `radial-gradient(280px circle at var(--mouse-x, 50%) var(--mouse-y, 220px), black 0%, transparent 72%)`,
        }}
      />

      {/* 5. Highlight squares (subtle crisp cell frames around cursor) */}
      {showHighlightSquares && (
        <svg
          className="pointer-events-none absolute inset-0 size-full transition-opacity duration-300"
          style={{ opacity: "var(--spotlight-opacity, 0.35)" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {SQUARE_OFFSETS.map((offset, idx) => (
            <rect
              key={idx}
              ref={(el) => {
                rectsRef.current[idx] = el;
              }}
              x={-999}
              y={-999}
              width={gridSize}
              height={gridSize}
              fill={offset.fill}
              stroke={offset.stroke}
              strokeWidth="1"
              rx="2"
              className="transition-[opacity] duration-150"
            />
          ))}
        </svg>
      )}

      {/* 6. Subtle top and edge feathering */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[var(--color-ink)] to-transparent"
        aria-hidden="true"
      />
    </div>
  );
}
