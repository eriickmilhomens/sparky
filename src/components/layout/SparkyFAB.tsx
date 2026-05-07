import { memo } from "react";
import { Sparkles } from "lucide-react";

interface SparkyFABProps {
  onClick: () => void;
  hidden?: boolean;
}

/**
 * Floating "Pergunte ao Sparky" button — animated RGB conic border,
 * pinned to bottom of viewport above safe-area.
 */
const SparkyFAB = memo(({ onClick, hidden = false }: SparkyFABProps) => {
  return (
    <>
      <div
        className={`pointer-events-none fixed inset-x-0 z-[60] flex justify-center transition-all duration-300 ${
          hidden ? "translate-y-[200%] opacity-0" : "translate-y-0 opacity-100"
        }`}
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
      >
        <button
          onClick={onClick}
          className="sparky-rgb-fab pointer-events-auto group relative flex items-center gap-2.5 rounded-full px-5 py-3 active:scale-95 transition-transform"
        >
          <span className="relative flex items-center gap-2.5 rounded-full bg-card/90 backdrop-blur-xl px-4 py-2.5">
            <Sparkles size={16} className="text-foreground" />
            <span className="text-xs font-display font-semibold tracking-tight text-foreground">
              Pergunte ao Sparky
            </span>
          </span>
        </button>
      </div>

      {/* Safe-area background fill */}
      <div
        className="pointer-events-none fixed bottom-0 left-0 right-0 z-[59]"
        style={{ height: "calc(env(safe-area-inset-bottom, 0px) + 8px)", background: "#0e1420" }}
      />
    </>
  );
});

SparkyFAB.displayName = "SparkyFAB";

export default SparkyFAB;
