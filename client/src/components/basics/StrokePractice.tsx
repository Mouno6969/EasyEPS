import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { coverageRatio, targetSamplesFromStrokeFile, type Point } from "@shared/strokeCoverage";
import { Check, Loader2, RotateCcw, SkipForward, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const SUCCESS_COVERAGE = 0.55;
const CANVAS_SIZE = 280;

type StrokePracticeProps = {
  strokeId: string;
  char: string;
  minCoverage?: number;
  skipAfterFailures?: number;
  onComplete: (result: { coverage: number; skipped: boolean }) => void;
  done?: boolean;
};

/**
 * Canvas stroke practice: draw over guide samples; pass when coverage ≥ threshold
 * or skip after skipAfterFailures failed checks.
 */
export function StrokePractice({
  strokeId,
  char,
  minCoverage = SUCCESS_COVERAGE,
  skipAfterFailures = 2,
  onComplete,
  done,
}: StrokePracticeProps) {
  const strokeQuery = trpc.basics.getStroke.useQuery({ id: strokeId }, { retry: false });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [polyline, setPolyline] = useState<Point[]>([]);
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [coverage, setCoverage] = useState(0);
  const [failures, setFailures] = useState(0);
  const [passed, setPassed] = useState(Boolean(done));

  const samples = strokeQuery.data ? targetSamplesFromStrokeFile(strokeQuery.data) : [];
  const viewBox = strokeQuery.data?.viewBox ?? [0, 0, 100, 100];
  const [, , vbW, vbH] = viewBox;

  const toViewPoint = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * vbW;
      const y = ((clientY - rect.top) / rect.height) * vbH;
      return { x, y };
    },
    [vbW, vbH],
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // cream paper
    ctx.fillStyle = "rgba(250, 247, 240, 1)";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const scaleX = CANVAS_SIZE / vbW;
    const scaleY = CANVAS_SIZE / vbH;

    // faint target samples
    if (samples.length) {
      ctx.fillStyle = "rgba(16, 37, 58, 0.12)";
      for (const p of samples) {
        ctx.beginPath();
        ctx.arc(p.x * scaleX, p.y * scaleY, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // fallback guide glyph
      ctx.fillStyle = "rgba(16, 37, 58, 0.08)";
      ctx.font = `bold ${Math.floor(CANVAS_SIZE * 0.55)}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(char, CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    }

    // SVG path underlay when present
    const strokeFile = strokeQuery.data;
    if (strokeFile) {
      ctx.strokeStyle = "rgba(204, 166, 92, 0.35)";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const stroke of strokeFile.strokes) {
        try {
          const path = new Path2D(stroke.d);
          ctx.save();
          ctx.scale(scaleX, scaleY);
          ctx.stroke(path);
          ctx.restore();
        } catch {
          // ignore invalid path d
        }
      }
    }

    // user strokes
    ctx.strokeStyle = "rgba(16, 37, 58, 0.85)";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const all = [...strokes, polyline];
    for (const poly of all) {
      if (poly.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(poly[0]!.x * scaleX, poly[0]!.y * scaleY);
      for (let i = 1; i < poly.length; i++) {
        ctx.lineTo(poly[i]!.x * scaleX, poly[i]!.y * scaleY);
      }
      ctx.stroke();
    }
  }, [samples, strokes, polyline, char, strokeQuery.data, vbW, vbH]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const allPoints = (): Point[] => strokes.flat().concat(polyline);

  const checkCoverage = () => {
    if (passed) return;
    const points = allPoints();
    if (points.length < 2) return;
    const ratio = samples.length ? coverageRatio(samples, points, 8) : 0.6;
    setCoverage(ratio);
    if (ratio >= minCoverage) {
      setPassed(true);
      onComplete({ coverage: ratio, skipped: false });
      return;
    }
    const nextFailures = failures + 1;
    setFailures(nextFailures);
    if (nextFailures >= skipAfterFailures) {
      setPassed(true);
      onComplete({ coverage: ratio, skipped: true });
    }
  };

  const undo = () => {
    if (polyline.length) {
      setPolyline([]);
      return;
    }
    setStrokes(prev => prev.slice(0, -1));
  };

  const reset = () => {
    setPolyline([]);
    setStrokes([]);
    setCoverage(0);
    if (!done) setPassed(false);
  };

  const skip = () => {
    setPassed(true);
    onComplete({ coverage, skipped: true });
  };

  const pointerDown = (e: React.PointerEvent) => {
    if (passed) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = toViewPoint(e.clientX, e.clientY);
    if (!p) return;
    setDrawing(true);
    setPolyline([p]);
  };

  const pointerMove = (e: React.PointerEvent) => {
    if (!drawing || passed) return;
    const p = toViewPoint(e.clientX, e.clientY);
    if (!p) return;
    setPolyline(prev => [...prev, p]);
  };

  const pointerUp = () => {
    if (!drawing) return;
    setDrawing(false);
    setStrokes(prev => (polyline.length ? [...prev, polyline] : prev));
    setPolyline([]);
  };

  if (strokeQuery.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--navy)]/55">
        <Loader2 className="size-4 animate-spin" /> Loading stroke…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--navy)]/10 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-serif text-3xl font-bold text-[var(--navy)]">{char}</p>
          <p className="text-xs text-[var(--navy)]/45">
            coverage {Math.round(coverage * 100)}% · need {Math.round(minCoverage * 100)}%
            {failures > 0 ? ` · fails ${failures}/${skipAfterFailures}` : ""}
          </p>
        </div>
        {passed && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--sage)]/15 px-3 py-1 text-xs font-bold text-[var(--sage-dark)]">
            <Check className="size-3.5" /> Done
          </span>
        )}
      </div>
      <canvas
        ref={canvasRef}
        className="mx-auto touch-none rounded-2xl border border-[var(--navy)]/10"
        style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, cursor: passed ? "default" : "crosshair" }}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerLeave={pointerUp}
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="rounded-full" onClick={undo} disabled={passed}>
          <Undo2 className="size-4" /> Undo
        </Button>
        <Button type="button" variant="outline" className="rounded-full" onClick={reset} disabled={passed && Boolean(done)}>
          <RotateCcw className="size-4" /> Reset
        </Button>
        <Button type="button" className="rounded-full bg-[var(--navy)] text-white" onClick={checkCoverage} disabled={passed}>
          Check
        </Button>
        {(failures >= skipAfterFailures || failures >= 1) && !passed && (
          <Button type="button" variant="outline" className="rounded-full" onClick={skip}>
            <SkipForward className="size-4" /> Skip
          </Button>
        )}
      </div>
    </div>
  );
}
