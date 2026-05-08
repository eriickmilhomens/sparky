import { useState, useCallback, useEffect, useRef } from "react";
import { seedDemoData } from "@/utils/demoSeed";
import { Mail, Lock, Eye, EyeOff, RefreshCw, Phone, ChevronDown, Apple, Fingerprint, ArrowLeft, Loader2, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { syncLocalDataOwner } from "@/lib/userLocalData";
import { isSessionRemembered, isSessionExpired, markSessionRemembered, clearRememberedSession } from "@/lib/sessionTimer";

const BIO_KEY = "sparky-bio-credential";

const keepAliveCheck = async (manual = false) => {
  try {
    const { error } = await supabase.from("profiles").select("id").limit(1);
    if (error) throw error;
    if (manual) toast.success("Conexão validada com sucesso.");
  } catch {
    if (manual) toast.error("Erro de conexão. O banco pode estar em espera.");
  }
};

const COUNTRIES = [
  { code: "+55", flag: "🇧🇷", name: "Brasil" },
  { code: "+1", flag: "🇺🇸", name: "EUA" },
  { code: "+351", flag: "🇵🇹", name: "Portugal" },
  { code: "+44", flag: "🇬🇧", name: "Reino Unido" },
  { code: "+34", flag: "🇪🇸", name: "Espanha" },
];

const formatBRPhone = (raw: string) => {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

type Step = "phone" | "otp" | "email" | "welcome" | "biometric";

const Login = () => {
  const [step, setStep] = useState<Step>("phone");
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [showCountry, setShowCountry] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [hasBio, setHasBio] = useState(false);
  const [bioSupported, setBioSupported] = useState(false);
  const [welcomeUser, setWelcomeUser] = useState<{ id: string; name: string; avatar: string | null } | null>(null);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setHasBio(!!localStorage.getItem(BIO_KEY));
    // Check WebAuthn + platform authenticator availability
    (async () => {
      try {
        if (window.PublicKeyCredential && (PublicKeyCredential as any).isUserVerifyingPlatformAuthenticatorAvailable) {
          const ok = await (PublicKeyCredential as any).isUserVerifyingPlatformAuthenticatorAvailable();
          setBioSupported(!!ok);
        }
      } catch { setBioSupported(false); }
    })();

    if (localStorage.getItem("sparky-demo-mode") === "true") return;
    if (isSessionExpired()) {
      clearRememberedSession();
      supabase.auth.signOut().catch(() => {});
      return;
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (localStorage.getItem("sparky-demo-mode") === "true") return;
      if (session?.user && isSessionRemembered() && step === "phone") {
        syncLocalDataOwner(session.user.id);
        navigate("/", { replace: true });
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (localStorage.getItem("sparky-demo-mode") === "true") return;
      if (session?.user && isSessionRemembered() && step === "phone") {
        syncLocalDataOwner(session.user.id);
        navigate("/", { replace: true });
      }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  useEffect(() => { keepAliveCheck(); }, []);

  const handleLogoTap = useCallback(async () => {
    const newCount = tapCount + 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (newCount >= 7) {
      localStorage.setItem("sparky-demo-mode", "true");
      await supabase.auth.signOut().catch(() => {});
      seedDemoData();
      toast.success("Modo Demo ativado!");
      setTapCount(0);
      navigate("/");
      return;
    }
    setTapCount(newCount);
    tapTimerRef.current = setTimeout(() => setTapCount(0), 2000);
  }, [tapCount, navigate]);

  const activateBiometric = async (userId: string) => {
    if (!bioSupported) { toast.error("Biometria não disponível neste dispositivo."); return false; }
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const cred = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Sparky Finance" },
          user: {
            id: new TextEncoder().encode(userId),
            name: userId,
            displayName: "Sparky",
          },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
          authenticatorSelection: { userVerification: "required", residentKey: "preferred", authenticatorAttachment: "platform" },
          timeout: 60000,
        },
      }) as PublicKeyCredential | null;
      if (cred) {
        localStorage.setItem(BIO_KEY, JSON.stringify({ id: cred.id, userId, ts: Date.now() }));
        toast.success("Biometria ativada!");
        return true;
      }
      return false;
    } catch (e: any) {
      toast.error(e?.name === "NotAllowedError" ? "Permissão negada para biometria." : "Não foi possível ativar a biometria.");
      return false;
    }
  };

  const finishLogin = (userId: string) => {
    localStorage.removeItem("sparky-demo-mode");
    syncLocalDataOwner(userId);
    markSessionRemembered();
    navigate("/", { replace: true });
  };

  const onAuthSuccess = async (userId: string) => {
    // Fetch profile for welcome screen
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, avatar_url")
      .eq("user_id", userId)
      .maybeSingle();
    setWelcomeUser({
      id: userId,
      name: profile?.name?.split(" ")[0] || "amigo",
      avatar: profile?.avatar_url ?? null,
    });
    setStep("welcome");
  };

  const handleBiometric = async () => {
    const stored = localStorage.getItem(BIO_KEY);
    if (!stored || !window.PublicKeyCredential) {
      toast.error("Biometria não disponível.");
      return;
    }
    try {
      const { id } = JSON.parse(stored);
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const padded = id.replace(/-/g, "+").replace(/_/g, "/");
      const rawId = Uint8Array.from(atob(padded.padEnd(padded.length + (4 - padded.length % 4) % 4, "=")), c => c.charCodeAt(0));
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{ id: rawId, type: "public-key" }],
          userVerification: "required",
          timeout: 60000,
        },
      });
      if (!assertion) throw new Error();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        finishLogin(session.user.id);
      } else {
        toast.error("Sessão expirada. Faça login novamente.");
        localStorage.removeItem(BIO_KEY);
        setHasBio(false);
      }
    } catch (e: any) {
      toast.error(e?.name === "NotAllowedError" ? "Autenticação cancelada." : "Falha na autenticação biométrica.");
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8) { toast.error("Número inválido"); return; }
    setLoading(true);
    try {
      const fullPhone = `${country.code}${digits}`;
      const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
      if (error) throw error;
      toast.success("Código enviado por SMS");
      setStep("otp");
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível enviar o código.");
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) { toast.error("Digite o código de 6 dígitos"); return; }
    setLoading(true);
    try {
      const fullPhone = `${country.code}${phone.replace(/\D/g, "")}`;
      const { data, error } = await supabase.auth.verifyOtp({ phone: fullPhone, token: otp, type: "sms" });
      if (error) throw error;
      if (data.user) await onAuthSuccess(data.user.id);
    } catch (err: any) {
      toast.error(err?.message || "Código inválido");
    } finally { setLoading(false); }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Preencha todos os campos"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos" : error.message);
      } else if (data.user) {
        await onAuthSuccess(data.user.id);
      }
    } catch {
      toast.error("Erro ao fazer login");
    } finally { setLoading(false); }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
      if (result.error) { toast.error("Falha no login social"); return; }
      if (result.redirected) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) await onAuthSuccess(session.user.id);
    } catch {
      toast.error("Erro no login social");
    } finally { setLoading(false); }
  };

  const handleWelcomeContinue = () => {
    if (!welcomeUser) return;
    if (bioSupported && !localStorage.getItem(BIO_KEY)) {
      setStep("biometric");
    } else {
      finishLogin(welcomeUser.id);
    }
  };

  const handleActivateBio = async () => {
    if (!welcomeUser) return;
    setLoading(true);
    await activateBiometric(welcomeUser.id);
    setLoading(false);
    finishLogin(welcomeUser.id);
  };

  return (
    <div
      className="bg-background flex flex-col items-center px-6 relative overflow-hidden"
      style={{ minHeight: "100dvh", paddingTop: "calc(env(safe-area-inset-top, 20px) + 32px)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
    >
      {/* Ambient glow */}
      <div className="absolute top-[-20%] right-[-15%] w-[55vw] h-[55vw] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-15%] w-[45vw] h-[45vw] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      {/* WELCOME STEP */}
      {step === "welcome" && welcomeUser && (
        <div className="flex-1 w-full max-w-sm flex flex-col items-center justify-center gap-6 relative z-10 fade-in-up">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl" />
            <div className="relative w-28 h-28 rounded-full overflow-hidden border border-white/10 bg-card/60 backdrop-blur-xl shadow-2xl">
              {welcomeUser.avatar ? (
                <img src={welcomeUser.avatar} alt={welcomeUser.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-display font-bold text-primary">
                  {welcomeUser.name[0]?.toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-display font-bold tracking-tight">Boas vindas, {welcomeUser.name}!</h1>
            <p className="text-sm text-muted-foreground">Tudo certo para começar.</p>
          </div>
          <button
            onClick={handleWelcomeContinue}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground text-sm font-display font-semibold active:scale-[0.98] transition-transform"
          >
            Continuar
          </button>
        </div>
      )}

      {/* BIOMETRIC ACTIVATION STEP */}
      {step === "biometric" && (
        <div className="flex-1 w-full max-w-sm flex flex-col items-center justify-center gap-6 relative z-10 fade-in-up">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl" />
            <div className="relative w-24 h-24 rounded-3xl border border-white/10 bg-card/60 backdrop-blur-xl flex items-center justify-center shadow-2xl">
              <Fingerprint size={44} className="text-primary" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-xl font-display font-bold tracking-tight">Usar Face ID / Biometria<br/>para entrar mais rápido?</h1>
            <p className="text-xs text-muted-foreground max-w-[280px] mx-auto">Próximos acessos liberados com um toque.</p>
          </div>
          <div className="w-full space-y-2.5">
            <button
              onClick={handleActivateBio}
              disabled={loading}
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground text-sm font-display font-semibold active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> Ativar</>}
            </button>
            <button
              onClick={() => welcomeUser && finishLogin(welcomeUser.id)}
              className="w-full h-12 rounded-2xl text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Agora não
            </button>
          </div>
        </div>
      )}

      {/* AUTH STEPS (phone/otp/email) */}
      {(step === "phone" || step === "otp" || step === "email") && (
        <>
          <div className="flex flex-col items-center gap-4 mb-8 fade-in-up relative z-10">
            <button
              type="button"
              onClick={handleLogoTap}
              className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card/60 border border-white/10 backdrop-blur-xl active:scale-95 transition-all shadow-lg"
            >
              {step === "email" ? <Mail size={26} className="text-foreground" /> : <Phone size={26} className="text-foreground" />}
            </button>
            <div className="text-center space-y-1.5">
              <h1 className="text-xl font-display font-bold tracking-tight">
                {step === "otp" ? "Confirme o código" : step === "email" ? "Entre com seu e-mail" : "Comece com seu celular"}
              </h1>
              <p className="text-xs text-muted-foreground max-w-[280px]">
                {step === "otp"
                  ? `Enviamos um código para ${country.code} ${phone}`
                  : step === "email"
                  ? "Use seu e-mail @sparky.app"
                  : "Receba um código por SMS para entrar com segurança"}
              </p>
            </div>
            {tapCount >= 3 && tapCount < 7 && (
              <p className="text-[10px] text-muted-foreground/50 animate-pulse">{7 - tapCount} toques para modo demo</p>
            )}
          </div>

          <div className="w-full max-w-sm relative z-10 fade-in-up stagger-1">
            {step === "phone" && (
              <form onSubmit={handleSendOtp} className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCountry(v => !v)}
                      className="h-14 flex items-center gap-1.5 rounded-2xl border border-white/10 bg-card/40 backdrop-blur-xl px-3 text-sm font-medium hover:border-white/20 transition-colors"
                    >
                      <span className="text-base">{country.flag}</span>
                      <span className="tabular-nums">{country.code}</span>
                      <ChevronDown size={14} className="text-muted-foreground" />
                    </button>
                    {showCountry && (
                      <div className="absolute top-full left-0 mt-1.5 w-44 rounded-2xl border border-white/10 bg-card/95 backdrop-blur-xl shadow-xl z-20 overflow-hidden">
                        {COUNTRIES.map(c => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => { setCountry(c); setShowCountry(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
                          >
                            <span>{c.flag}</span>
                            <span className="tabular-nums w-12">{c.code}</span>
                            <span className="text-muted-foreground text-xs truncate">{c.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="(11) 99999-9999"
                    value={country.code === "+55" ? formatBRPhone(phone) : phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 h-14 rounded-2xl border border-white/10 bg-card/40 backdrop-blur-xl px-4 text-sm tabular-nums outline-none placeholder:text-muted-foreground focus:border-primary/50 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 rounded-2xl bg-primary text-primary-foreground text-sm font-display font-semibold transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : "Continuar"}
                </button>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full h-14 rounded-2xl border border-white/10 bg-card/40 backdrop-blur-xl px-4 text-center text-lg font-display font-bold tabular-nums tracking-[0.5em] outline-none focus:border-primary/50 transition-all"
                />
                <button type="submit" disabled={loading} className="w-full h-14 rounded-2xl bg-primary text-primary-foreground text-sm font-display font-semibold active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : "Confirmar"}
                </button>
                <button type="button" onClick={() => setStep("phone")} className="w-full text-xs text-muted-foreground flex items-center justify-center gap-1 py-2">
                  <ArrowLeft size={12} /> Trocar número
                </button>
              </form>
            )}

            {step === "email" && (
              <form onSubmit={handleEmailLogin} className="space-y-3">
                <div className="relative">
                  <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="email" placeholder="seu@sparky.app" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-14 rounded-2xl border border-white/10 bg-card/40 backdrop-blur-xl pl-11 pr-4 text-sm outline-none focus:border-primary/50 transition-all" />
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type={showPw ? "text" : "password"} placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-14 rounded-2xl border border-white/10 bg-card/40 backdrop-blur-xl pl-11 pr-12 text-sm outline-none focus:border-primary/50 transition-all" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <button type="submit" disabled={loading} className="w-full h-14 rounded-2xl bg-primary text-primary-foreground text-sm font-display font-semibold active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : "Entrar"}
                </button>
                <button type="button" onClick={() => setStep("phone")} className="w-full text-xs text-muted-foreground flex items-center justify-center gap-1 py-2">
                  <ArrowLeft size={12} /> Voltar
                </button>
              </form>
            )}

            {step !== "otp" && (
              <>
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground/70">Ou</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => handleOAuth("apple")}
                    disabled={loading}
                    className="w-full h-13 py-3.5 rounded-2xl border border-white/10 bg-card/30 backdrop-blur-xl text-sm font-medium flex items-center justify-center gap-3 hover:border-white/20 transition-colors active:scale-[0.98]"
                  >
                    <Apple size={16} className="text-foreground" />
                    Continuar com Apple
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOAuth("google")}
                    disabled={loading}
                    className="w-full h-13 py-3.5 rounded-2xl border border-white/10 bg-card/30 backdrop-blur-xl text-sm font-medium flex items-center justify-center gap-3 hover:border-white/20 transition-colors active:scale-[0.98]"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Continuar com Google
                  </button>
                  {step !== "email" && (
                    <button
                      type="button"
                      onClick={() => setStep("email")}
                      className="w-full h-13 py-3.5 rounded-2xl border border-white/10 bg-card/30 backdrop-blur-xl text-sm font-medium flex items-center justify-center gap-3 hover:border-white/20 transition-colors active:scale-[0.98]"
                    >
                      <Mail size={16} />
                      Logar com seu E-mail
                    </button>
                  )}
                  {hasBio && bioSupported && (
                    <button
                      type="button"
                      onClick={handleBiometric}
                      className="w-full h-13 py-3.5 rounded-2xl border border-primary/40 bg-primary/5 backdrop-blur-xl text-sm font-medium flex items-center justify-center gap-3 active:scale-[0.98] text-primary"
                    >
                      <Fingerprint size={16} />
                      Entrar com biometria
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="mt-auto pt-8 flex flex-col items-center gap-3 relative z-10">
            <p className="text-[10px] text-muted-foreground/70 text-center max-w-[280px] leading-relaxed">
              Ao continuar, você aceita os{" "}
              <button className="underline underline-offset-2 hover:text-foreground transition-colors">Termos de Uso</button>{" "}
              e a{" "}
              <button className="underline underline-offset-2 hover:text-foreground transition-colors">Política de Privacidade</button>.
            </p>
            <button
              type="button"
              onClick={() => keepAliveCheck(true)}
              className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              <RefreshCw size={10} />
              Acordar Banco
            </button>
            <button onClick={() => navigate("/onboarding")} className="text-[11px] text-muted-foreground">
              Não tem conta? <span className="text-primary font-semibold">Criar conta</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Login;
