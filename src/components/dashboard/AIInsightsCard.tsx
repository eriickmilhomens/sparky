import { useEffect, useMemo, useState } from "react";
import { Sparkles, RefreshCw, AlertTriangle, TrendingUp, Lightbulb, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFinancialData } from "@/hooks/useFinancialData";
import { loadCofrinhos } from "@/lib/cofrinhos";

interface Insight {
  type: "warning" | "positive" | "tip" | "prediction";
  icon: string;
  title: string;
  body: string;
}

const CACHE_KEY = "sparky-ai-insights";
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h

const typeColors: Record<Insight["type"], { bg: string; ring: string; Icon: any }> = {
  warning: { bg: "bg-destructive/10", ring: "border-destructive/30", Icon: AlertTriangle },
  positive: { bg: "bg-success/10", ring: "border-success/30", Icon: TrendingUp },
  tip: { bg: "bg-primary/10", ring: "border-primary/30", Icon: Lightbulb },
  prediction: { bg: "bg-info/10", ring: "border-info/30", Icon: Eye },
};

const AIInsightsCard = () => {
  const { data, available } = useFinancialData();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const hasData = data.income > 0 || data.expenses > 0;

  // Build context (memoized to avoid effect loops)
  const context = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = Math.max(1, daysInMonth - now.getDate() + 1);
    const dailyBudget = available > 0 ? available / daysLeft : 0;

    // Top 3 categories from current month expense transactions
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const catMap = new Map<string, number>();
    let recurringFixed = 0;
    for (const t of data.transactions) {
      if (t.type !== "expense") continue;
      const d = new Date(t.date);
      if (d < monthStart) continue;
      catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
      if (["Moradia", "Assinaturas", "Contas"].includes(t.category)) recurringFixed += t.amount;
    }
    const topCategories = [...catMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, total]) => ({ name, total, pctOfExpenses: data.expenses > 0 ? (total / data.expenses) * 100 : 0 }));

    // Previous month
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    let prevMonthExpenses = 0;
    for (const t of data.transactions) {
      if (t.type !== "expense") continue;
      const d = new Date(t.date);
      if (d >= prevStart && d <= prevEnd) prevMonthExpenses += t.amount;
    }

    const cofrinhos = loadCofrinhos().slice(0, 5).map(c => ({ name: c.name, saved: c.saved, target: c.target }));

    return {
      income: data.income,
      expenses: data.expenses,
      balance: data.balance,
      available,
      daysLeft,
      dailyBudget,
      topCategories,
      recurringFixed,
      prevMonthExpenses,
      cofrinhos,
    };
  }, [data, available]);

  const fetchInsights = async (force = false) => {
    if (loading) return;

    // Cache check
    if (!force) {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const cached = JSON.parse(raw);
          if (cached.generatedAt && Date.now() - new Date(cached.generatedAt).getTime() < CACHE_TTL && Array.isArray(cached.insights) && cached.insights.length) {
            setInsights(cached.insights);
            setGeneratedAt(cached.generatedAt);
            return;
          }
        }
      } catch {}
    }

    setLoading(true);
    setError(null);
    try {
      const { data: resp, error: invokeErr } = await supabase.functions.invoke("sparky-insights", { body: context });
      if (invokeErr) throw invokeErr;
      if (resp?.error === "rate_limit") { setError("Muitas requisições. Tente em alguns minutos."); return; }
      if (resp?.error === "no_credits") { setError("Créditos de IA esgotados."); return; }
      const list: Insight[] = Array.isArray(resp?.insights) ? resp.insights : [];
      if (list.length === 0) { setError("Sem insights no momento."); return; }
      setInsights(list);
      const ts = resp?.generatedAt || new Date().toISOString();
      setGeneratedAt(ts);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ insights: list, generatedAt: ts })); } catch {}
    } catch (e: any) {
      console.error("AI insights error", e);
      setError("Não foi possível gerar insights agora.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasData) return;
    fetchInsights(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasData]);

  // Listen for data clears
  useEffect(() => {
    const handler = () => {
      try { localStorage.removeItem(CACHE_KEY); } catch {}
      setInsights([]); setGeneratedAt(null);
    };
    window.addEventListener("sparky-data-cleared", handler);
    return () => window.removeEventListener("sparky-data-cleared", handler);
  }, []);

  if (!hasData && insights.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-label flex items-center gap-1.5">
          <Sparkles size={11} className="text-primary" />
          INSIGHTS DA IA
        </p>
        <button
          onClick={() => fetchInsights(true)}
          disabled={loading}
          className="text-[10px] font-semibold text-primary active:scale-95 flex items-center gap-1 disabled:opacity-50"
          aria-label="Atualizar insights"
        >
          <RefreshCw size={10} className={loading ? "animate-spin" : ""} />
          {loading ? "Analisando..." : "Atualizar"}
        </button>
      </div>

      {loading && insights.length === 0 && (
        <div className="card-zelo animate-pulse space-y-2">
          <div className="h-3 w-32 bg-muted rounded" />
          <div className="h-2 w-full bg-muted/60 rounded" />
          <div className="h-2 w-3/4 bg-muted/60 rounded" />
        </div>
      )}

      {error && insights.length === 0 && (
        <div className="card-zelo">
          <p className="text-[11px] text-muted-foreground">{error}</p>
        </div>
      )}

      {insights.map((ins, i) => {
        const cfg = typeColors[ins.type] || typeColors.tip;
        const Icon = cfg.Icon;
        return (
          <div key={i} className={`card-zelo fade-in-up stagger-${(i % 3) + 1} flex items-start gap-3 border ${cfg.ring}`}>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${cfg.bg} text-primary`}>
              <Icon size={18} strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">{ins.title}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{ins.body}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AIInsightsCard;
