import { Eye, EyeOff, Pencil, Plus, Minus, TrendingUp, TrendingDown, ShieldCheck, AlertTriangle, ShieldAlert } from "lucide-react";
import { useState, useEffect } from "react";
import { InfoButton, InfoPanel } from "@/components/InfoButton";
import { useFinancialData, fmt } from "@/hooks/useFinancialData";
import { toast } from "sonner";

interface BalanceHeroProps {
  onVisibilityChange?: (visible: boolean) => void;
}

/**
 * Hero card do dashboard inspirado em "Your Balance" (referência IMG_2590).
 * Exibe saudação + saldo enorme + variação mensal + ações rápidas.
 */
const BalanceHero = ({ onVisibilityChange }: BalanceHeroProps) => {
  const [visible, setVisible] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [adjustType, setAdjustType] = useState<"add" | "sub">("add");
  const [adjustValue, setAdjustValue] = useState("");
  const [adjustDesc, setAdjustDesc] = useState("");

  const { available, data, addTransaction } = useFinancialData();

  useEffect(() => {
    onVisibilityChange?.(visible);
  }, [visible, onVisibilityChange]);

  const pctChange = data.income > 0 ? ((data.income - data.expenses) / data.income) * 100 : 0;
  const isPositive = pctChange >= 0;

  // Inline financial status (replaces separate FinancialStatusCard)
  const ratio = data.income > 0 ? (data.expenses / data.income) * 100 : 0;
  const status = ratio > 85 ? "critical" : ratio > 60 ? "attention" : "healthy";
  const statusCfg = {
    healthy: { Icon: ShieldCheck, label: "Saúde financeira boa", color: "text-success", dot: "bg-success" },
    attention: { Icon: AlertTriangle, label: `Atenção · ${Math.round(ratio)}% da receita`, color: "text-warning", dot: "bg-warning" },
    critical: { Icon: ShieldAlert, label: `Crítico · ${Math.round(ratio)}% da receita`, color: "text-destructive", dot: "bg-destructive" },
  }[status];
  const showStatus = data.income > 0 || data.expenses > 0;

  const handleAdjust = async () => {
    const raw = adjustValue.replace(/\./g, "").replace(",", ".");
    const val = parseFloat(raw);
    if (isNaN(val) || val <= 0) {
      toast.error("Digite um valor válido");
      return;
    }
    try {
      await addTransaction({
        date: new Date().toISOString(),
        description: adjustDesc || "Ajuste de saldo",
        amount: val,
        type: adjustType === "add" ? "income" : "expense",
        category: "Ajuste",
      });
      toast.success(`Saldo ajustado: ${adjustType === "add" ? "+" : "-"}${fmt(val)}`);
      setAdjustValue("");
      setAdjustDesc("");
      setEditing(false);
    } catch {
      toast.error("Erro ao ajustar saldo");
    }
  };

  return (
    <div className="card-zelo fade-in-up relative overflow-hidden">
      {/* Top row: label + actions */}
      <div className="relative z-10 flex items-start justify-between mb-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Seu Saldo</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setEditing(!editing)}
            className="rounded-xl p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-95 transition-all"
            aria-label="Ajustar saldo"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => setVisible(!visible)}
            className="rounded-xl p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-95 transition-all"
            aria-label={visible ? "Ocultar valores" : "Mostrar valores"}
          >
            {visible ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
          <InfoButton expanded={showInfo} onToggle={setShowInfo} />
        </div>
      </div>


      {/* Hero amount — enorme, estilo referência */}
      <div className="relative z-10 flex items-end gap-2">
        <p className="text-[40px] sm:text-[44px] font-display font-extrabold tracking-tight tabular-nums leading-none">
          {visible ? fmt(available) : "••••••"}
        </p>
      </div>

      <InfoPanel expanded={showInfo} className="relative z-10">
        Saldo total disponível após descontar contas pendentes e reservas. Toque no lápis para um ajuste manual.
      </InfoPanel>

      {/* Footer chips */}
      {visible && (
        <div className="relative z-10 mt-3 flex flex-wrap items-center gap-2">
          {data.income > 0 && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                isPositive
                  ? "bg-success/12 text-success border border-success/20"
                  : "bg-destructive/12 text-destructive border border-destructive/20"
              }`}
            >
              {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {isPositive ? "+" : ""}
              {pctChange.toFixed(1)}% este mês
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            <span className="text-success font-semibold tabular-nums">{fmt(data.income)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
            <span className="text-destructive font-semibold tabular-nums">{fmt(data.expenses)}</span>
          </span>
        </div>
      )}

      {/* Status financeiro inline */}
      {showStatus && (() => {
        const StatusIcon = statusCfg.Icon;
        return (
          <div className="relative z-10 mt-3 flex items-center gap-2 rounded-2xl border border-border/40 bg-muted/20 px-3 py-2">
            <StatusIcon size={14} className={statusCfg.color} />
            <span className={`flex-1 text-[11px] font-semibold ${statusCfg.color}`}>{statusCfg.label}</span>
            <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
          </div>
        );
      })()}

      {editing && (
        <div className="relative z-10 mt-4 pt-4 border-t border-border/40 space-y-3 fade-in-up">
          <div className="flex gap-2">
            <button
              onClick={() => setAdjustType("add")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-semibold transition-all ${
                adjustType === "add"
                  ? "bg-success/12 text-success border border-success/25"
                  : "bg-muted/50 text-muted-foreground border border-transparent"
              }`}
            >
              <Plus size={13} /> Adicionar
            </button>
            <button
              onClick={() => setAdjustType("sub")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-semibold transition-all ${
                adjustType === "sub"
                  ? "bg-destructive/12 text-destructive border border-destructive/25"
                  : "bg-muted/50 text-muted-foreground border border-transparent"
              }`}
            >
              <Minus size={13} /> Subtrair
            </button>
          </div>
          <input
            type="text"
            inputMode="decimal"
            placeholder="Digite o valor"
            value={adjustValue}
            onChange={(e) => setAdjustValue(e.target.value)}
            className="w-full rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all tabular-nums"
          />
          <input
            type="text"
            placeholder="Descrição (opcional)"
            value={adjustDesc}
            onChange={(e) => setAdjustDesc(e.target.value)}
            className="w-full rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="flex-1 rounded-2xl border border-border py-3 text-xs font-medium text-muted-foreground hover:bg-muted/30 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdjust}
              className="flex-1 rounded-2xl bg-primary py-3 text-xs font-display font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
            >
              Salvar Ajuste
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BalanceHero;
