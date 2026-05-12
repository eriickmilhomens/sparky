import { useState, useCallback, Suspense } from "react";
import { Plus, Settings, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

const AddExpenseModal = lazyWithRetry(() => import("@/components/expenses/AddExpenseModal"));
const SettingsModal = lazyWithRetry(() => import("@/components/expenses/SettingsModal"));
const CreditCardManager = lazyWithRetry(() => import("@/components/expenses/CreditCardManager"));
const VisaoGeralTab = lazyWithRetry(() => import("@/components/expenses/VisaoGeralTab"));
const ExtratoTab = lazyWithRetry(() => import("@/components/expenses/ExtratoTab"));
const PlanejamentoTab = lazyWithRetry(() => import("@/components/expenses/PlanejamentoTab"));

const tabNames = ["Visão Geral", "Extrato", "Planejamento"];

const TabSkeleton = () => (
  <div className="space-y-3 animate-pulse">
    <div className="grid grid-cols-2 gap-2">
      <div className="h-[68px] bg-muted rounded-2xl" />
      <div className="h-[68px] bg-muted rounded-2xl" />
    </div>
    <div className="h-[200px] bg-muted rounded-2xl" />
  </div>
);

const ExpensesView = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Visão Geral");

  const handleNavigateToMetas = useCallback(() => {
    setActiveTab("Planejamento");
    setTimeout(() => {
      document.getElementById("metas-investimento")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  const renderTab = () => {
    switch (activeTab) {
      case "Extrato": return <ExtratoTab />;
      case "Planejamento": return <PlanejamentoTab />;
      default: return <VisaoGeralTab onNavigateToMetas={handleNavigateToMetas} />;
    }
  };

  return (
    <>
      <div className="px-4 pb-24 space-y-4">
        <div className="flex items-center justify-between pt-3">
          <h1 className="text-xl font-display font-bold">Despesas</h1>
          <div className="flex items-center gap-0.5">
            <button onClick={() => setSettingsOpen(true)}
              className="rounded-xl p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-95 transition-transform will-change-transform">
              <Settings size={17} />
            </button>
            <button onClick={() => setCardsOpen(true)}
              className="rounded-xl p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-95 transition-transform will-change-transform">
              <CreditCard size={17} />
            </button>
          </div>
        </div>

        <div className="flex gap-1 rounded-2xl bg-muted/40 p-1 border border-border/50">
          {tabNames.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-xs font-display font-medium transition-all active:scale-[0.97] will-change-transform",
                activeTab === tab
                  ? "bg-card text-foreground shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              )}>{tab}</button>
          ))}
        </div>

        <Suspense fallback={<TabSkeleton />}>
          {renderTab()}
        </Suspense>
      </div>

      <button onClick={() => setModalOpen(true)}
        aria-label="Adicionar despesa"
        className="fab-add fixed right-5 z-[100] flex h-12 w-12 items-center justify-center rounded-full text-foreground transition-transform active:scale-90 will-change-transform"
        style={{ bottom: 'calc(112px + env(safe-area-inset-bottom, 0px))' }}>
        <Plus size={20} strokeWidth={2.25} />
      </button>

      <Suspense fallback={null}>
        {modalOpen && <AddExpenseModal open={modalOpen} onClose={() => setModalOpen(false)} type="expense" />}
        {settingsOpen && <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />}
        {cardsOpen && <CreditCardManager open={cardsOpen} onClose={() => setCardsOpen(false)} />}
      </Suspense>
    </>
  );
};

export default ExpensesView;
