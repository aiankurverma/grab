"use client";

import { useEffect, useRef, useState } from "react";

export interface TerrainWaveProps {
  className?: string;
  /** Number of grid columns (horizontal resolution) */
  columns?: number;
  /** Number of grid rows (depth resolution) */
  rows?: number;
  /** Base wave height amplitude in pixels */
  amplitude?: number;
  /** Primary wireframe color */
  color?: string;
  /** Secondary wireframe / peak accent color */
  accentColor?: string;
  /** Interactive mouse displacement multiplier */
  interactive?: boolean;
}

/**
 * TerrainWave
 * Lightweight, 0-dependency interactive 3D perspective wireframe terrain canvas.
 * Generates an undulating audio/signal wave landscape with mouse-driven vertical displacement.
 * Optimized with DPR capping, IntersectionObserver pausing, and prefers-reduced-motion fallback.
 */
export function TerrainWave({
  className = "absolute inset-x-0 bottom-0 h-[480px] pointer-events-none",
  columns = 36,
  rows = 24,
  amplitude = 18,
  color = "rgba(34, 211, 238, 0.22)", // Cyan / wave
  accentColor = "rgba(163, 230, 53, 0.45)", // Lime / grab accent
  interactive = true,
}: TerrainWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsSupported(false);
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canHover = window.matchMedia("(hover: hover)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let isVisible = true;
    let rafId = 0;
    let time = 0;

    // Mouse tracking with smooth spring/lerp
    const mouse = {
      x: -9999,
      y: -9999,
      targetX: -9999,
      targetY: -9999,
      radius: 180,
      active: false,
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });

    // Pointer move listener
    const handlePointerMove = (e: PointerEvent) => {
      if (!interactive || !canHover || prefersReducedMotion) return;
      const rect = container.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
      mouse.active = true;
    };

    const handlePointerLeave = () => {
      mouse.targetX = -9999;
      mouse.targetY = -9999;
      mouse.active = false;
    };

    if (interactive && canHover) {
      window.addEventListener("pointermove", handlePointerMove, { passive: true });
      window.addEventListener("pointerleave", handlePointerLeave, { passive: true });
    }

    // IntersectionObserver to pause rendering when out of viewport and resume when visible
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const nowVisible = entry ? entry.isIntersecting : true;
        if (nowVisible && !isVisible) {
          isVisible = true;
          cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(render);
        } else if (!nowVisible && isVisible) {
          isVisible = false;
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    // 3D Perspective Projection Configuration
    // Camera is looking slightly down towards the horizon
    const cameraHeight = 160;
    const fov = 420;

    const render = () => {
      if (!isVisible) {
        rafId = 0;
        return;
      }

      // Smooth mouse lerp
      if (mouse.active) {
        mouse.x += (mouse.targetX - mouse.x) * 0.1;
        mouse.y += (mouse.targetY - mouse.y) * 0.1;
      } else {
        mouse.x = -9999;
        mouse.y = -9999;
      }

      ctx.clearRect(0, 0, width, height);

      const speed = prefersReducedMotion ? 0 : 0.022;
      time += speed;

      const gridSpacingX = (width * 1.3) / columns;
      const startX = -width * 0.15;
      const gridSpacingZ = 35;
      const startZ = 80;

      // Calculate 3D points projected to 2D
      // gridPoints[row][col] = { x, y, z, px, py, alpha }
      const points: { px: number; py: number; alpha: number; elevation: number }[][] = [];

      for (let r = 0; r < rows; r++) {
        points[r] = [];
        const z = startZ + r * gridSpacingZ;
        const depthFactor = fov / (fov + z);
        const depthAlpha = Math.max(0.04, Math.min(1, 1 - r / (rows * 0.95)));

        for (let c = 0; c <= columns; c++) {
          const worldX = startX + c * gridSpacingX - width / 2;

          // Undulating harmonic sine wave elevation
          const wave1 = Math.sin(c * 0.28 + time * 1.5) * amplitude;
          const wave2 = Math.cos(r * 0.35 + time * 1.2) * (amplitude * 0.7);
          const wave3 = Math.sin((c + r) * 0.18 + time * 0.9) * (amplitude * 0.5);
          let elevation = wave1 + wave2 + wave3;

          // Perspective screen coordinates
          const screenX = width / 2 + worldX * depthFactor;
          const screenY = height * 0.35 + (cameraHeight + elevation) * depthFactor + r * 14;

          // Interactive cursor ripple / vertical push
          if (mouse.active) {
            const dist = Math.hypot(screenX - mouse.x, screenY - mouse.y);
            if (dist < mouse.radius) {
              const influence = (1 - dist / mouse.radius);
              // Elevate vertex upward / undulating ripple response
              const mouseWave = Math.sin(influence * Math.PI * 2 - time * 3) * 24 * influence;
              elevation -= mouseWave;
            }
          }

          const finalScreenY = height * 0.35 + (cameraHeight + elevation) * depthFactor + r * 14;

          points[r][c] = {
            px: screenX,
            py: finalScreenY,
            alpha: depthAlpha,
            elevation,
          };
        }
      }

      // Draw horizontal crosslines (rows)
      for (let r = 0; r < rows; r++) {
        ctx.beginPath();
        const rowPoints = points[r];
        if (!rowPoints || rowPoints.length === 0) continue;

        ctx.moveTo(rowPoints[0].px, rowPoints[0].py);
        for (let c = 1; c <= columns; c++) {
          const pt = rowPoints[c];
          ctx.lineTo(pt.px, pt.py);
        }

        const baseAlpha = rowPoints[0].alpha;
        ctx.strokeStyle = color.replace(/[\d.]+\)$/, `${(baseAlpha * 0.38).toFixed(3)})`);
        ctx.lineWidth = Math.max(0.6, 1.2 * (1 - r / rows));
        ctx.stroke();
      }

      // Draw longitudinal lines (columns) with gradient highlighting
      for (let c = 0; c <= columns; c++) {
        ctx.beginPath();
        ctx.moveTo(points[0][c].px, points[0][c].py);
        for (let r = 1; r < rows; r++) {
          ctx.lineTo(points[r][c].px, points[r][c].py);
        }

        // Highlight center lines with accent color
        const centerDist = Math.abs(c - columns / 2) / (columns / 2);
        const isAccent = centerDist < 0.28;
        const colStroke = isAccent
          ? accentColor.replace(/[\d.]+\)$/, `${(0.18 * (1 - centerDist)).toFixed(3)})`)
          : color.replace(/[\d.]+\)$/, "0.12)");

        ctx.strokeStyle = colStroke;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Draw subtle vertex nodes on prominent peaks
      for (let r = 0; r < rows; r += 2) {
        for (let c = 0; c <= columns; c += 3) {
          const pt = points[r][c];
          if (pt.elevation > amplitude * 0.8) {
            ctx.fillStyle = accentColor;
            ctx.beginPath();
            ctx.arc(pt.px, pt.py, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      if (!prefersReducedMotion) {
        rafId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      observer.disconnect();
    };
  }, [columns, rows, amplitude, color, accentColor, interactive]);

  if (!isSupported) return null;

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden select-none ${className}`}
      aria-hidden="true"
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 25%, rgba(0,0,0,1) 60%, rgba(0,0,0,0.1) 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 25%, rgba(0,0,0,1) 60%, rgba(0,0,0,0.1) 100%)",
      }}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
