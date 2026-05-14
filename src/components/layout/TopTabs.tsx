import { memo, useRef, useState, useEffect } from "react";
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

const SWIPE_THRESHOLD = 40;

const TopTabs = memo(({ activeTab, onTabChange }: TopTabsProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartX = useRef<number | null>(null);
  const dragging = useRef(false);

  const activeIdx = Math.max(0, tabs.findIndex(t => t.id === activeTab));

  // Position indicator under active tab
  useEffect(() => {
    const el = itemRefs.current[activeIdx];
    const parent = containerRef.current;
    if (!el || !parent) return;
    const elRect = el.getBoundingClientRect();
    const pRect = parent.getBoundingClientRect();
    setIndicator({ left: elRect.left - pRect.left, width: elRect.width });
  }, [activeIdx]);

  // Recompute on resize
  useEffect(() => {
    const onResize = () => {
      const el = itemRefs.current[activeIdx];
      const parent = containerRef.current;
      if (!el || !parent) return;
      const elRect = el.getBoundingClientRect();
      const pRect = parent.getBoundingClientRect();
      setIndicator({ left: elRect.left - pRect.left, width: elRect.width });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeIdx]);

  const goDelta = (delta: number) => {
    const next = Math.min(tabs.length - 1, Math.max(0, activeIdx + delta));
    if (next !== activeIdx) {
      onTabChange(tabs[next].id);
      if ("vibrate" in navigator) try { navigator.vibrate?.(8); } catch {}
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    // Resist at edges
    const atStart = activeIdx === 0 && dx > 0;
    const atEnd = activeIdx === tabs.length - 1 && dx < 0;
    const resistance = atStart || atEnd ? 0.25 : 1;
    setDragOffset(Math.max(-80, Math.min(80, dx * resistance)));
  };
  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const dx = dragOffset;
    setDragOffset(0);
    dragStartX.current = null;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      // Swipe LEFT (dx<0) → next tab
      goDelta(dx < 0 ? 1 : -1);
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
        }}
      >
        {/* Sliding glass indicator */}
        {indicator && (
          <span
            aria-hidden
            className="absolute top-1 bottom-1 rounded-[16px] pointer-events-none"
            style={{
              left: indicator.left,
              width: indicator.width,
              transform: `translateX(${dragOffset}px)`,
              transition: dragging.current ? "none" : "left 320ms cubic-bezier(0.32,0.72,0,1), width 320ms cubic-bezier(0.32,0.72,0,1), transform 200ms ease-out",
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))",
              boxShadow: "0 4px 14px -4px hsl(var(--primary) / 0.5), inset 0 1px 0 hsl(var(--foreground) / 0.18)",
            }}
          />
        )}

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
