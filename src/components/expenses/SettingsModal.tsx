import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  ArrowLeft, Pencil, Star, ChevronRight, User, SlidersHorizontal,
  CreditCard, KeyRound, Lock, Fingerprint, LogOut, Trash2,
  AlertTriangle, RotateCcw, MessageCircle, LayoutGrid, Volume2,
  Vibrate, Sun, Moon, Rocket, Users, Copy, Share2, Camera, ZoomIn, Check, X,
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

type Screen = "root" | "profile" | "preferences" | "subscription" | "security" | "invite";

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
  const [busy, setBusy] = useState(false);

  const handlePass = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      if (!email) {
        toast.error("Sua conta não tem e-mail vinculado");
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) toast.error("Não foi possível enviar o e-mail");
      else toast.success(`Link enviado para ${email}`);
    } catch {
      toast.error("Erro inesperado");
    } finally {
      setBusy(false);
    }
  };

  const toggleBio = async (v: boolean) => {
    if (!v) {
      setBio(false);
      localStorage.removeItem("sparky-biometric");
      localStorage.removeItem("sparky-biometric-cred");
      toast.success("Biometria desativada");
      return;
    }
    try {
      if (typeof window === "undefined" || !window.PublicKeyCredential) {
        toast.error("Biometria não suportada neste dispositivo");
        return;
      }
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        toast.error("Nenhum sensor biométrico disponível");
        return;
      }
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id || "demo-user";
      const userName = data.user?.email || "Sparky";
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userIdBytes = new TextEncoder().encode(userId);
      const cred = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Sparky Finance" },
          user: { id: userIdBytes, name: userName, displayName: userName },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "preferred",
          },
          timeout: 60000,
          attestation: "none",
        },
      }) as PublicKeyCredential | null;
      if (!cred) throw new Error("cancel");
      localStorage.setItem("sparky-biometric", "true");
      localStorage.setItem("sparky-biometric-cred", cred.id);
      setBio(true);
      toast.success("Biometria ativada");
    } catch (err: any) {
      const msg = err?.name === "NotAllowedError" ? "Autenticação cancelada" : "Falha ao ativar biometria";
      toast.error(msg);
    }
  };

  return (
    <ScreenShell title="Segurança" onBack={onBack}>
      <button onClick={handlePass} disabled={busy}
        className={cn(
          "w-full flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 px-4 py-3.5 text-left",
          "active:scale-[0.985] transition-transform disabled:opacity-60"
        )}>
        <Lock size={18} className="opacity-80" />
        <span className="flex-1 text-sm font-medium">{busy ? "Enviando…" : "Alterar senha"}</span>
        <ChevronRight size={16} className="opacity-50" />
      </button>
      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 px-4 py-3.5">
        <Fingerprint size={18} className="opacity-80" />
        <span className="flex-1 text-sm font-medium">Biometria</span>
        <Toggle value={bio} onChange={toggleBio} />
      </div>
      <p className="px-1 pt-1 text-[11px] text-muted-foreground leading-relaxed">
        A biometria usa o sensor do seu dispositivo (Face ID, Touch ID ou impressão digital) para acelerar o login.
      </p>
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

/* ────────── Invite & group screen ────────── */
const InviteScreen = ({ onBack }: { onBack: () => void }) => {
  const { profile } = useProfile();
  const { members, leader, isLeader } = useGroupMembers();
  const code = profile?.invite_code || "—";
  const inviteUrl = `${window.location.origin}/onboarding?code=${code}`;

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado");
  };
  const shareInvite = async () => {
    const text = `Entre no meu grupo no Sparky com o código ${code}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Convite Sparky", text, url: inviteUrl }); } catch {}
    } else {
      navigator.clipboard.writeText(`${text}\n${inviteUrl}`);
      toast.success("Convite copiado");
    }
  };

  return (
    <ScreenShell title="Convite e grupo" onBack={onBack} subtitle="Compartilhe seu código e veja quem está no grupo">
      <SectionLabel>Seu código</SectionLabel>
      <Card>
        <p className="text-[11px] text-muted-foreground mb-2">Use este código para convidar pessoas para o seu grupo financeiro.</p>
        <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3 mb-3">
          <span className="font-mono text-lg font-bold tracking-widest">{code}</span>
          <button onClick={copyCode} className="rounded-lg p-2 hover:bg-muted active:scale-95 transition-transform">
            <Copy size={16} />
          </button>
        </div>
        <button onClick={shareInvite}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground active:scale-[0.98] transition-transform">
          <Share2 size={15} /> Compartilhar convite
        </button>
      </Card>

      <SectionLabel>Membros ({members.length})</SectionLabel>
      <div className="space-y-2">
        {members.map((m) => {
          const lead = isLeader(m);
          const ini = (m.name || "?").split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
          return (
            <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 px-4 py-3">
              {m.avatar_url ? (
                <img src={m.avatar_url} alt={m.name} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-primary-foreground">{ini}</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{m.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{m.email || "—"}</p>
              </div>
              <span className={cn("text-[10px] font-semibold rounded-full px-2 py-0.5",
                lead ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground")}>
                {lead ? "Líder" : "Membro"}
              </span>
            </div>
          );
        })}
      </div>
    </ScreenShell>
  );
};
/* ────────── Root settings screen ────────── */
const RootScreen = ({ onClose, navigate }: { onClose: () => void; navigate: (s: Screen) => void }) => {
  const { profile, updateProfile, isDemo } = useProfile();
  const { members } = useGroupMembers();
  const { clearAll } = useFinancialData();
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 10MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.onerror = () => toast.error("Não foi possível ler a imagem");
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = async (dataUrl: string) => {
    setCropSrc(null);
    setUploading(true);
    try {
      await updateProfile({ avatar_url: dataUrl });
      toast.success("Foto atualizada");
    } catch {
      toast.error("Erro ao atualizar foto");
    } finally {
      setUploading(false);
    }
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
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFilePick} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-accent text-accent-foreground border border-border flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50">
            <Camera size={13} />
          </button>
        </div>
        <h2 className="mt-3 text-xl font-display font-bold tracking-tight">{profile?.name || "Usuário"}</h2>
        {uploading && <p className="text-[11px] text-muted-foreground mt-1">Enviando…</p>}
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

      {/* Itens — prioridades de conta primeiro, depois conveniência, depois dados */}
      <div className="space-y-2.5">
        <Row icon={User} label="Perfil" onClick={() => navigate("profile")} />
        <Row icon={SlidersHorizontal} label="Preferências" onClick={() => navigate("preferences")} />
        <Row icon={Lock} label="Segurança e senha" onClick={() => navigate("security")} />
        <Row icon={Fingerprint} label="Biometria" onClick={() => navigate("security")} />
      </div>

      <div className="space-y-2.5">
        <Row icon={KeyRound} label="Convite e grupo" onClick={() => navigate("invite")} />
        <Row icon={CreditCard} label="Assinatura" onClick={() => navigate("subscription")} />
        <Row icon={Star} label="Avalie o Sparky" onClick={() => setReviewOpen(true)} />
      </div>

      <div className="space-y-2.5">
        <Row icon={Trash2} label="Limpar todos os dados" danger onClick={() => setConfirmClear(true)} />
      </div>

      {/* Logout */}
      <button onClick={() => setConfirmLogout(true)}
        className="w-full mt-4 flex items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 py-3.5 text-sm font-semibold text-destructive active:scale-[0.98] transition-transform">
        <LogOut size={16} /> Sair da conta
      </button>

      {/* Modals */}
      {cropSrc && (
        <AvatarCropper src={cropSrc} onCancel={() => setCropSrc(null)} onConfirm={handleCropConfirm} />
      )}
      {reviewOpen && (
        <ReviewModal onClose={() => setReviewOpen(false)} />
      )}
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

/* ────────── Avatar cropper ────────── */
const AvatarCropper = ({ src, onCancel, onConfirm }: { src: string; onCancel: () => void; onConfirm: (d: string) => void }) => {
  const FRAME = 280;
  const OUTPUT = 400;
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ active: boolean; sx: number; sy: number; ox: number; oy: number }>({ active: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  const pinch = useRef<{ active: boolean; dist: number; baseScale: number }>({ active: false, dist: 0, baseScale: 1 });

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const i = e.currentTarget;
    setNatural({ w: i.naturalWidth, h: i.naturalHeight });
    const min = FRAME / Math.min(i.naturalWidth, i.naturalHeight);
    setMinScale(min);
    setScale(min);
    setOffset({
      x: (FRAME - i.naturalWidth * min) / 2,
      y: (FRAME - i.naturalHeight * min) / 2,
    });
    setLoaded(true);
  };

  const clamp = (s: number, x: number, y: number) => {
    const dispW = natural.w * s;
    const dispH = natural.h * s;
    const minX = FRAME - dispW;
    const minY = FRAME - dispH;
    return {
      x: Math.min(0, Math.max(minX, x)),
      y: Math.min(0, Math.max(minY, y)),
    };
  };

  const setScaleAround = (newScale: number, cx = FRAME / 2, cy = FRAME / 2) => {
    const ns = Math.max(minScale, Math.min(minScale * 4, newScale));
    const k = ns / scale;
    const nx = cx - (cx - offset.x) * k;
    const ny = cy - (cy - offset.y) * k;
    const c = clamp(ns, nx, ny);
    setScale(ns);
    setOffset(c);
  };

  const pointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    drag.current = { active: true, sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y };
  };
  const pointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.sx;
    const dy = e.clientY - drag.current.sy;
    setOffset(clamp(scale, drag.current.ox + dx, drag.current.oy + dy));
  };
  const pointerUp = (e: React.PointerEvent) => {
    drag.current.active = false;
    try { (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId); } catch {}
  };
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    setScaleAround(scale * factor, e.clientX - rect.left, e.clientY - rect.top);
  };

  const confirm = () => {
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    // Source rect in image-natural pixels = visible area in frame
    const sx = -offset.x / scale;
    const sy = -offset.y / scale;
    const sSize = FRAME / scale;
    ctx.drawImage(imgRef.current!, sx, sy, sSize, sSize, 0, 0, OUTPUT, OUTPUT);
    onConfirm(canvas.toDataURL("image/jpeg", 0.85));
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-5">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-3xl bg-card border border-border p-5 space-y-4 animate-scale-in">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">Ajustar foto</h3>
          <button onClick={onCancel} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center active:scale-95">
            <X size={16} />
          </button>
        </div>

        <div className="flex justify-center">
          <div
            className="relative rounded-2xl bg-black overflow-hidden touch-none select-none"
            style={{ width: FRAME, height: FRAME }}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerCancel={pointerUp}
            onWheel={onWheel}
          >
            <img
              ref={imgRef}
              src={src}
              alt=""
              draggable={false}
              onLoad={onImgLoad}
              style={{
                position: "absolute",
                left: 0, top: 0,
                transformOrigin: "0 0",
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                width: natural.w || "auto",
                height: natural.h || "auto",
                maxWidth: "none",
                pointerEvents: "none",
              }}
            />
            {/* Circular mask overlay */}
            <div className="pointer-events-none absolute inset-0"
              style={{
                boxShadow: `0 0 0 9999px hsl(var(--background) / 0.6)`,
                clipPath: "circle(50% at 50% 50%)",
                background: "transparent",
              }} />
            <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/80"
              style={{ borderRadius: "50%" }} />
          </div>
        </div>

        <div className="flex items-center gap-3 px-1">
          <ZoomIn size={16} className="opacity-70" />
          <input
            type="range"
            min={minScale}
            max={minScale * 4}
            step={0.001}
            value={scale}
            onChange={(e) => setScaleAround(Number(e.target.value))}
            className="flex-1 accent-accent h-1.5"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onCancel}
            className="flex-1 rounded-2xl border border-border py-3 text-sm font-medium active:scale-[0.97] transition-all">
            Cancelar
          </button>
          <button onClick={confirm} disabled={!loaded}
            className="flex-1 rounded-2xl bg-primary text-primary-foreground py-3 text-sm font-semibold active:scale-[0.97] transition-all flex items-center justify-center gap-1.5 disabled:opacity-60">
            <Check size={16} /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

/* ────────── Review modal ────────── */
const ReviewModal = ({ onClose }: { onClose: () => void }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!rating) { toast.error("Escolha de 1 a 5 estrelas"); return; }
    setSending(true);
    try {
      // Persist locally; backend feedback table is out of scope here
      const log = JSON.parse(localStorage.getItem("sparky-reviews") || "[]");
      log.push({ rating, comment, at: new Date().toISOString() });
      localStorage.setItem("sparky-reviews", JSON.stringify(log));
      if (rating >= 4 && navigator.share) {
        try {
          await navigator.share({
            title: "Sparky Finance",
            text: "Estou usando o Sparky para organizar minhas finanças — recomendo!",
            url: window.location.origin,
          });
        } catch {}
      }
      toast.success("Obrigado pela sua avaliação!");
      onClose();
    } catch {
      toast.error("Não foi possível enviar agora");
    } finally {
      setSending(false);
    }
  };

  const display = hover || rating;
  const labels = ["", "Muito ruim", "Ruim", "Ok", "Boa", "Excelente"];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-3xl bg-card border border-border p-6 space-y-4 animate-scale-in">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">Avalie o Sparky</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center active:scale-95">
            <X size={16} />
          </button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Sua opinião ajuda a melhorar o app. Quantas estrelas você daria?
        </p>
        <div className="flex justify-center gap-1.5 py-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              className="p-1 active:scale-90 transition-transform"
            >
              <Star
                size={32}
                className={cn("transition-colors", n <= display ? "fill-accent text-accent" : "text-muted-foreground/40")}
              />
            </button>
          ))}
        </div>
        <p className="text-center text-xs font-medium text-muted-foreground h-4">
          {labels[display] || ""}
        </p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Conte o que você achou (opcional)"
          rows={3}
          className="w-full rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-sm outline-none focus:border-accent transition resize-none"
        />
        <button
          onClick={submit}
          disabled={sending || !rating}
          className="w-full rounded-2xl bg-primary text-primary-foreground py-3 text-sm font-semibold active:scale-[0.98] transition disabled:opacity-50"
        >
          {sending ? "Enviando…" : "Enviar avaliação"}
        </button>
      </div>
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
        {screen === "invite" && <InviteScreen onBack={() => setScreen("root")} />}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default SettingsModal;
