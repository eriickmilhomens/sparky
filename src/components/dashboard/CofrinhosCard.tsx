import { useEffect, useState } from "react";
import { Plus, ChevronRight, PiggyBank, Lightbulb } from "lucide-react";
import { Cofrinho, loadCofrinhos, monthlyContribution } from "@/lib/cofrinhos";
import { fmt } from "@/hooks/useFinancialData";
import CofrinhosManager from "@/components/expenses/CofrinhosManager";

const CofrinhosCard = () => {
  const [list, setList] = useState<Cofrinho[]>(() => loadCofrinhos());
  const [open, setOpen] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setList(loadCofrinhos());
    window.addEventListener("sparky-cofrinhos-update", refresh);
    window.addEventListener("sparky-data-cleared", refresh);
    return () => {
      window.removeEventListener("sparky-cofrinhos-update", refresh);
      window.removeEventListener("sparky-data-cleared", refresh);
    };
  }, []);

  if (list.length === 0) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="card-zelo fade-in-up w-full text-left flex items-center gap-3 active:scale-[0.99] transition-transform"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 border border-primary/10">
            <PiggyBank size={20} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Crie seu primeiro Cofrinho</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Guarde para uma viagem, carro novo ou reserva de emergência.
            </p>
          </div>
          <Plus size={16} className="text-primary shrink-0" />
        </button>
        {open && <CofrinhosManager open={open} onClose={() => setOpen(false)} focusId={null} />}
      </>
    );
  }

  // Sort: closest to completion first
  const sorted = [...list].sort((a, b) => (b.saved / Math.max(1, b.target)) - (a.saved / Math.max(1, a.target)));
  const visible = sorted.slice(0, 3);
  const total = list.reduce((s, c) => s + c.saved, 0);
  const totalTarget = list.reduce((s, c) => s + c.target, 0);

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-label">COFRINHOS</p>
          <button onClick={() => setOpen(true)} className="text-[10px] font-semibold text-primary active:scale-95 flex items-center gap-0.5">
            Gerenciar <ChevronRight size={11} />
          </button>
        </div>

        <div className="card-zelo fade-in-up space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground">TOTAL GUARDADO</p>
              <p className="text-lg font-display font-bold tabular-nums">{fmt(total)}</p>
            </div>
            <p className="text-[10px] text-muted-foreground tabular-nums">de {fmt(totalTarget)}</p>
          </div>

          <div className="space-y-2.5">
            {visible.map(c => {
              const pct = Math.min(100, (c.saved / Math.max(1, c.target)) * 100);
              const monthly = monthlyContribution(c);
              return (
                <button
                  key={c.id}
                  onClick={() => { setFocusId(c.id); setOpen(true); }}
                  className="w-full text-left active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-center gap-2.5 mb-1">
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
                      style={{ background: `${c.color}1f`, color: c.color }}
                    >
                      <PiggyBank size={12} strokeWidth={2.4} />
                    </span>
                    <p className="flex-1 text-xs font-semibold truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                      {fmt(c.saved)} <span className="opacity-50">/ {fmt(c.target)}</span>
                    </p>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: c.color }}
                    />
                  </div>
                  {monthly !== null && pct < 100 && (
                    <p className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1">
                      <Lightbulb size={10} className="text-primary" />
                      Guarde {fmt(monthly)}/mês para atingir no prazo
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {list.length > 3 && (
            <button onClick={() => setOpen(true)} className="w-full text-[11px] font-semibold text-primary active:scale-95">
              Ver todos os {list.length} cofrinhos
            </button>
          )}
        </div>
      </div>

      {open && <CofrinhosManager open={open} onClose={() => { setOpen(false); setFocusId(null); }} focusId={focusId} />}
    </>
  );
};

export default CofrinhosCard;
