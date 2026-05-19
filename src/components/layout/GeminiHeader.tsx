import { useCallback, useState } from "react";
import { Menu, ChevronDown, Sun, Moon, RefreshCcw, Check, Home, Wallet, Users, FileText, Sparkles, Edit3 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CACHE_KEYS_TO_CLEAR = [
  "sparky-daily-snapshot",
  "sparky-open-finance-cache",
  "sparky-sync-data",
  "sparky-sync-status",
];

const TABS = [
  { id: "home", label: "Início", icon: Home },
  { id: "expenses", label: "Despesas", icon: Wallet },
  { id: "members", label: "Membros", icon: Users },
  { id: "docs", label: "Docs", icon: FileText },
  { id: "chat", label: "Sparky", icon: Sparkles },
];

interface GeminiHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  rightAction?: React.ReactNode;
}

const GeminiHeader = ({ activeTab, onTabChange, rightAction }: GeminiHeaderProps) => {
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const current = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  const handleSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      CACHE_KEYS_TO_CLEAR.forEach((k) => localStorage.removeItem(k));
      window.dispatchEvent(new Event("sparky-profile-refresh"));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["financial-data"] }),
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["group-members"] }),
        queryClient.refetchQueries({ type: "active" }),
      ]);
      window.dispatchEvent(new Event("sparky-data-cleared"));
      toast.success("Sincronizado.", { duration: 1500 });
    } catch {
      toast.error("Erro ao sincronizar", { duration: 1500 });
    } finally {
      setSyncing(false);
    }
  }, [syncing, queryClient]);

  const openDrawer = () => window.dispatchEvent(new Event("sparky-open-drawer"));

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between gap-2 px-3 py-2.5 bg-background/80 backdrop-blur-2xl"
    >
      {/* Left — hamburger */}
      <button
        onClick={openDrawer}
        className="h-10 w-10 rounded-full flex items-center justify-center text-foreground/80 hover:text-foreground hover:bg-muted/60 active:scale-95 transition-all border border-border/50 bg-card/40"
        aria-label="Abrir menu"
      >
        <Menu size={18} />
      </button>

      {/* Center — title selector */}
      <div className="relative flex-1 flex items-center justify-center min-w-0">
        <button
          onClick={() => setPickerOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-muted/50 active:scale-[0.98] transition-all max-w-full"
        >
          <span className="font-display text-[16px] font-semibold tracking-tight truncate">Sparky</span>
          <span className="text-[16px] font-light text-muted-foreground truncate">{current.label}</span>
          <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", pickerOpen && "rotate-180")} />
        </button>

        {pickerOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setPickerOpen(false)} />
            <div
              className="absolute top-12 left-1/2 -translate-x-1/2 z-40 w-[78vw] max-w-[320px] rounded-3xl border border-border/60 bg-card/95 backdrop-blur-2xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-150"
            >
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = t.id === activeTab;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setPickerOpen(false);
                      onTabChange(t.id);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all active:scale-[0.98]",
                      active ? "bg-muted/60" : "hover:bg-muted/40"
                    )}
                  >
                    <Icon size={16} className={active ? "text-primary" : "text-muted-foreground"} />
                    <span className="flex-1 text-[14px] font-medium">{t.label}</span>
                    {active && <Check size={14} className="text-primary" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-1">
        {rightAction}
        <button
          onClick={handleSync}
          disabled={syncing}
          className="h-10 w-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-95 transition-all border border-border/50 bg-card/40 disabled:opacity-50"
          title="Sincronizar"
        >
          <RefreshCcw size={15} className={syncing ? "animate-spin" : ""} />
        </button>
        <button
          onClick={toggleTheme}
          className="h-10 w-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-95 transition-all border border-border/50 bg-card/40"
          title="Tema"
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
};

export { Edit3 };
export default GeminiHeader;
