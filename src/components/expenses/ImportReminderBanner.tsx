import { useEffect, useState, lazy, Suspense } from "react";
import { Download, Clock, Settings2, X, Check } from "lucide-react";
import {
  shouldShowReminder,
  getDaysSinceImport,
  getReminderConfig,
  setReminderConfig,
  snoozeReminder,
  type ImportReminderConfig,
} from "@/lib/importReminder";

const ImportModal = lazy(() => import("./ImportModal"));

const FREQS = [
  { d: 3, label: "3 dias" },
  { d: 7, label: "Semanal" },
  { d: 15, label: "Quinzenal" },
  { d: 30, label: "Mensal" },
];

const ImportReminderBanner = () => {
  const [visible, setVisible] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [cfg, setCfg] = useState<ImportReminderConfig>(getReminderConfig());
  const [days, setDays] = useState<number | null>(getDaysSinceImport());

  useEffect(() => {
    const refresh = () => {
      setVisible(shouldShowReminder());
      setCfg(getReminderConfig());
      setDays(getDaysSinceImport());
    };
    refresh();
    window.addEventListener("sparky-import-reminder-changed", refresh);
    window.addEventListener("storage", refresh);
    const interval = setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener("sparky-import-reminder-changed", refresh);
      window.removeEventListener("storage", refresh);
      clearInterval(interval);
    };
  }, []);

  const updateCfg = (patch: Partial<ImportReminderConfig>) => {
    const next = { ...cfg, ...patch };
    setReminderConfig(next);
    setCfg(next);
  };

  if (!visible && !configOpen) return null;

  const message =
    days === null
      ? "Importe seu extrato para o Spark começar a aprender seus gastos."
      : days >= cfg.frequencyDays
        ? `Faz ${days} dia${days === 1 ? "" : "s"} desde sua última importação.`
        : "Mantenha suas finanças sempre atualizadas.";

  return (
    <>
      <div className="card-zelo fade-in-up !border-primary/25 !bg-primary/5 border-l-4 border-l-primary">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
            <Download size={16} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <Clock size={12} className="text-primary" />
              Hora de importar seu extrato
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{message}</p>

            <div className="flex items-center gap-2 mt-2.5">
              <button
                onClick={() => setImportOpen(true)}
                className="rounded-full bg-primary px-3 py-1.5 text-[10px] font-bold text-primary-foreground active:scale-95 transition-transform"
              >
                Importar agora
              </button>
              <button
                onClick={() => snoozeReminder(24)}
                className="rounded-full border border-border px-3 py-1.5 text-[10px] font-medium text-muted-foreground active:scale-95 transition-transform"
              >
                Adiar 24h
              </button>
              <button
                onClick={() => setConfigOpen((v) => !v)}
                aria-label="Configurar lembrete"
                className="ml-auto shrink-0 rounded-full p-1.5 text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
              >
                <Settings2 size={13} />
              </button>
            </div>

            {configOpen && (
              <div className="mt-3 rounded-xl border border-border/60 bg-card/60 p-3 space-y-2.5 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold">Lembrete ativo</span>
                  <button
                    onClick={() => updateCfg({ enabled: !cfg.enabled })}
                    className={`relative h-5 w-9 rounded-full transition-colors ${cfg.enabled ? "bg-primary" : "bg-muted"}`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-card shadow transition-transform ${cfg.enabled ? "translate-x-[18px]" : "translate-x-0.5"}`}
                    />
                  </button>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1.5">Frequência</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {FREQS.map((f) => (
                      <button
                        key={f.d}
                        disabled={!cfg.enabled}
                        onClick={() => updateCfg({ frequencyDays: f.d })}
                        className={`rounded-lg py-1.5 text-[10px] font-medium transition-all active:scale-95 disabled:opacity-40 ${
                          cfg.frequencyDays === f.d
                            ? "bg-primary/20 text-primary border border-primary/40"
                            : "bg-muted/40 text-muted-foreground border border-transparent"
                        }`}
                      >
                        {cfg.frequencyDays === f.d && <Check size={9} className="inline mr-0.5" />}
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setConfigOpen(false)}
                  className="w-full rounded-lg border border-border py-1.5 text-[10px] font-medium text-muted-foreground active:scale-[0.98] transition-all"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
          {!configOpen && (
            <button
              onClick={() => snoozeReminder(24)}
              aria-label="Dispensar"
              className="shrink-0 text-muted-foreground hover:text-foreground -mt-0.5"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {importOpen && (
        <Suspense fallback={null}>
          <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
        </Suspense>
      )}
    </>
  );
};

export default ImportReminderBanner;
