import { useEffect, useState } from "react";
import { Home, Wallet, Users, FileText, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppDrawerProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const NAV = [
  { id: "home", label: "Início", icon: Home, desc: "Visão geral" },
  { id: "expenses", label: "Despesas", icon: Wallet, desc: "Gastos e contas" },
  { id: "members", label: "Membros", icon: Users, desc: "Grupo e prêmios" },
  { id: "docs", label: "Docs", icon: FileText, desc: "Cofre digital" },
  { id: "chat", label: "Sparky", icon: Sparkles, desc: "Assistente IA" },
];

const AppDrawer = ({ activeTab, onTabChange }: AppDrawerProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openFn = () => setOpen(true);
    window.addEventListener("sparky-open-drawer", openFn);
    return () => window.removeEventListener("sparky-open-drawer", openFn);
  }, []);

  const pick = (id: string) => {
    onTabChange(id);
    setOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-[60] bg-black/55 backdrop-blur-md transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        aria-hidden
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label="Menu"
        className={cn(
          "fixed top-0 left-0 z-[61] h-full w-[84%] max-w-[320px]",
          "bg-card/95 backdrop-blur-2xl border-r border-border/60 shadow-2xl",
          "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ paddingTop: "env(safe-area-inset-top, 20px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
              <Sparkles size={16} className="text-primary-foreground" />
            </div>
            <div>
              <p className="font-display text-[15px] font-bold leading-none tracking-tight">Sparky</p>
              <p className="text-[10px] text-muted-foreground mt-1">Finanças com IA</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-95 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-2 px-2 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => pick(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all active:scale-[0.98]",
                  active
                    ? "bg-primary/15 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <div
                  className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                    active ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground"
                  )}
                >
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-[13px] font-semibold leading-tight", active ? "text-foreground" : "")}>
                    {item.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-4 py-3 border-t border-border/60">
          <p className="text-[10px] text-muted-foreground/70 text-center">v2.0 · Sparky Finance</p>
        </div>
      </aside>
    </>
  );
};

export default AppDrawer;
