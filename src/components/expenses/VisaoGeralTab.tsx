import { useMemo } from "react";
import StatusCards from "@/components/expenses/StatusCards";
import CreditCardCarousel from "@/components/expenses/CreditCardCarousel";
import TrendChart from "@/components/expenses/TrendChart";
import DonutChart from "@/components/expenses/DonutChart";
import PaceBar from "@/components/expenses/PaceBar";
import BudgetAlert from "@/components/expenses/BudgetAlert";
import SyncStatusBanner from "@/components/expenses/SyncStatusBanner";
import SyncBanner from "@/components/expenses/SyncBanner";
import ImportReminderBanner from "@/components/expenses/ImportReminderBanner";
import FinancialStatusCard from "@/components/expenses/FinancialStatusCard";
import SubscriptionsCard from "@/components/expenses/SubscriptionsCard";
import DailyBudgetWidget from "@/components/expenses/DailyBudgetWidget";

import { useFinancialData } from "@/hooks/useFinancialData";
import { isGoalDepositTransaction } from "@/lib/financialCalculations";

interface VisaoGeralTabProps {
  onNavigateToMetas?: () => void;
}

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const VisaoGeralTab = ({ onNavigateToMetas }: VisaoGeralTabProps) => {
  const { data } = useFinancialData();

  // Real balance history: net (income - expenses) per month for the last 6 months
  const balanceHistory = useMemo(() => {
    const now = new Date();
    const months: { name: string; value: number }[] = [];
    let running = 0;
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthIdx = d.getMonth();
      const yearIdx = d.getFullYear();
      const net = data.transactions.reduce((sum, t) => {
        const td = new Date(t.date);
        if (td.getMonth() !== monthIdx || td.getFullYear() !== yearIdx) return sum;
        if (isGoalDepositTransaction(t)) return sum;
        return sum + (t.type === "income" ? t.amount : -t.amount);
      }, 0);
      running += net;
      months.push({ name: MONTH_LABELS[monthIdx], value: Math.round(running) });
    }
    return months;
  }, [data.transactions]);

  return (
    <div className="space-y-3">
      {/* 1. Alertas e ações imediatas */}
      <SyncStatusBanner />
      <ImportReminderBanner />
      <SyncBanner onNavigateToMetas={onNavigateToMetas} hideSyncBanner />
      <BudgetAlert />

      {/* 2. Prioridades — o que precisa de atenção agora */}
      <StatusCards />
      <DailyBudgetWidget />

      {/* 3. Recorrentes — assinaturas e cartões */}
      <SubscriptionsCard />
      <CreditCardCarousel />

      {/* 4. Análises — dados detalhados */}
      <FinancialStatusCard />
      {balanceHistory.some(m => m.value !== 0) && (
        <TrendChart title="Histórico de Saldo" data={balanceHistory} color="hsl(var(--primary))" gradientId="balGrad" />
      )}
      <DonutChart />
      <PaceBar />
    </div>
  );
};

export default VisaoGeralTab;
