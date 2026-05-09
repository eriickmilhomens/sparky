import { useState } from "react";
import { X, Sparkles, Trash2, CheckSquare, Square, Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useDockVisibility } from "@/hooks/useDockVisibility";
import { markImported } from "@/lib/importReminder";

interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  value: number;
  type: "in" | "out";
  selected: boolean;
}

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
}

const ImportModal = ({ open, onClose }: ImportModalProps) => {
  const [step, setStep] = useState<"input" | "review">("input");
  useDockVisibility(open);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const { data, updateData } = useFinancialData();

  const totalIncome = transactions.filter(t => t.selected && t.type === "in").reduce((s, t) => s + t.value, 0);
  const totalExpense = transactions.filter(t => t.selected && t.type === "out").reduce((s, t) => s + t.value, 0);
  const selectedCount = transactions.filter(t => t.selected).length;
  const balance = totalIncome - totalExpense;
  const allSelected = transactions.length > 0 && transactions.every(t => t.selected);

  const handleProcess = async () => {
    if (!text.trim()) { toast.error("Cole o texto do extrato"); return; }
    setLoading(true);
    try {
      const { data: resData, error } = await supabase.functions.invoke("sparky-import", {
        body: { text: text.trim() },
      });
      if (error) throw error;
      // Filter out irrelevant items: caixinhas, reservas, transferências entre contas próprias,
      // aplicações/resgates de poupança/CDB, etc. — não devem entrar no extrato do app.
      const IRRELEVANT_PATTERNS = [
        /caixinh/i,
        /reserv/i,
        /poupan[cç]a/i,
        /aplica[cç][aã]o/i,
        /resgate/i,
        /cdb/i,
        /rendimento autom/i,
        /transfer[eê]ncia entre contas/i,
        /transf\.? entre contas/i,
        /entre contas pr[oó]prias/i,
        /investiment/i,
        /meta:/i,
        /objetivo:/i,
      ];
      const isIrrelevant = (desc: string) => IRRELEVANT_PATTERNS.some(rx => rx.test(desc || ""));
      const raw = resData?.transactions || [];
      const filtered = raw.filter((t: any) => !isIrrelevant(t.description));
      const skipped = raw.length - filtered.length;
      const parsed = filtered.map((t: any) => ({
        ...t, id: crypto.randomUUID(), selected: true,
      }));
      if (parsed.length === 0) {
        toast.error(skipped > 0 ? "Apenas movimentações irrelevantes (caixinhas/reservas) foram detectadas." : "Nenhuma transação encontrada no texto");
        setLoading(false);
        return;
      }
      if (skipped > 0) {
        toast.success(`${skipped} movimentação(ões) irrelevante(s) (caixinhas/reservas) foram ignoradas.`);
      }
      setTransactions(parsed);
      setStep("review");
    } catch (e: any) {
      toast.error(e.message || "Erro ao processar extrato");
    }
    setLoading(false);
  };

  const toggleAll = () => {
    const next = !allSelected;
    setTransactions(prev => prev.map(t => ({ ...t, selected: next })));
  };

  const toggleOne = (id: string) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
  };

  const removeOne = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleImport = () => {
    const selected = transactions.filter(t => t.selected);
    if (selected.length === 0) { toast.error("Selecione ao menos uma transação"); return; }

    // Convert to central format and update financial data
    const newTxs = selected.map(t => ({
      id: t.id,
      date: (() => {
        try {
          const [d, m, y] = t.date.split("/");
          return new Date(+y, +m - 1, +d).toISOString();
        } catch { return new Date().toISOString(); }
      })(),
      description: t.description,
      amount: t.value,
      type: (t.type === "in" ? "income" : "expense") as "income" | "expense",
      category: t.category,
    }));

    const incomeSum = selected.filter(t => t.type === "in").reduce((s, t) => s + t.value, 0);
    const expenseSum = selected.filter(t => t.type === "out").reduce((s, t) => s + t.value, 0);

    updateData({
      income: data.income + incomeSum,
      expenses: data.expenses + expenseSum,
      balance: data.balance + incomeSum - expenseSum,
      transactions: [...newTxs, ...data.transactions],
    });

    markImported();
    toast.success(`Sucesso! ${selected.length} transações foram integradas ao seu Sparky e o saldo foi atualizado.`);
    handleClose();
  };

  const handleClose = () => {
    setStep("input");
    setText("");
    setTransactions([]);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] rounded-2xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            {step === "review" && (
              <button onClick={() => setStep("input")} className="text-muted-foreground hover:text-foreground active:scale-95 transition-all">
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Sparkles size={18} className="text-primary" />
                Importar Extrato com IA
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {step === "input"
                  ? "Cole o texto do seu extrato bancário e deixe a IA categorizar automaticamente."
                  : `Encontramos ${transactions.length} transações`}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-full p-1.5 text-muted-foreground hover:text-foreground active:scale-95 transition-all">
            <X size={20} />
          </button>
        </div>

        {step === "input" ? (
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
              <p className="text-xs font-semibold text-primary">Como funciona:</p>
              <ol className="text-[11px] text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Copie o extrato do seu banco (texto, PDF ou planilha)</li>
                <li>Cole no campo abaixo</li>
                <li>Clique em "Processar com IA"</li>
                <li>Revise as transações categorizadas</li>
                <li>Importe as transações selecionadas</li>
              </ol>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Exemplo:\n20/03/2026  PIX Recebido João    2.500,00 C\n19/03/2026  Supermercado Extra   342,50  D\n18/03/2026  Netflix              55,90   D`}
              className="w-full min-h-[200px] rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none font-mono"
            />

            <button
              onClick={handleProcess}
              disabled={loading || !text.trim()}
              className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Processar com IA
                </>
              )}
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 p-5 pb-3">
                <div className="rounded-xl border border-success/20 bg-success/5 p-3">
                  <p className="text-[10px] text-muted-foreground font-medium">Receitas</p>
                  <p className="text-base font-bold text-success tabular-nums">
                    R$ {totalIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                  <p className="text-[10px] text-muted-foreground font-medium">Despesas</p>
                  <p className="text-base font-bold text-destructive tabular-nums">
                    R$ {totalExpense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="px-5 pb-2">
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {allSelected ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} />}
                  Selecionar todas ({selectedCount} selecionadas)
                </button>
              </div>

              <div className="px-5 space-y-2 pb-4">
                {transactions.map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      "rounded-xl border p-3 flex items-center gap-3 transition-all",
                      t.selected ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20 opacity-60"
                    )}
                  >
                    <button onClick={() => toggleOne(t.id)} className="shrink-0">
                      {t.selected
                        ? <CheckSquare size={18} className="text-primary" />
                        : <Square size={18} className="text-muted-foreground" />
                      }
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground tabular-nums">{t.date}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">{t.category}</span>
                        {(t as any).confidence !== undefined && (t as any).confidence < 0.7 && (
                          <span className="text-[8px] px-1 py-0.5 rounded bg-warning/20 text-warning font-medium">⚠ Revisar</span>
                        )}
                      </div>
                      <p className="text-xs font-medium truncate mt-0.5">{t.description}</p>
                    </div>
                    <span className={cn(
                      "text-sm font-bold tabular-nums shrink-0",
                      t.type === "in" ? "text-success" : "text-destructive"
                    )}>
                      {t.type === "in" ? "+" : "−"} R$ {t.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                    <button onClick={() => removeOne(t.id)} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors active:scale-95">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border p-4 flex items-center justify-between gap-3">
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <p>{selectedCount} de {transactions.length} selecionadas</p>
                <p className="font-semibold text-foreground text-xs tabular-nums">
                  Saldo: R$ {balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleClose}
                  className="rounded-xl border border-border px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  disabled={selectedCount === 0}
                  className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  ✓ Importar {selectedCount}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ImportModal;
