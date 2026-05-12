import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  ArrowLeft, Pencil, Star, ChevronRight, User, SlidersHorizontal,
  CreditCard, KeyRound, Lock, Fingerprint, LogOut, Trash2,
  AlertTriangle, RotateCcw, MessageCircle, LayoutGrid, Volume2,
  Vibrate, Sun, Moon, Rocket, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { handleBRLChange } from "@/lib/brlInput";
import { useProfile } from "@/hooks/useProfile";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useTheme } from "@/hooks/useTheme";
import { useDockVisibility } from "@/hooks/useDockVisibility";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { supabase } from "@/integrations/supabase/client";

interface Props { open: boolean; onClose: () => void; }

type Screen = "root" | "profile" | "preferences" | "subscription" | "security";

const SETTINGS_KEY = "sparky-financial-settings";
const PREFS_KEY = "sparky-prefs";

interface FinSettings {
  reserveMode: "percent" | "fixed";
  reservePercent: number;
  reserveFixed: string;
  weekendWeight: number;
  lowBalanceAlert: string;
  alertsEnabled: boolean;
  dueDateAlert: boolean;
  invoiceAlert: boolean;
}
const defaultFin: FinSettings = {
  reserveMode: "percent", reservePercent: 10, reserveFixed: "",
  weekendWeight: 1.5, lowBalanceAlert: "500",
  alertsEnabled: true, dueDateAlert: true, invoiceAlert: true,
};

interface Prefs {
  homePage: "chat" | "dashboard";
  sounds: boolean;
  vibrations: boolean;
}
const defaultPrefs: Prefs = { homePage: "dashboard", sounds: true, vibrations: true };

const loadJSON = <T,>(key: string, fb: T): T => {
  try { return { ...fb, ...JSON.parse(localStorage.getItem(key) || "{}") }; }
  catch { return { ...fb }; }
};

/* ────────── Reusable rows ────────── */
const Row = ({ icon: Icon, label, onClick, danger }: any) => (
  <button onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 px-4 py-3.5 text-left",
      "active:scale-[0.985] transition-transform will-change-transform",
      danger && "text-destructive"
    )}>
    <Icon size={18} className={cn("opacity-80", danger && "text-destructive")} />
    <span className="flex-1 text-sm font-medium">{label}</span>
    <ChevronRight size={16} className="opacity-50" />
  </button>
);

const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <button
    onClick={() => onChange(!value)}
    className={cn(
      "relative h-7 w-12 rounded-full transition-colors duration-200 shrink-0",
      value ? "bg-accent" : "bg-muted"
    )}>
    <div className={cn(
      "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-background shadow transition-transform duration-200",
      value && "translate-x-5"
    )} />
  </button>
);

const SectionLabel = ({ children }: any) => (
  <p className="px-1 pt-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">{children}</p>
);

/* ────────── Sub-screens ────────── */
const ProfileScreen = ({ onBack }: { onBack: () => void }) => {
  const { profile, updateProfile, isDemo } = useProfile();
  const [name, setName] = useState(profile?.name || "");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setName(profile?.name || ""); }, [profile?.name]);

  const save = async () => {
    if (!name.trim() || name === profile?.name) return;
    setSaving(true);
    try { await updateProfile({ name: name.trim() }); toast.success("Perfil atualizado"); }
    catch { toast.error("Erro ao salvar"); }
    finally { setSaving(false); }
  };

  return (
    <ScreenShell title="Perfil" onBack={onBack}>
      <SectionLabel>Informações pessoais</SectionLabel>
      <Field label="Nome">
        <input value={name} onChange={(e) => setName(e.target.value)} onBlur={save}
          className="w-full bg-transparent outline-none text-sm" placeholder="Seu nome" />
      </Field>

      <SectionLabel>Informações de contato</SectionLabel>
      <Field label="E-mail">
        <span className="text-sm text-muted-foreground">{profile?.email || (isDemo ? "demo@sparky.app" : "—")}</span>
      </Field>
      <Field label="Telefone">
        <span className="text-sm text-muted-foreground">{profile?.phone || "Não informado"}</span>
      </Field>

      <SectionLabel>Identificação</SectionLabel>
      <Field label="Código de convite">
        <span className="text-sm tabular-nums font-mono">{profile?.invite_code || "—"}</span>
      </Field>

      <button
        onClick={() => toast.info("Para excluir sua conta, contate o suporte.")}
        className="mt-6 flex items-center gap-2 px-1 text-sm text-destructive font-medium active:scale-95 transition-transform">
        <Trash2 size={16} /> Excluir conta
      </button>
      {saving && <p className="px-1 pt-2 text-[11px] text-muted-foreground">Salvando…</p>}
    </ScreenShell>
  );
};

const PreferencesScreen = ({ onBack }: { onBack: () => void }) => {
  const [prefs, setPrefs] = useState<Prefs>(() => loadJSON(PREFS_KEY, defaultPrefs));
  const [fin, setFin] = useState<FinSettings>(() => loadJSON(SETTINGS_KEY, defaultFin));
  const { theme, toggleTheme } = useTheme();

  const updPref = useCallback(<K extends keyof Prefs>(k: K, v: Prefs[K]) => {
    setPrefs(p => { const u = { ...p, [k]: v }; localStorage.setItem(PREFS_KEY, JSON.stringify(u)); return u; });
  }, []);
  const updFin = useCallback(<K extends keyof FinSettings>(k: K, v: FinSettings[K]) => {
    setFin(p => { const u = { ...p, [k]: v }; localStorage.setItem(SETTINGS_KEY, JSON.stringify(u)); return u; });
  }, []);
  const restore = () => {
    setPrefs(defaultPrefs); setFin(defaultFin);
    localStorage.setItem(PREFS_KEY, JSON.stringify(defaultPrefs));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultFin));
    toast.success("Preferências restauradas");
  };

  return (
    <ScreenShell title="Preferências" onBack={onBack} subtitle="Personalize sua experiência no Sparky"
      headerAction={
        <button onClick={restore}
          className="flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3.5 py-2 text-xs font-medium active:scale-95 transition-transform">
          <RotateCcw size={13} /> Restaurar
        </button>
      }>
      <SectionLabel>Pessoal</SectionLabel>
      <p className="px-1 text-sm font-semibold mb-1">Página inicial</p>
      <p className="px-1 text-[12px] text-muted-foreground leading-relaxed mb-3">
        Define qual tela será exibida ao abrir o Sparky. O Chat permite conversar com a IA, enquanto o Dashboard mostra um resumo visual das suas finanças.
      </p>
      <div className="grid grid-cols-2 gap-2 mb-2">
        {([["chat", MessageCircle, "Chat"], ["dashboard", LayoutGrid, "Dashboard"]] as const).map(([k, Icon, lbl]) => {
          const active = prefs.homePage === k;
          return (
            <button key={k} onClick={() => updPref("homePage", k)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-2xl border py-3.5 text-sm font-medium transition-all active:scale-[0.97]",
                active ? "border-accent bg-accent/10 text-accent-foreground" : "border-border/60 bg-card/60 text-muted-foreground"
              )}>
              <Icon size={16} className={cn(active && "text-accent")} />
              <span className={cn(active && "text-foreground")}>{lbl}</span>
            </button>
          );
        })}
      </div>

      <SectionLabel>Som</SectionLabel>
      <ToggleRow icon={Volume2} title="Habilitar sons"
        desc="Reproduz efeitos sonoros ao receber notificações, alertas e outros eventos."
        value={prefs.sounds} onChange={(v) => updPref("sounds", v)} />
      <ToggleRow icon={Vibrate} title="Habilitar vibrações"
        desc="Ativa o feedback tátil do dispositivo ao receber ações importantes."
        value={prefs.vibrations} onChange={(v) => updPref("vibrations", v)} />

      <SectionLabel>Aparência</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        {([["dark", Moon, "Escuro"], ["light", Sun, "Claro"]] as const).map(([k, Icon, lbl]) => {
          const active = theme === k;
          return (
            <button key={k} onClick={() => { if (theme !== k) toggleTheme(); }}
              className={cn(
                "flex items-center justify-center gap-2 rounded-2xl border py-3.5 text-sm font-medium transition-all active:scale-[0.97]",
                active ? "border-accent bg-accent/10" : "border-border/60 bg-card/60 text-muted-foreground"
              )}>
              <Icon size={16} className={cn(active && "text-accent")} />
              <span className={cn(active && "text-foreground")}>{lbl}</span>
            </button>
          );
        })}
      </div>

      <SectionLabel>Financeiro</SectionLabel>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">Reserva de Segurança</p>
          <span className="text-sm font-bold text-accent tabular-nums">
            {fin.reserveMode === "percent" ? `${fin.reservePercent}%` : (fin.reserveFixed || "R$ 0,00")}
          </span>
        </div>
        <div className="flex gap-1 rounded-xl bg-muted/50 p-1 mb-3">
          {(["percent", "fixed"] as const).map(m => (
            <button key={m} onClick={() => updFin("reserveMode", m)}
              className={cn("flex-1 rounded-lg py-2 text-xs font-medium transition-all active:scale-[0.97]",
                fin.reserveMode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>
              {m === "percent" ? "Porcentagem" : "Valor Fixo"}
            </button>
          ))}
        </div>
        {fin.reserveMode === "percent" ? (
          <input type="range" min={0} max={50} value={fin.reservePercent}
            onChange={(e) => updFin("reservePercent", Number(e.target.value))}
            className="w-full accent-accent h-1.5" />
        ) : (
          <input type="text" inputMode="numeric" placeholder="R$ 0,00" value={fin.reserveFixed}
            onChange={(e) => updFin("reserveFixed", handleBRLChange(e.target.value))}
            className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm outline-none focus:border-accent transition-all tabular-nums" />
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">Peso fim de semana</p>
          <span className="text-sm font-bold text-accent tabular-nums">{fin.weekendWeight.toFixed(1)}x</span>
        </div>
        <input type="range" min={1} max={3} step={0.1} value={fin.weekendWeight}
          onChange={(e) => updFin("weekendWeight", Number(e.target.value))}
          className="w-full accent-accent h-1.5" />
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">Notificações e alertas</p>
          <Toggle value={fin.alertsEnabled} onChange={(v) => updFin("alertsEnabled", v)} />
        </div>
        {fin.alertsEnabled && (
          <div className="space-y-3 pt-2">
            <input type="text" inputMode="numeric" value={fin.lowBalanceAlert}
              placeholder="Alerta de saldo baixo"
              onChange={(e) => updFin("lowBalanceAlert", handleBRLChange(e.target.value))}
              className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm outline-none focus:border-accent transition-all tabular-nums" />
            <ToggleInline label="Aviso de vencimento de fatura" value={fin.invoiceAlert} onChange={(v) => updFin("invoiceAlert", v)} />
            <ToggleInline label="Alerta de data de pagamento" value={fin.dueDateAlert} onChange={(v) => updFin("dueDateAlert", v)} />
          </div>
        )}
      </Card>
    </ScreenShell>
  );
};

const SubscriptionScreen = ({ onBack }: { onBack: () => void }) => (
  <ScreenShell title="Assinatura" onBack={onBack}>
    <Card>
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center">
          <Rocket size={18} className="text-accent" />
        </div>
        <div>
          <p className="text-sm font-bold">Plano Grátis</p>
          <p className="text-[11px] text-muted-foreground">Acesso completo durante o beta</p>
        </div>
      </div>
      <p className="text-[12px] text-muted-foreground leading-relaxed">
        Você está na fase beta do Sparky. Planos pagos serão lançados em breve com benefícios exclusivos.
      </p>
    </Card>
    <button onClick={() => toast.info("Planos pagos em breve")}
      className="w-full rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground active:scale-[0.98] transition-all">
      Ver planos disponíveis
    </button>
  </ScreenShell>
);

const SecurityScreen = ({ onBack }: { onBack: () => void }) => {
  const [bio, setBio] = useState(() => localStorage.getItem("sparky-biometric") === "true");
  const handlePass = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user?.email) { toast.error("Sem e-mail vinculado"); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(data.user.email);
    if (error) toast.error("Erro ao enviar e-mail");
    else toast.success("Link de redefinição enviado para seu e-mail");
  };
  const toggleBio = (v: boolean) => {
    setBio(v); localStorage.setItem("sparky-biometric", String(v));
    toast.success(v ? "Biometria ativada" : "Biometria desativada");
  };
  return (
    <ScreenShell title="Segurança" onBack={onBack}>
      <Row icon={Lock} label="Alterar senha" onClick={handlePass} />
      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 px-4 py-3.5">
        <Fingerprint size={18} className="opacity-80" />
        <span className="flex-1 text-sm font-medium">Biometria</span>
        <Toggle value={bio} onChange={toggleBio} />
      </div>
    </ScreenShell>
  );
};

/* ────────── Building blocks ────────── */
const ScreenShell = ({ title, subtitle, onBack, headerAction, children }: any) => (
  <div className="px-5 pb-12 space-y-3">
    <div className="flex items-center justify-between pt-2">
      <button onClick={onBack}
        className="h-10 w-10 rounded-full bg-card border border-border/60 flex items-center justify-center active:scale-95 transition-transform">
        <ArrowLeft size={18} />
      </button>
      {headerAction}
    </div>
    <div className="pt-1">
      <h1 className="text-3xl font-display font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </div>
    <div className="space-y-2.5 pt-3">{children}</div>
  </div>
);

const Card = ({ children }: any) => (
  <div className="rounded-2xl border border-border/60 bg-card/60 p-4">{children}</div>
);

const Field = ({ label, children }: any) => (
  <div className="space-y-1.5">
    <label className="px-1 text-[12px] text-muted-foreground">{label}</label>
    <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3.5 min-h-[52px] flex items-center">
      {children}
    </div>
  </div>
);

const ToggleRow = ({ icon: Icon, title, desc, value, onChange }: any) => (
  <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/60 px-4 py-3.5">
    <div className="h-9 w-9 rounded-xl bg-muted/60 flex items-center justify-center shrink-0 mt-0.5">
      <Icon size={16} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-[12px] text-muted-foreground leading-snug mt-0.5">{desc}</p>
    </div>
    <Toggle value={value} onChange={onChange} />
  </div>
);

const ToggleInline = ({ label, value, onChange }: any) => (
  <div className="flex items-center justify-between">
    <span className="text-sm">{label}</span>
    <Toggle value={value} onChange={onChange} />
  </div>
);

/* ────────── Root settings screen ────────── */
const RootScreen = ({ onClose, navigate }: { onClose: () => void; navigate: (s: Screen) => void }) => {
  const { profile, isDemo } = useProfile();
  const { members } = useGroupMembers();
  const { clearAll } = useFinancialData();
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const memberCount = useMemo(() => members?.length ?? 1, [members]);

  const initials = useMemo(() => {
    const n = profile?.name || "?"; return n.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
  }, [profile?.name]);

  const handleClear = async () => {
    await clearAll(); setConfirmClear(false);
    toast.success("Todos os dados foram apagados");
    onClose(); setTimeout(() => window.location.reload(), 500);
  };
  const handleLogout = async () => {
    setConfirmLogout(false);
    if (isDemo) localStorage.removeItem("sparky-demo-mode");
    else await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="px-5 pb-16 space-y-5">
      <div className="flex items-center justify-between pt-2">
        <button onClick={onClose}
          className="h-10 w-10 rounded-full bg-card border border-border/60 flex items-center justify-center active:scale-95 transition-transform">
          <ArrowLeft size={18} />
        </button>
      </div>

      {/* Hero */}
      <div className="flex flex-col items-center pt-2">
        <div className="relative">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.name}
              className="h-24 w-24 rounded-full object-cover border-2 border-border" />
          ) : (
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-bold text-primary-foreground">
              {initials}
            </div>
          )}
          <button onClick={() => navigate("profile")}
            className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-card border border-border flex items-center justify-center active:scale-90 transition-transform">
            <Pencil size={13} />
          </button>
        </div>
        <h2 className="mt-3 text-xl font-display font-bold tracking-tight">{profile?.name || "Usuário"}</h2>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <button onClick={() => navigate("subscription")}
          className="rounded-2xl border border-border/60 bg-card/60 p-4 text-left active:scale-[0.98] transition-transform">
          <Rocket size={16} className="text-accent mb-3" />
          <p className="text-base font-bold">Grátis</p>
          <p className="text-[12px] text-muted-foreground">Plano</p>
        </button>
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
          <Users size={16} className="text-primary mb-3" />
          <p className="text-base font-bold">{memberCount} {memberCount === 1 ? "Membro" : "Membros"}</p>
          <p className="text-[12px] text-muted-foreground">Grupo</p>
        </div>
      </div>

      {/* Avalie */}
      <button
        onClick={() => {
          if (navigator.share) navigator.share({ title: "Sparky Finance", url: window.location.origin }).catch(() => {});
          else { navigator.clipboard.writeText(window.location.origin); toast.success("Link copiado!"); }
        }}
        className="w-full flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 px-4 py-3.5 active:scale-[0.985] transition-transform">
        <Star size={18} className="text-accent" />
        <span className="flex-1 text-sm font-medium text-left">Avalie o Sparky</span>
        <ChevronRight size={16} className="opacity-50" />
      </button>

      {/* Geral */}
      <div className="space-y-2.5">
        <SectionLabel>Geral</SectionLabel>
        <Row icon={User} label="Perfil" onClick={() => navigate("profile")} />
        <Row icon={SlidersHorizontal} label="Preferências" onClick={() => navigate("preferences")} />
        <Row icon={CreditCard} label="Assinatura" onClick={() => navigate("subscription")} />
        <Row icon={KeyRound} label="Convite e grupo" onClick={() => {
          if (profile?.invite_code) {
            navigator.clipboard.writeText(profile.invite_code);
            toast.success(`Código ${profile.invite_code} copiado`);
          }
        }} />
      </div>

      {/* Segurança */}
      <div className="space-y-2.5">
        <SectionLabel>Segurança</SectionLabel>
        <Row icon={Lock} label="Alterar senha" onClick={() => navigate("security")} />
        <Row icon={Fingerprint} label="Biometria" onClick={() => navigate("security")} />
      </div>

      {/* Dados */}
      <div className="space-y-2.5">
        <SectionLabel>Dados</SectionLabel>
        <Row icon={Trash2} label="Limpar todos os dados" danger onClick={() => setConfirmClear(true)} />
      </div>

      {/* Logout */}
      <button onClick={() => setConfirmLogout(true)}
        className="w-full mt-4 flex items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 py-3.5 text-sm font-semibold text-destructive active:scale-[0.98] transition-transform">
        <LogOut size={16} /> Sair da conta
      </button>

      {/* Modals */}
      {confirmClear && (
        <ConfirmDialog
          icon={AlertTriangle} title="Apagar todos os dados?"
          desc="Esta ação é permanente e remove todas as despesas, receitas e cofrinhos."
          confirmLabel="Apagar tudo" danger onConfirm={handleClear} onCancel={() => setConfirmClear(false)} />
      )}
      {confirmLogout && (
        <ConfirmDialog
          icon={LogOut} title="Sair da conta?"
          desc="Você precisará fazer login novamente."
          confirmLabel="Sair" onConfirm={handleLogout} onCancel={() => setConfirmLogout(false)} />
      )}
    </div>
  );
};

const ConfirmDialog = ({ icon: Icon, title, desc, confirmLabel, danger, onConfirm, onCancel }: any) => (
  <div className="fixed inset-0 z-[80] flex items-center justify-center px-6">
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative w-full max-w-sm rounded-3xl bg-card border border-border p-6 space-y-4 animate-scale-in">
      <div className="flex items-center gap-3">
        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", danger ? "bg-destructive/15" : "bg-accent/15")}>
          <Icon size={18} className={cn(danger ? "text-destructive" : "text-accent")} />
        </div>
        <h3 className="text-base font-bold">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 rounded-2xl border border-border py-3 text-sm font-medium active:scale-[0.97] transition-all">
          Cancelar
        </button>
        <button onClick={onConfirm}
          className={cn("flex-1 rounded-2xl py-3 text-sm font-semibold active:scale-[0.97] transition-all",
            danger ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground")}>
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

/* ────────── Modal shell ────────── */
const SettingsModal = ({ open, onClose }: Props) => {
  const [screen, setScreen] = useState<Screen>("root");
  useDockVisibility(open);
  useEffect(() => { if (open) setScreen("root"); }, [open]);

  if (!open) return null;

  const content = (
    <div className="fixed inset-0 z-[60] bg-background overflow-y-auto"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="max-w-lg mx-auto animate-in fade-in duration-200">
        {screen === "root" && <RootScreen onClose={onClose} navigate={setScreen} />}
        {screen === "profile" && <ProfileScreen onBack={() => setScreen("root")} />}
        {screen === "preferences" && <PreferencesScreen onBack={() => setScreen("root")} />}
        {screen === "subscription" && <SubscriptionScreen onBack={() => setScreen("root")} />}
        {screen === "security" && <SecurityScreen onBack={() => setScreen("root")} />}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default SettingsModal;
