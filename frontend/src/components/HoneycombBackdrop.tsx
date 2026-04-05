"use client";

import { cn } from "@/lib/utils";

type HoneycombBackdropProps = {
  className?: string;
  rows?: number;
  cols?: number;
  cellSize?: number;
  opacityClass?: string;
};

// Beehive tiling math: for a flat-top hex with width W,
// horizontal step = W * 0.75, vertical step = W * 0.866 (sqrt(3)/2).
// Odd rows are offset by half a horizontal step.
export function HoneycombBackdrop({
  className,
  rows = 5,
  cols = 6,
  cellSize = 72,
  opacityClass,
}: HoneycombBackdropProps) {
  const hStep = cellSize * 0.75;
  const vStep = cellSize * 0.866;

  const cells: Array<{
    top: number;
    left: number;
    size: number;
    delay: string;
    duration: string;
    pulseDelay: string;
    pulse: boolean;
  }> = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sizeJitter = ((r * 7 + c * 13) % 5) * 4; // 0..16
      const size = cellSize + sizeJitter - 8;
      const left = c * hStep + (r % 2 === 1 ? hStep / 2 : 0);
      const top = r * vStep;
      const seed = (r * 31 + c * 17) % 100;
      cells.push({
        top,
        left,
        size,
        delay: `${(seed % 60) / 10}s`,
        duration: `${5 + (seed % 40) / 10}s`,
        pulseDelay: `${((r + c) * 0.35) % 4}s`,
        pulse: (r + c) % 3 === 0,
      });
    }
  }

  const width = cols * hStep + cellSize / 2;
  const height = rows * vStep + cellSize / 4;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "honeycomb pointer-events-none absolute",
        opacityClass ?? "opacity-70 dark:opacity-60",
        className
      )}
      style={{ width, height }}
    >
      {cells.map((cell, i) => (
        <div
          key={i}
          className="absolute animate-hex-float"
          style={{
            top: cell.top,
            left: cell.left,
            width: cell.size,
            height: cell.size * 0.866,
            animationDelay: cell.delay,
            animationDuration: cell.duration,
          }}
        >
          <div
            className={cn(
              "hex h-full w-full",
              cell.pulse && "animate-hex-pulse"
            )}
            style={{ animationDelay: cell.pulseDelay }}
          />
        </div>
      ))}
    </div>
  );
}
