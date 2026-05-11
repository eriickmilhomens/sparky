import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2, ArrowDownToLine, ArrowUpFromLine, Calendar, Target } from "lucide-react";
import { toast } from "sonner";
import {
  Cofrinho,
  COFRINHO_PRESETS,
  loadCofrinhos,
  createCofrinho,
  deleteCofrinho,
  depositCofrinho,
  withdrawCofrinho,
  monthlyContribution,
} from "@/lib/cofrinhos";
import { fmt } from "@/hooks/useFinancialData";
import { handleBRLChange, parseBRLInput } from "@/lib/brlInput";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  focusId: string | null;
}

const CofrinhosManager = ({ open, onClose, focusId }: Props) => {
  const [list, setList] = useState<Cofrinho[]>([]);
  const [view, setView] = useState<"list" | "create">("list");
  const [activeId, setActiveId] = useState<string | null>(focusId);
  const [depositMode, setDepositMode] = useState<"in" | "out" | null>(null);
  const [amount, setAmount] = useState("");

  // Create form
  const [preset, setPreset] = useState(0);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    if (!open) return;
    const refresh = () => setList(loadCofrinhos());
    refresh();
    window.addEventListener("sparky-cofrinhos-update", refresh);
    return () => window.removeEventListener("sparky-cofrinhos-update", refresh);
  }, [open]);

  useEffect(() => { setActiveId(focusId); }, [focusId, open]);

  if (!open) return null;

  const active = list.find(c => c.id === activeId);

  const resetCreate = () => {
    setPreset(0); setName(""); setTarget(""); setDeadline("");
  };

  const handleCreate = () => {
    const t = parseBRLInput(target);
    if (!name.trim()) return toast.error("Dê um nome ao seu cofrinho");
    if (t <= 0) return toast.error("Defina uma meta maior que zero");
    const p = COFRINHO_PRESETS[preset];
    createCofrinho({
      name: name.trim(),
      emoji: p.emoji,
      color: p.color,
      target: t,
      deadline: deadline || undefined,
    });
    toast.success("Cofrinho criado! 🐷");
    resetCreate();
    setView("list");
  };

  const handleDeposit = () => {
    if (!active || !depositMode) return;
    const v = parseBRLInput(amount);
    if (v <= 0) return toast.error("Valor inválido");
    if (depositMode === "in") {
      depositCofrinho(active.id, v);
      toast.success(`+${fmt(v)} guardado em ${active.name}`);
    } else {
      withdrawCofrinho(active.id, v);
      toast.success(`-${fmt(v)} retirado de ${active.name}`);
    }
    setAmount(""); setDepositMode(null);
  };

  const handleDelete = (id: string, n: string) => {
    if (!confirm(`Excluir o cofrinho "${n}"? O dinheiro guardado não será movido.`)) return;
    deleteCofrinho(id);
    setActiveId(null);
    toast.success("Cofrinho excluído");
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-background flex flex-col" style={{ paddingTop: "env(safe-area-inset-top, 20px)" }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
        <button onClick={() => {
          if (active && !depositMode) { setActiveId(null); return; }
          if (depositMode) { setDepositMode(null); setAmount(""); return; }
          if (view === "create") { setView("list"); return; }
          onClose();
        }} className="rounded-xl p-2 active:scale-95">
          <X size={18} />
        </button>
        <h1 className="flex-1 text-base font-display font-bold">
          {depositMode ? (depositMode === "in" ? "Depositar" : "Retirar") : active ? active.name : view === "create" ? "Novo Cofrinho" : "Meus Cofrinhos"}
        </h1>
        {!active && view === "list" && (
          <button onClick={() => setView("create")} className="rounded-xl bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground active:scale-95 flex items-center gap-1">
            <Plus size={12} /> Novo
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
        {/* DETAIL */}
        {active && !depositMode && (
          <DetailView c={active} onDeposit={() => setDepositMode("in")} onWithdraw={() => setDepositMode("out")} onDelete={() => handleDelete(active.id, active.name)} />
        )}

        {/* DEPOSIT/WITHDRAW */}
        {active && depositMode && (
          <div className="space-y-4">
            <div className="card-zelo text-center">
              <p className="text-[10px] text-muted-foreground mb-1">{depositMode === "in" ? "DEPOSITANDO EM" : "RETIRANDO DE"}</p>
              <p className="text-base font-semibold">{active.emoji} {active.name}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Saldo atual: <span className="tabular-nums">{fmt(active.saved)}</span></p>
            </div>
            <div className="space-y-2">
              <label className="text-label px-1">VALOR</label>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(handleBRLChange(e.target.value))}
                placeholder="R$ 0,00"
                autoFocus
                className="w-full rounded-2xl bg-muted/40 border border-border/50 px-4 py-4 text-right text-2xl font-display font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <button
              onClick={handleDeposit}
              className={cn("w-full rounded-2xl py-3.5 text-sm font-semibold active:scale-[0.98] transition-transform",
                depositMode === "in" ? "bg-success text-white" : "bg-warning text-foreground")}
            >
              {depositMode === "in" ? "Confirmar depósito" : "Confirmar retirada"}
            </button>
          </div>
        )}

        {/* LIST */}
        {!active && view === "list" && (
          <>
            {list.length === 0 && (
              <div className="card-zelo text-center py-10">
                <p className="text-4xl mb-2">🐷</p>
                <p className="text-sm font-semibold mb-1">Nenhum cofrinho ainda</p>
                <p className="text-[11px] text-muted-foreground mb-4">Crie cofrinhos para metas específicas: viagem, carro, reserva...</p>
                <button onClick={() => setView("create")} className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground active:scale-95">
                  Criar meu primeiro
                </button>
              </div>
            )}
            {list.map(c => {
              const pct = Math.min(100, (c.saved / Math.max(1, c.target)) * 100);
              return (
                <button key={c.id} onClick={() => setActiveId(c.id)} className="card-zelo w-full text-left active:scale-[0.99] transition-transform">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl leading-none">{c.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">{fmt(c.saved)} / {fmt(c.target)}</p>
                    </div>
                    <p className="text-base font-display font-bold tabular-nums">{pct.toFixed(0)}%</p>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: c.color }} />
                  </div>
                </button>
              );
            })}
          </>
        )}

        {/* CREATE */}
        {!active && view === "create" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-label px-1">ESCOLHA UM ESTILO</label>
              <div className="grid grid-cols-4 gap-2">
                {COFRINHO_PRESETS.map((p, i) => (
                  <button key={i} onClick={() => { setPreset(i); if (!name) setName(p.name); }}
                    className={cn("aspect-square rounded-2xl border flex flex-col items-center justify-center gap-1 active:scale-95 transition-all",
                      preset === i ? "border-primary bg-primary/10" : "border-border/50 bg-muted/30")}>
                    <span className="text-2xl">{p.emoji}</span>
                    <span className="text-[9px] text-muted-foreground truncate w-full text-center px-1">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-label px-1">NOME DO COFRINHO</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Viagem para Bali"
                className="w-full rounded-2xl bg-muted/40 border border-border/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>

            <div className="space-y-2">
              <label className="text-label px-1">META (R$)</label>
              <input type="text" inputMode="numeric" value={target} onChange={(e) => setTarget(handleBRLChange(e.target.value))} placeholder="R$ 0,00"
                className="w-full rounded-2xl bg-muted/40 border border-border/50 px-4 py-3 text-right text-lg font-display font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>

            <div className="space-y-2">
              <label className="text-label px-1 flex items-center gap-1.5"><Calendar size={11} /> PRAZO (OPCIONAL)</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-2xl bg-muted/40 border border-border/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              <p className="text-[10px] text-muted-foreground px-1">Definindo um prazo, calculamos quanto guardar por mês.</p>
            </div>

            <button onClick={handleCreate} className="w-full rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground active:scale-[0.98] transition-transform">
              Criar Cofrinho
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

const DetailView = ({ c, onDeposit, onWithdraw, onDelete }: { c: Cofrinho; onDeposit: () => void; onWithdraw: () => void; onDelete: () => void }) => {
  const pct = Math.min(100, (c.saved / Math.max(1, c.target)) * 100);
  const remaining = Math.max(0, c.target - c.saved);
  const monthly = monthlyContribution(c);
  return (
    <div className="space-y-3">
      <div className="card-zelo text-center py-6 space-y-3">
        <div className="text-5xl">{c.emoji}</div>
        <div>
          <p className="text-3xl font-display font-bold tabular-nums">{fmt(c.saved)}</p>
          <p className="text-[11px] text-muted-foreground">de {fmt(c.target)} ({pct.toFixed(1)}%)</p>
        </div>
        <div className="h-2.5 w-full rounded-full bg-muted/60 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: c.color }} />
        </div>
        {remaining > 0 ? (
          <p className="text-[11px] text-muted-foreground">Faltam <span className="font-semibold text-foreground tabular-nums">{fmt(remaining)}</span> para sua meta</p>
        ) : (
          <p className="text-xs font-semibold text-success">🎉 Meta atingida!</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={onDeposit} className="card-zelo flex items-center justify-center gap-2 py-4 active:scale-[0.98] transition-transform">
          <ArrowDownToLine size={16} className="text-success" />
          <span className="text-xs font-semibold">Depositar</span>
        </button>
        <button onClick={onWithdraw} className="card-zelo flex items-center justify-center gap-2 py-4 active:scale-[0.98] transition-transform">
          <ArrowUpFromLine size={16} className="text-warning" />
          <span className="text-xs font-semibold">Retirar</span>
        </button>
      </div>

      {monthly !== null && remaining > 0 && (
        <div className="card-zelo flex items-center gap-3">
          <Target size={18} className="text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground">Sugestão mensal</p>
            <p className="text-sm font-semibold tabular-nums">{fmt(monthly)} / mês</p>
          </div>
        </div>
      )}

      {c.deadline && (
        <div className="card-zelo flex items-center gap-3">
          <Calendar size={18} className="text-info shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground">Prazo</p>
            <p className="text-sm font-semibold">{new Date(c.deadline).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
          </div>
        </div>
      )}

      <button onClick={onDelete} className="w-full rounded-2xl border border-destructive/30 bg-destructive/5 py-3 text-xs font-semibold text-destructive active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
        <Trash2 size={14} /> Excluir cofrinho
      </button>
    </div>
  );
};

export default CofrinhosManager;
