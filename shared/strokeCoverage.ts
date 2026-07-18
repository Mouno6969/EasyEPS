/**
 * Pure stroke-coverage helpers for Basics write practice.
 * Node/vitest safe — no Path2D / DOM / SVG path sampling.
 */

export type Point = { x: number; y: number };

export function coverageRatio(
  targetSamples: Point[],
  pointerPolyline: Point[],
  hitRadius = 6,
): number {
  if (targetSamples.length === 0) return 0;
  let hit = 0;
  for (const t of targetSamples) {
    if (pointerPolyline.some(p => Math.hypot(p.x - t.x, p.y - t.y) <= hitRadius)) {
      hit += 1;
    }
  }
  return hit / targetSamples.length;
}

export function targetSamplesFromStrokeFile(file: {
  strokes: Array<{ samples: Point[] }>;
}): Point[] {
  return file.strokes.flatMap(s => s.samples);
}
