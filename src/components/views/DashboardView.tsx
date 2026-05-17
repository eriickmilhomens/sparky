import { useState, useCallback } from "react";
import BalanceHero from "@/components/dashboard/BalanceHero";
import WidgetGrid from "@/components/dashboard/WidgetGrid";
import SpendingOverview from "@/components/dashboard/SpendingOverview";
import BiggestExpenseCard from "@/components/dashboard/BiggestExpenseCard";
import AIInsightsCard from "@/components/dashboard/AIInsightsCard";
import CofrinhosCard from "@/components/dashboard/CofrinhosCard";
import FinancialStatusCard from "@/components/expenses/FinancialStatusCard";
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

      {/* 1. Saldo — prioridade visual máxima */}
      <div data-sparky-prompt="Como está meu saldo este mês e o que posso melhorar?" data-sparky-label="Analisar meu saldo">
        <BalanceHero onVisibilityChange={handleVisibilityChange} />
      </div>

      {/* 2. Status financeiro — saúde imediata */}
      <div data-sparky-prompt="Como está minha saúde financeira agora?" data-sparky-label="Avaliar minha saúde">
        <FinancialStatusCard />
      </div>

      {/* 3. Insights proativos da IA */}
      <div data-sparky-prompt="Pode me explicar melhor esses insights da IA?" data-sparky-label="Explicar insights">
        <AIInsightsCard />
      </div>

      {/* 4. Indicadores rápidos */}
      <div data-sparky-prompt="O que esses indicadores rápidos dizem sobre minhas finanças?" data-sparky-label="Entender meus widgets">
        <WidgetGrid hideValues={hideValues} />
      </div>

      {/* 5. Cofrinhos */}
      <div data-sparky-prompt="Como estão meus cofrinhos e quanto preciso guardar por mês?" data-sparky-label="Avaliar meus cofrinhos">
        <CofrinhosCard />
      </div>

      {/* 6. Dados — análises e detalhes */}
      <div data-sparky-prompt="Em quais categorias eu mais gastei este mês?" data-sparky-label="Analisar meus gastos">
        <SpendingOverview hideValues={hideValues} />
      </div>
      <div data-sparky-prompt="Por que essa foi minha maior despesa? Como evitar próximas?" data-sparky-label="Investigar maior despesa">
        <BiggestExpenseCard hideValues={hideValues} />
      </div>
    </div>
  );
};

export default DashboardView;
