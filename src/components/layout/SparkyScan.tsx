import { memo, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X } from "lucide-react";

interface ScanTarget {
  id: number;
  top: number;
  left: number;
  width: number;
  height: number;
  prompt: string;
  label: string;
}

interface SparkyScanProps {
  open: boolean;
  onPick: (prompt: string) => void;
  onClose: () => void;
}

/**
 * Full-screen scan overlay.
 * - Animated horizontal scan line sweeps across the screen.
 * - For every visible [data-sparky-prompt] element, renders an outline + a
 *   suggestion chip. Clicking the chip triggers onPick(prompt).
 */
const SparkyScan = memo(({ open, onPick, onClose }: SparkyScanProps) => {
  const [targets, setTargets] = useState<ScanTarget[]>([]);
  const [revealed, setRevealed] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (!open) {
      setTargets([]);
      setRevealed(0);
      timers.current.forEach((t) => clearTimeout(t));
      timers.current = [];
      return;
    }

    // Snapshot all targets currently visible inside the main scroll area
    const scroll = document.querySelector("[data-main-scroll]") as HTMLElement | null;
    const root = scroll || document.body;
    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-sparky-prompt]"));
    const viewportH = window.innerHeight;

    const collected: ScanTarget[] = [];
    els.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      // Only include items at least partially in viewport
      if (r.bottom < 0 || r.top > viewportH) return;
      collected.push({
        id: i,
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
        prompt: el.getAttribute("data-sparky-prompt") || "",
        label: el.getAttribute("data-sparky-label") || el.getAttribute("data-sparky-prompt") || "",
      });
    });

    // Sort top→bottom so chips reveal in scanning order
    collected.sort((a, b) => a.top - b.top);
    setTargets(collected);
    setRevealed(0);

    // Reveal chips progressively as the scan line passes
    const SCAN_DURATION = 1100;
    collected.forEach((t, idx) => {
      const ratio = Math.min(1, Math.max(0, (t.top + t.height / 2) / viewportH));
      const delay = 200 + ratio * SCAN_DURATION;
      const id = window.setTimeout(() => setRevealed((n) => Math.max(n, idx + 1)), delay);
      timers.current.push(id);
    });

    return () => {
      timers.current.forEach((t) => clearTimeout(t));
      timers.current = [];
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] sparky-scan-root"
      onClick={onClose}
      role="dialog"
      aria-label="Sugestões do Sparky"
    >
      {/* Dim + subtle blur backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 0%, hsl(var(--background) / 0.5), hsl(var(--background) / 0.85))",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          animation: "sparkyFadeIn 200ms ease-out",
        }}
      />

      {/* Horizontal scan line */}
      <div className="sparky-scan-line absolute inset-x-0 pointer-events-none" />

      {/* Vignette grid (very subtle) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Header with close + hint */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top,0px),12px)] pb-3">
        <div className="flex items-center gap-2 rounded-full bg-card/70 backdrop-blur-xl border border-border/60 px-3 py-1.5">
          <Sparkles size={12} className="text-primary" />
          <span className="text-[11px] font-display font-semibold tracking-tight">
            Toque numa sugestão
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-card/70 backdrop-blur-xl border border-border/60 active:scale-95"
          aria-label="Fechar"
        >
          <X size={14} />
        </button>
      </div>

      {/* Per-card outlines + chips */}
      {targets.map((t, idx) => {
        const visible = idx < revealed;
        return (
          <div key={t.id}>
            {/* Outline */}
            <div
              className="absolute pointer-events-none rounded-[20px] border border-primary/60"
              style={{
                top: t.top - 2,
                left: t.left - 2,
                width: t.width + 4,
                height: t.height + 4,
                opacity: visible ? 1 : 0,
                boxShadow: visible
                  ? "0 0 0 1px hsl(var(--primary) / 0.25), 0 0 22px -4px hsl(var(--primary) / 0.55)"
                  : "none",
                transition: "opacity 180ms ease-out, box-shadow 200ms ease-out",
              }}
            />
            {/* Suggestion chip */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPick(t.prompt);
              }}
              className="absolute max-w-[78%] text-left rounded-2xl bg-primary text-primary-foreground px-3 py-2 text-[11px] font-semibold shadow-lg active:scale-[0.97] transition-transform"
              style={{
                top: Math.max(8, t.top - 6),
                left: Math.min(window.innerWidth - 16, t.left + 12),
                transform: visible
                  ? "translate3d(0,0,0) scale(1)"
                  : "translate3d(0,-6px,0) scale(0.92)",
                opacity: visible ? 1 : 0,
                transition:
                  "opacity 220ms ease-out, transform 260ms cubic-bezier(0.32,0.72,0,1)",
                boxShadow:
                  "0 8px 24px -8px hsl(var(--primary) / 0.6), inset 0 1px 0 hsl(var(--foreground) / 0.18)",
              }}
            >
              <span className="flex items-center gap-1.5">
                <Sparkles size={11} />
                <span className="truncate">{t.label}</span>
              </span>
            </button>
          </div>
        );
      })}

      {/* Empty state */}
      {targets.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center px-8">
          <div className="rounded-2xl bg-card/80 backdrop-blur-xl border border-border/60 p-5 text-center max-w-xs">
            <Sparkles size={20} className="text-primary mx-auto mb-2" />
            <p className="text-sm font-semibold">Nada para escanear aqui</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Adicione algumas transações e tente novamente.
            </p>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
});

SparkyScan.displayName = "SparkyScan";

export default SparkyScan;
