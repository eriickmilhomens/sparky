import { useState, useCallback } from "react";
import BalanceHero from "@/components/dashboard/BalanceHero";
import WidgetGrid from "@/components/dashboard/WidgetGrid";
import SpendingOverview from "@/components/dashboard/SpendingOverview";
import SuggestionsCard from "@/components/dashboard/SuggestionsCard";
import BiggestExpenseCard from "@/components/dashboard/BiggestExpenseCard";
import { useFinancialData } from "@/hooks/useFinancialData";

const SkeletonCard = () => (
  <div className="card-zelo animate-pulse" style={{ minHeight: 100 }}>
    <div className="h-3 w-24 bg-muted rounded-lg mb-3" />
    <div className="h-8 w-40 bg-muted rounded-lg mb-2" />
    <div className="h-2 w-32 bg-muted/60 rounded-lg" />
  </div>
);

const DashboardView = () => {
  const [hideValues, setHideValues] = useState(false);
  const { loading } = useFinancialData();
  const now = new Date();
  const dayNames = ["Domingo", "Segunda-Feira", "Terça-Feira", "Quarta-Feira", "Quinta-Feira", "Sexta-Feira", "Sábado"];
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const dateStr = `${dayNames[now.getDay()]}, ${now.getDate()} de ${monthNames[now.getMonth()]}`;

  const handleVisibilityChange = useCallback((visible: boolean) => {
    setHideValues(!visible);
  }, []);

  if (loading) {
    return (
      <div className="relative space-y-3 px-4 pb-4">
        <div className="pointer-events-none absolute -top-20 right-[-20%] h-[300px] w-[300px] rounded-full bg-primary/5 blur-[100px]" />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="relative space-y-3 px-4 pb-4">
      {/* Ambient background orbs */}
      <div className="pointer-events-none absolute -top-20 right-[-20%] h-[300px] w-[300px] rounded-full bg-primary/6 blur-[100px]" />
      <div className="pointer-events-none absolute top-[40%] left-[-15%] h-[200px] w-[200px] rounded-full bg-primary/4 blur-[80px]" />

      {/* Tiny date header (less prominent now that BalanceHero greets the user) */}
      <p className="text-center text-[11px] text-muted-foreground fade-in-up relative z-10 capitalize">
        {dateStr}
      </p>

      {/* Insights priority */}
      <SuggestionsCard />

      {/* Hero balance — referência IMG_2590 */}
      <BalanceHero onVisibilityChange={handleVisibilityChange} />

      {/* Apple-watch style mini-widgets — referência IMG_2589 */}
      <WidgetGrid hideValues={hideValues} />

      {/* Existing rich detail blocks */}
      <SpendingOverview hideValues={hideValues} />
      <BiggestExpenseCard hideValues={hideValues} />
    </div>
  );
};

export default DashboardView;
