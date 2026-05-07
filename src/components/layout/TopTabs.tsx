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
    <nav className="shrink-0 flex justify-center px-3 pt-2 pb-2 overflow-hidden">
      <div className="liquid-dock flex w-full max-w-md items-center justify-center gap-0.5 rounded-2xl p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-current={isActive ? "page" : undefined}
              aria-label={tab.label}
              className={cn(
                "flex min-w-0 items-center justify-center gap-1 rounded-xl py-2 font-display text-[12px] font-semibold transition-all duration-300 active:scale-95",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 px-3"
                  : "text-muted-foreground hover:text-foreground px-2.5"
              )}
            >
              <Icon size={15} strokeWidth={isActive ? 2.4 : 2} />
              {isActive && <span className="tracking-tight truncate">{tab.label}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
});

TopTabs.displayName = "TopTabs";

export default TopTabs;
