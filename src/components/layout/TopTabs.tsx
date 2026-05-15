import { memo, useRef, useLayoutEffect, useCallback } from "react";
import { Home, Wallet, Users, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "home", label: "Início", icon: Home },
  { id: "expenses", label: "Despesas", icon: Wallet },
  { id: "members", label: "Membros", icon: Users },
  { id: "docs", label: "Docs", icon: FileText },
];

const SWIPE_THRESHOLD = 36;

/**
 * Performance-tuned: drag uses refs + direct DOM transform (no React state during move),
 * commits via rAF. Indicator position is computed once per active tab change.
 */
const TopTabs = memo(({ activeTab, onTabChange }: TopTabsProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const dragStartX = useRef<number | null>(null);
  const dragOffset = useRef(0);
  const dragging = useRef(false);
  const rafId = useRef<number | null>(null);
  const baseLeft = useRef(0);
  const baseWidth = useRef(0);

  const activeIdx = Math.max(0, tabs.findIndex(t => t.id === activeTab));

  const positionIndicator = useCallback(() => {
    const el = itemRefs.current[activeIdx];
    const parent = containerRef.current;
    const ind = indicatorRef.current;
    if (!el || !parent || !ind) return;
    const elRect = el.getBoundingClientRect();
    const pRect = parent.getBoundingClientRect();
    baseLeft.current = elRect.left - pRect.left;
    baseWidth.current = elRect.width;
    ind.style.transition = "transform 320ms cubic-bezier(0.32,0.72,0,1), width 320ms cubic-bezier(0.32,0.72,0,1)";
    ind.style.width = `${baseWidth.current}px`;
    ind.style.transform = `translate3d(${baseLeft.current}px, 0, 0)`;
  }, [activeIdx]);

  useLayoutEffect(() => {
    positionIndicator();
    const onResize = () => positionIndicator();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [positionIndicator]);

  const applyDragTransform = () => {
    rafId.current = null;
    const ind = indicatorRef.current;
    if (!ind) return;
    ind.style.transition = "none";
    ind.style.transform = `translate3d(${baseLeft.current + dragOffset.current}px, 0, 0)`;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    const atStart = activeIdx === 0 && dx > 0;
    const atEnd = activeIdx === tabs.length - 1 && dx < 0;
    const resistance = atStart || atEnd ? 0.25 : 1;
    dragOffset.current = Math.max(-90, Math.min(90, dx * resistance));
    if (rafId.current === null) rafId.current = requestAnimationFrame(applyDragTransform);
  };

  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const dx = dragOffset.current;
    dragOffset.current = 0;
    dragStartX.current = null;
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    // Snap back visually
    const ind = indicatorRef.current;
    if (ind) {
      ind.style.transition = "transform 220ms cubic-bezier(0.32,0.72,0,1)";
      ind.style.transform = `translate3d(${baseLeft.current}px, 0, 0)`;
    }
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      const next = Math.min(tabs.length - 1, Math.max(0, activeIdx + (dx < 0 ? 1 : -1)));
      if (next !== activeIdx) {
        onTabChange(tabs[next].id);
        if ("vibrate" in navigator) try { navigator.vibrate?.(8); } catch {}
      }
    }
  };

  return (
    <nav className="shrink-0 flex justify-center px-3 pt-2 pb-2">
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative flex w-full max-w-[420px] items-center justify-between gap-0.5 rounded-[22px] p-1 touch-pan-y select-none overflow-hidden"
        style={{
          background: "linear-gradient(135deg, hsl(var(--card) / 0.65), hsl(var(--card) / 0.35))",
          backdropFilter: "blur(22px) saturate(180%)",
          WebkitBackdropFilter: "blur(22px) saturate(180%)",
          border: "1px solid hsl(var(--border) / 0.6)",
          boxShadow: "0 8px 32px -12px hsl(var(--background) / 0.6), inset 0 1px 0 hsl(var(--foreground) / 0.05)",
          willChange: "transform",
        }}
      >
        <span
          ref={indicatorRef}
          aria-hidden
          className="absolute top-1 bottom-1 left-0 rounded-[16px] pointer-events-none"
          style={{
            width: 0,
            transform: "translate3d(0,0,0)",
            background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))",
            boxShadow: "0 4px 14px -4px hsl(var(--primary) / 0.5), inset 0 1px 0 hsl(var(--foreground) / 0.18)",
            willChange: "transform, width",
          }}
        />

        {tabs.map((tab, i) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => (itemRefs.current[i] = el)}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative z-10 flex flex-1 min-w-0 items-center justify-center gap-1 rounded-[16px] px-1.5 py-2 font-display text-[11px] font-semibold transition-colors duration-300 active:scale-[0.97]",
                isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={14} strokeWidth={isActive ? 2.4 : 2} />
              <span className="tracking-tight truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});

TopTabs.displayName = "TopTabs";

export default TopTabs;
