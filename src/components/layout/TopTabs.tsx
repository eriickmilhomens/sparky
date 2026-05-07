import { memo } from "react";
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

const TopTabs = memo(({ activeTab, onTabChange }: TopTabsProps) => {
  return (
    <nav className="shrink-0 flex justify-center px-3 pt-2 pb-2">
      <div className="liquid-dock flex w-full max-w-[360px] items-center justify-between gap-0.5 rounded-2xl p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-1 min-w-0 items-center justify-center gap-1 rounded-xl px-1.5 py-2 font-display text-[11px] font-semibold transition-all duration-300 active:scale-95",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground"
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
