import { memo } from "react";
import { Home, Wallet, FileText, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "home", label: "Hoje", icon: Home },
  { id: "expenses", label: "Despesas", icon: Wallet },
  { id: "docs", label: "Docs", icon: FileText },
];

const TopTabs = memo(({ activeTab, onTabChange }: TopTabsProps) => {
  return (
    <div className="shrink-0 px-4 pt-2 pb-1">
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-display font-semibold transition-all duration-300 active:scale-95",
                isActive
                  ? "border-success/40 bg-success/10 text-success shadow-sm shadow-success/10"
                  : "border-border/40 bg-card/40 text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={14} strokeWidth={isActive ? 2.4 : 1.8} />
              <span className="tracking-tight">{tab.label}</span>
              {isActive && <ChevronRight size={12} className="opacity-60" />}
            </button>
          );
        })}
      </div>
    </div>
  );
});

TopTabs.displayName = "TopTabs";

export default TopTabs;
