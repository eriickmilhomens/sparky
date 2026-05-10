import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  ChevronDown, Check, UserPlus, User, Trophy, Crown, Star,
  Settings, Users, LogOut, Gift, Camera, Mail, Calendar, X,
  Image, Sparkles, Clock, Trash2, Shield, MessageSquare, Send, Menu
} from "lucide-react";

interface ProfileSwitcherProps {
  trigger?: "avatar" | "hamburger";
}
import AdminPanel from "@/components/admin/AdminPanel";
import { useDockVisibility } from "@/hooks/useDockVisibility";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { clearRememberedSession } from "@/lib/sessionTimer";
import { toast } from "sonner";

interface Prize {
  name: string;
  cost: number;
  redeemedBy?: string;
  redeemedAt?: string;
}

interface Profile {
  id: string;
  name: string;
  initials: string;
  color: string;
  email: string;
  points: number;
  role: "admin" | "member";
  avatar?: string;
  isOriginal?: boolean;
}

const inspirationalQuotes = [
  "💡 Riqueza não é ter muito, é precisar de pouco.",
  "🚀 Pequenos hábitos financeiros geram grandes resultados.",
  "🎯 Quem controla o dinheiro, controla o futuro.",
  "🌟 Cada centavo economizado é um passo para a liberdade.",
  "🔥 Disciplina hoje, colheita amanhã.",
];

type SubView = null | "profile" | "prizes" | "members" | "ranking" | "admin" | "support";

const ProfileSwitcher = ({ trigger = "avatar" }: ProfileSwitcherProps = {}) => {
  const navigate = useNavigate();
  const { profile: dbProfile, isDemo } = useProfile();
  const { members: groupMembers, isLeader: isGroupLeader } = useGroupMembers();
  const [open, setOpen] = useState(false);
  useDockVisibility(open);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [active, setActive] = useState("");
  const [subView, setSubView] = useState<SubView>(null);
  const [addingProfile, setAddingProfile] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const [allPrizes, setAllPrizes] = useState<Record<string, Prize[]>>({});
  const [showNewPrize, setShowNewPrize] = useState(false);
  const [prizeName, setPrizeName] = useState("");
  const [prizeCost, setPrizeCost] = useState("100");

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  // Image crop state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImgSrc, setCropImgSrc] = useState("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const cropImgRef = useRef<HTMLImageElement>(null);

  // Support chat state
  const [supportMessages, setSupportMessages] = useState<{ from: string; text: string; time: string }[]>([]);
  const [supportInput, setSupportInput] = useState("");
  const [supportClosed, setSupportClosed] = useState(false);
  useEffect(() => {
    if (dbProfile && profiles.length === 0) {
      const initial: Profile = {
        id: dbProfile.id,
        name: dbProfile.name,
        initials: dbProfile.name.charAt(0).toUpperCase(),
        color: "from-primary to-primary/60",
        email: dbProfile.email || "",
        points: dbProfile.points,
        role: dbProfile.role as "admin" | "member",
        avatar: dbProfile.avatar_url || undefined,
        isOriginal: true,
      };
      setProfiles([initial]);
      setActive(dbProfile.id);
    } else if (dbProfile) {
      setProfiles(prev => prev.map(p => p.isOriginal ? {
        ...p,
        name: dbProfile.name,
        email: dbProfile.email || p.email,
        points: dbProfile.points,
        role: dbProfile.role as "admin" | "member",
        avatar: dbProfile.avatar_url || p.avatar,
      } : p));
    }
  }, [dbProfile]);

  // Check for active support ticket
  const hasActiveSupport = (() => {
    try {
      const userId = dbProfile?.user_id;
      if (!userId) return false;
      const key = `sparky-support-chat-${userId}`;
      const msgs = JSON.parse(localStorage.getItem(key) || "[]");
      const status = localStorage.getItem(`sparky-support-status-${userId}`);
      return msgs.length > 0 && status !== "closed";
    } catch { return false; }
  })();

  // Load support messages when opening support view
  useEffect(() => {
    if (subView !== "support") return;
    const userId = dbProfile?.user_id;
    if (!userId) return;
    const key = `sparky-support-chat-${userId}`;
    const msgs = JSON.parse(localStorage.getItem(key) || "[]");
    setSupportMessages(msgs);
    const status = localStorage.getItem(`sparky-support-status-${userId}`);
    setSupportClosed(status === "closed");

    // Poll for new messages
    const interval = setInterval(() => {
      const updated = JSON.parse(localStorage.getItem(key) || "[]");
      setSupportMessages(updated);
      const s = localStorage.getItem(`sparky-support-status-${userId}`);
      if (s === "closed") setSupportClosed(true);
    }, 2000);
    return () => clearInterval(interval);
  }, [subView, dbProfile?.user_id]);

  const handleSendSupportMessage = () => {
    if (!supportInput.trim() || !dbProfile?.user_id || supportClosed) return;
    const msg = { from: "user", text: supportInput, time: new Date().toISOString() };
    const key = `sparky-support-chat-${dbProfile.user_id}`;
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.push(msg);
    localStorage.setItem(key, JSON.stringify(existing));
    // Mark as active
    localStorage.setItem(`sparky-support-status-${dbProfile.user_id}`, "active");
    setSupportMessages(existing);
    setSupportInput("");
  };

  const startSupportTicket = () => {
    if (!dbProfile?.user_id) return;
    localStorage.setItem(`sparky-support-status-${dbProfile.user_id}`, "active");
    openSubView("support");
  };

  const current = profiles.find((p) => p.id === active) || profiles[0];
  const isLoading = !current;
  const prizes = allPrizes[active] || [];

  const setPrizes = (newPrizes: Prize[]) => {
    setAllPrizes(prev => ({ ...prev, [active]: newPrizes }));
  };

  const handleAddProfile = () => {
    if (!newName.trim()) return;
    const id = newName.toLowerCase().replace(/\s/g, "-") + "-" + Date.now();
    const initials = newName.charAt(0).toUpperCase();
    const colors = ["from-emerald-500 to-emerald-500/60", "from-violet-500 to-violet-500/60", "from-cyan-500 to-cyan-500/60", "from-rose-500 to-rose-500/60"];
    const color = colors[profiles.length % colors.length];
    setProfiles([...profiles, { id, name: newName, initials, color, email: newEmail || `${id}@sparky.com`, points: 0, role: "member" }]);
    setActive(id);
    setAddingProfile(false);
    setNewName("");
    setNewEmail("");
  };

  const handleDeleteProfile = (id: string) => {
    const original = profiles.find(p => p.isOriginal);
    if (!original || id === original.id) return;
    setProfiles(prev => prev.filter(p => p.id !== id));
    if (active === id) setActive(original.id);
  };

  const handleAddPrize = () => {
    if (!prizeName.trim()) return;
    const cost = parseInt(prizeCost) || 0;
    setPrizes([...prizes, { name: prizeName, cost }]);
    setPrizeName("");
    setPrizeCost("100");
    setShowNewPrize(false);
  };

  const handleRedeemPrize = (index: number) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const updated = prizes.map((p, i) =>
      i === index ? { ...p, redeemedBy: current.name, redeemedAt: dateStr } : p
    );
    setPrizes(updated);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setCropImgSrc(base64);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const c = centerCrop(
      makeAspectCrop({ unit: "%", width: 80 }, 1, width, height),
      width, height
    );
    setCrop(c);
    setCompletedCrop(c);
  }, []);

  const handleCropSave = useCallback(() => {
    const image = cropImgRef.current;
    if (!image || !completedCrop) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const pixelCrop = {
      x: (completedCrop.x / 100) * image.width * scaleX,
      y: (completedCrop.y / 100) * image.height * scaleY,
      width: (completedCrop.width / 100) * image.width * scaleX,
      height: (completedCrop.height / 100) * image.height * scaleY,
    };

    // Resize to max 500x500 for optimized avatar
    const maxSize = 500;
    const outW = Math.min(pixelCrop.width, maxSize);
    const outH = Math.min(pixelCrop.height, maxSize);

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      image,
      pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
      0, 0, outW, outH
    );
    // Compress to JPEG ~80% quality for small file size
    const croppedBase64 = canvas.toDataURL("image/jpeg", 0.8);
    setProfiles(profiles.map(p => p.id === active ? { ...p, avatar: croppedBase64 } : p));
    setCropModalOpen(false);
    setCropImgSrc("");
  }, [completedCrop, active, profiles]);

  const handleDeletePhoto = () => {
    setProfiles(profiles.map(p => p.id === active ? { ...p, avatar: undefined } : p));
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    closeAll();
    localStorage.removeItem("sparky-demo-mode");
    clearRememberedSession();
    await supabase.auth.signOut();
    navigate("/login");
  };

  const openSubView = (view: SubView) => {
    if (view === "profile") {
      setEditName(current.name);
      setEditEmail(current.email);
    }
    setSubView(view);
    setOpen(false);
  };

  const closeAll = () => {
    setOpen(false);
    setSubView(null);
    setAddingProfile(false);
    setShowNewPrize(false);
    setShowLogoutConfirm(false);
  };

  const renderLayer = (content: ReactNode) => {
    if (typeof document === "undefined") return null;
    return createPortal(content, document.body);
  };

  const renderAvatar = (profile: Profile, size: string, textSize: string) => {
    if (profile.avatar) {
      return <img loading="lazy" decoding="async" src={profile.avatar} alt={profile.name} className={cn(size, "rounded-full object-cover")} />;
    }
    return (
      <div className={cn(size, "rounded-full bg-gradient-to-br flex items-center justify-center font-bold text-white", textSize, profile.color)}>
        {profile.initials}
      </div>
    );
  };

  // Image crop modal
  if (cropModalOpen && cropImgSrc) {
    return renderLayer(
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div className="w-full max-w-sm card-zelo space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Ajustar Foto</h3>
              <p className="text-[10px] text-muted-foreground">Arraste para reposicionar</p>
            </div>
            <button onClick={() => { setCropModalOpen(false); setCropImgSrc(""); }} className="text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          </div>
          <div className="flex items-center justify-center rounded-xl overflow-hidden bg-black/50 max-h-[50vh]">
            <ReactCrop
              crop={crop}
              onChange={(_, pc) => setCrop(pc)}
              onComplete={(_, pc) => setCompletedCrop(pc)}
              aspect={1}
              circularCrop
            >
              <img
                ref={cropImgRef}
                src={cropImgSrc}
                onLoad={onImageLoad}
                className="max-h-[50vh] w-auto"
                alt="Crop"
              />
            </ReactCrop>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setCropModalOpen(false); setCropImgSrc(""); }} className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground active:scale-[0.98]">
              Cancelar
            </button>
            <button onClick={handleCropSave} className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground active:scale-[0.98]">
              Salvar Foto
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Logout confirmation modal
  if (showLogoutConfirm) {
    return renderLayer(
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
        <div className="w-full max-w-sm card-zelo space-y-4 text-center">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-destructive/15">
            <LogOut size={24} className="text-destructive" />
          </div>
          <h3 className="text-lg font-bold">Sair da conta?</h3>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja sair? Você será redirecionado para a tela de login.</p>
          <div className="flex gap-2">
            <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground active:scale-[0.98]">Cancelar</button>
            <button onClick={handleLogout} className="flex-1 rounded-xl bg-destructive py-3 text-sm font-semibold text-destructive-foreground active:scale-[0.98]">Sair</button>
          </div>
        </div>
      </div>,
    );
  }

  // Sub-view: Ranking
  if (subView === "ranking") {
    const sorted = [...groupMembers].sort((a, b) => b.points - a.points);
    const quote = inspirationalQuotes[Math.floor(Math.random() * inspirationalQuotes.length)];
    const renderGroupAvatar = (member: any, size: string, textSize: string) => {
      if (member.avatar_url) {
        return <img loading="lazy" decoding="async" src={member.avatar_url} alt={member.name} className={cn(size, "rounded-full object-cover")} />;
      }
      return (
        <div className={cn(size, "rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center font-bold text-white", textSize)}>
          {member.name?.charAt(0).toUpperCase() || "?"}
        </div>
      );
    };
    return renderLayer(
      <div className="fixed inset-0 z-[80] bg-background/95 backdrop-blur-sm overflow-y-auto" style={{ paddingTop: "env(safe-area-inset-top, 20px)", paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}>
        <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSubView(null)} className="text-muted-foreground hover:text-foreground"><ChevronDown size={20} className="rotate-90" /></button>
            <div>
              <h1 className="text-lg font-bold">Ranking do Grupo</h1>
              <p className="text-xs text-muted-foreground">{sorted.length} membro{sorted.length !== 1 ? "s" : ""} no grupo</p>
            </div>
          </div>

          <div className="card-zelo border-warning/20 bg-warning/5">
            <div className="flex items-start gap-3">
              <Sparkles size={18} className="text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-foreground/80 italic leading-relaxed">{quote}</p>
            </div>
          </div>

          {sorted.length >= 3 && (
            <div className="flex items-end justify-center gap-3 py-4">
              <div className="flex flex-col items-center">
                {renderGroupAvatar(sorted[1], "h-12 w-12", "text-sm")}
                <p className="text-xs font-semibold mt-1">{sorted[1].name}</p>
                <div className="bg-muted rounded-lg px-3 py-1 mt-1">
                  <span className="text-xs font-bold text-warning">{sorted[1].points} pts</span>
                </div>
                <div className="bg-muted/60 rounded-t-lg w-16 h-14 mt-2 flex items-center justify-center text-lg font-bold text-muted-foreground">2º</div>
              </div>
              <div className="flex flex-col items-center">
                <Crown size={16} className="text-warning mb-1" />
                {renderGroupAvatar(sorted[0], "h-14 w-14", "text-base")}
                <p className="text-xs font-bold mt-1">{sorted[0].name}</p>
                <div className="bg-warning/15 rounded-lg px-3 py-1 mt-1">
                  <span className="text-xs font-bold text-warning">{sorted[0].points} pts</span>
                </div>
                <div className="bg-warning/20 rounded-t-lg w-16 h-20 mt-2 flex items-center justify-center text-lg font-bold text-warning">1º</div>
              </div>
              <div className="flex flex-col items-center">
                {renderGroupAvatar(sorted[2], "h-11 w-11", "text-xs")}
                <p className="text-xs font-semibold mt-1">{sorted[2].name}</p>
                <div className="bg-muted rounded-lg px-3 py-1 mt-1">
                  <span className="text-xs font-bold text-warning">{sorted[2].points} pts</span>
                </div>
                <div className="bg-muted/40 rounded-t-lg w-16 h-10 mt-2 flex items-center justify-center text-lg font-bold text-muted-foreground">3º</div>
              </div>
            </div>
          )}

          <p className="text-label px-1">CLASSIFICAÇÃO GERAL</p>
          <div className="space-y-2">
            {sorted.map((member, i) => {
              const isCurrent = member.user_id === dbProfile?.user_id;
              const memberIsLeader = isGroupLeader(member);
              const myPoints = dbProfile?.points || 0;
              const diff = member.points - myPoints;
              return (
                <div key={member.id} className={cn("card-zelo flex items-center gap-3", isCurrent ? "border-primary/30" : "")}>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                    {i + 1}º
                  </div>
                  {renderGroupAvatar(member, "h-10 w-10", "text-sm")}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold">{member.name}</p>
                      <span className={cn("text-[9px] rounded-full px-1.5 py-0.5 font-semibold", memberIsLeader ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground")}>
                        {memberIsLeader ? "Líder" : "Membro"}
                      </span>
                    </div>
                    {!isCurrent && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {diff > 0 ? `${diff} pts à frente de você` : diff < 0 ? `${Math.abs(diff)} pts atrás de você` : "Mesma pontuação"}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1">
                    {i === 0 ? <Trophy size={12} className="text-warning" /> : <Star size={12} className="text-warning" />}
                    <span className="text-xs font-bold text-warning tabular-nums">{member.points} pts</span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-label px-1">COMO FUNCIONA</p>
          <div className="card-zelo space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15">
                  <Trophy size={16} className="text-primary" />
                </div>
                <p className="text-sm font-bold">Sistema de Pontos</p>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Ganhe pontos praticando bons hábitos financeiros. Quanto mais disciplinado você for, mais rápido sobe no ranking do grupo.
              </p>
            </div>

            <div>
              <p className="text-[10px] font-semibold text-muted-foreground mb-2">COMO GANHAR PONTOS</p>
              <div className="space-y-1.5">
                {[
                  { emoji: "💳", text: "Pagar contas em dia", pts: "+3 pts" },
                  { emoji: "🐷", text: "Economizar 10% da renda", pts: "+5 pts" },
                  { emoji: "🏆", text: "Economizar 20% da renda", pts: "+8 pts" },
                  { emoji: "📈", text: "Depositar em meta de investimento", pts: "+4 pts" },
                  { emoji: "✅", text: "Fechar mês no verde", pts: "+10 pts" },
                  { emoji: "🔥", text: "7 dias registrando gastos", pts: "+3 pts" },
                  { emoji: "🧘", text: "Mês sem compra impulsiva", pts: "+7 pts" },
                ].map(item => (
                  <div key={item.text} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{item.emoji}</span>
                      <span className="text-[11px]">{item.text}</span>
                    </div>
                    <span className="text-[10px] font-bold text-warning">{item.pts}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold text-muted-foreground mb-2">NÍVEIS DE EVOLUÇÃO</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <span className="text-[11px] text-muted-foreground font-semibold">Novato</span>
                  <span className="text-[10px] text-muted-foreground">0+ pts</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <span className="text-[11px] text-muted-foreground font-semibold">Iniciante</span>
                  <span className="text-[10px] text-muted-foreground">5+ pts</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-success/10 px-3 py-2">
                  <span className="text-[11px] text-success font-semibold">Economizador</span>
                  <span className="text-[10px] text-success">20+ pts</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2">
                  <span className="text-[11px] text-primary font-semibold">Investidor</span>
                  <span className="text-[10px] text-primary">50+ pts</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-warning/10 px-3 py-2">
                  <span className="text-[11px] text-warning font-semibold">Mestre Financeiro</span>
                  <span className="text-[10px] text-warning">100+ pts</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-primary/10 border border-primary/20 p-3">
              <p className="text-xs font-bold text-primary mb-1">🎁 Para que servem os pontos?</p>
              <ul className="text-[11px] text-muted-foreground space-y-1">
                <li>• <strong>Ranking do grupo</strong> — compita e lidere entre os membros</li>
                <li>• <strong>Níveis de conquista</strong> — evolua seu perfil financeiro</li>
                <li>• <strong>Reconhecimento</strong> — mostre sua disciplina financeira</li>
                <li>• <strong>Prêmios</strong> — troque pontos por recompensas no menu de prêmios</li>
              </ul>
            </div>
          </div>
        </div>
      </div>,
    );
  }

  // Sub-view: Meu Perfil
  if (subView === "profile") {
    return renderLayer(
      <div className="fixed inset-0 z-[80] bg-background/95 backdrop-blur-sm overflow-y-auto" style={{ paddingTop: "env(safe-area-inset-top, 20px)", paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}>
        <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSubView(null)} className="text-muted-foreground hover:text-foreground"><ChevronDown size={20} className="rotate-90" /></button>
            <div>
              <h1 className="text-lg font-bold">Meu Perfil</h1>
              <p className="text-xs text-muted-foreground">Gerencie suas informações pessoais</p>
            </div>
          </div>

          <div className="card-zelo flex flex-col items-center py-6">
            <div className="relative">
              {renderAvatar(current, "h-20 w-20", "text-2xl")}
              {/* Hidden inputs: one for gallery, one for camera */}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />
              <button onClick={() => setShowMediaPicker(true)} className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                <Camera size={12} />
              </button>
            </div>

            {/* Media source picker */}
            {showMediaPicker && (
              <div className="mt-3 w-full max-w-[220px] rounded-xl border border-border bg-card shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <button
                  onClick={() => { setShowMediaPicker(false); cameraInputRef.current?.click(); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors active:scale-[0.98]"
                >
                  <Camera size={16} className="text-primary" />
                  Tirar Foto
                </button>
                <div className="h-px bg-border" />
                <button
                  onClick={() => { setShowMediaPicker(false); fileInputRef.current?.click(); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors active:scale-[0.98]"
                >
                  <Image size={16} className="text-primary" />
                  Escolher da Galeria
                </button>
                <div className="h-px bg-border" />
                <button
                  onClick={() => setShowMediaPicker(false)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors active:scale-[0.98]"
                >
                  <X size={16} />
                  Cancelar
                </button>
              </div>
            )}

            {/* Delete photo button */}
            {current.avatar && !showMediaPicker && (
              <button
                onClick={handleDeletePhoto}
                className="mt-2 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-medium text-muted-foreground bg-muted/50 hover:bg-destructive/10 hover:text-destructive transition-colors active:scale-[0.97]"
              >
                <Trash2 size={10} />
                Remover foto
              </button>
            )}
            <p className="text-sm font-bold mt-3">{current.name}</p>
            <p className="text-xs text-muted-foreground">{current.email}</p>
          </div>

          <div className="card-zelo space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Informações Pessoais</h3>
              <p className="text-[10px] text-muted-foreground">Atualize como você aparece no app.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Nome Completo</label>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                  <User size={14} className="text-muted-foreground" />
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-transparent text-sm flex-1 outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Email</label>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                  <Mail size={14} className="text-muted-foreground" />
                  <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="bg-transparent text-sm flex-1 outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Membro desde</label>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                  <Calendar size={14} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {dbProfile?.created_at
                      ? (() => {
                          const d = new Date(dbProfile.created_at);
                          const dd = String(d.getDate()).padStart(2, '0');
                          const mm = String(d.getMonth() + 1).padStart(2, '0');
                          const yyyy = d.getFullYear();
                          const hh = String(d.getHours()).padStart(2, '0');
                          const min = String(d.getMinutes()).padStart(2, '0');
                          const ss = String(d.getSeconds()).padStart(2, '0');
                          return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
                        })()
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setProfiles(profiles.map(p => p.id === active ? { ...p, name: editName, initials: editName.charAt(0).toUpperCase(), email: editEmail } : p));
                setSubView(null);
              }}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground active:scale-[0.98] transition-transform"
            >
              Salvar Alterações
            </button>
          </div>

          {/* Developer Signature */}
          <div className="card-zelo space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Sobre o Projeto</h3>
              <p className="text-[10px] text-muted-foreground">Criado com 💙 para você</p>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">ED</span>
                </div>
                <div>
                  <p className="text-sm font-bold">Erick Milhomens</p>
                  <p className="text-[10px] text-muted-foreground">Erick Developer</p>
                </div>
              </div>
              <div className="h-px bg-border" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">Nome Real</p>
                  <p className="text-xs font-medium">Erick Milhomens</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Developer</p>
                  <p className="text-xs font-medium">Erick Developer</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Data de Criação</p>
                <p className="text-xs font-medium">19/03/2026</p>
              </div>
              <p className="text-[10px] text-muted-foreground/70 italic text-center pt-1">
                ⚡ Sparky — assistente financeiro do projeto.
              </p>
            </div>
          </div>
        </div>
      </div>,
    );
  }

  // Sub-view: Gerenciar Prêmios
  if (subView === "prizes") {
    return renderLayer(
      <div className="fixed inset-0 z-[80] bg-background/95 backdrop-blur-sm overflow-y-auto" style={{ paddingTop: "env(safe-area-inset-top, 20px)", paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}>
        <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSubView(null)} className="text-muted-foreground hover:text-foreground"><ChevronDown size={20} className="rotate-90" /></button>
            <div>
              <h1 className="text-lg font-bold">Gerenciar Prêmios</h1>
              <p className="text-xs text-muted-foreground">Crie e gerencie os prêmios disponíveis na loja</p>
            </div>
          </div>

          <button onClick={() => setShowNewPrize(true)} className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
            <UserPlus size={16} /> Adicionar Prêmio
          </button>

          <p className="text-label px-1">PRÊMIOS DISPONÍVEIS</p>

          {prizes.length === 0 ? (
            <div className="card-zelo flex flex-col items-center py-8">
              <Gift size={32} className="text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Nenhum prêmio disponível</p>
              <p className="text-[10px] text-muted-foreground mt-1">Adicione o primeiro prêmio usando o botão acima!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {prizes.map((p, i) => (
                <div key={i} className="card-zelo space-y-2 border-l-warning">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/15">
                      <Gift size={18} className="text-warning" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{p.name}</p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning mt-1">
                        <Star size={8} /> {p.cost} pontos
                      </span>
                    </div>
                    <button onClick={() => setPrizes(prizes.filter((_, j) => j !== i))} className="h-8 w-8 rounded-lg bg-destructive/15 flex items-center justify-center text-destructive active:scale-95">
                      <X size={14} />
                    </button>
                  </div>

                  {p.redeemedBy ? (
                    <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2">
                      <Check size={12} className="text-success" />
                      <p className="text-[10px] text-success">
                        Resgatado por <span className="font-bold">{p.redeemedBy}</span> em {p.redeemedAt}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRedeemPrize(i)}
                      disabled={current.points < p.cost}
                      className={cn(
                        "w-full rounded-lg py-2 text-xs font-semibold active:scale-[0.98] transition-all",
                        current.points >= p.cost
                          ? "bg-success/15 text-success hover:bg-success/25"
                          : "bg-muted text-muted-foreground cursor-not-allowed"
                      )}
                    >
                      {current.points >= p.cost ? "🎁 Resgatar Prêmio" : `Pontos insuficientes (${current.points}/${p.cost})`}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {showNewPrize && (
            <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
              <div className="w-full max-w-sm card-zelo space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold">Novo Prêmio</h3>
                    <p className="text-[10px] text-muted-foreground">Adicione um novo prêmio à loja</p>
                  </div>
                  <button onClick={() => setShowNewPrize(false)} className="text-muted-foreground"><X size={16} /></button>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Nome do Prêmio*</label>
                  <input value={prizeName} onChange={(e) => setPrizeName(e.target.value)} placeholder="Ex: Sorveteria" className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Custo em Pontos*</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={prizeCost}
                      onChange={(e) => setPrizeCost(e.target.value.replace(/\D/g, ""))}
                      className="flex-1 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-primary"
                    />
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1.5 text-[10px] font-bold text-warning">
                      <Star size={8} /> {prizeCost || 0}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowNewPrize(false)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground active:scale-[0.98]">Cancelar</button>
                  <button onClick={handleAddPrize} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground active:scale-[0.98]">Criar Prêmio</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>,
    );
  }

  // Sub-view: Gerenciar Membros
  if (subView === "members") {
    const leaders = groupMembers.filter(m => isGroupLeader(m));
    const regularMembers = groupMembers.filter(m => !isGroupLeader(m));
    const renderMemberAvatar = (member: any, size: string, textSize: string) => {
      if (member.avatar_url) {
        return <img loading="lazy" decoding="async" src={member.avatar_url} alt={member.name} className={cn(size, "rounded-full object-cover")} />;
      }
      return (
        <div className={cn(size, "rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center font-bold text-white", textSize)}>
          {member.name?.charAt(0).toUpperCase() || "?"}
        </div>
      );
    };
    return renderLayer(
      <div className="fixed inset-0 z-[80] bg-background/95 backdrop-blur-sm overflow-y-auto" style={{ paddingTop: "env(safe-area-inset-top, 20px)", paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}>
        <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSubView(null)} className="text-muted-foreground hover:text-foreground"><ChevronDown size={20} className="rotate-90" /></button>
            <div>
              <h1 className="text-lg font-bold">Gerenciar Membros</h1>
              <p className="text-xs text-muted-foreground">Membros reais do grupo sincronizados</p>
            </div>
          </div>

          <div className="card-zelo space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold">Código de Convite</p>
                <p className="text-[10px] text-muted-foreground">Compartilhe para convidar novos membros</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3">
              <span className="flex-1 text-center text-lg font-mono font-bold tracking-[0.3em]">{dbProfile?.group_code || dbProfile?.invite_code || "------"}</span>
              <button onClick={() => navigator.clipboard.writeText(dbProfile?.group_code || dbProfile?.invite_code || "")} className="text-primary active:scale-95">
                <Check size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="card-zelo flex flex-col items-center py-3">
              <Users size={16} className="text-primary mb-1" />
              <p className="text-lg font-bold">{groupMembers.length}</p>
              <p className="text-[9px] text-muted-foreground">Total</p>
            </div>
            <div className="card-zelo flex flex-col items-center py-3 border-l-warning">
              <Crown size={16} className="text-warning mb-1" />
              <p className="text-lg font-bold">{leaders.length}</p>
              <p className="text-[9px] text-muted-foreground">Líderes</p>
            </div>
            <div className="card-zelo flex flex-col items-center py-3">
              <User size={16} className="text-muted-foreground mb-1" />
              <p className="text-lg font-bold">{regularMembers.length}</p>
              <p className="text-[9px] text-muted-foreground">Membros</p>
            </div>
          </div>

          <div>
            <p className="text-label mb-2 px-1 flex items-center gap-1.5"><Crown size={10} className="text-warning" /> LÍDERES</p>
            <div className="space-y-2">
              {leaders.map(m => (
                <div key={m.id} className="card-zelo flex items-center gap-3">
                  {renderMemberAvatar(m, "h-10 w-10", "text-sm")}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{m.name}</p>
                      {m.user_id === dbProfile?.user_id && <span className="text-[9px] rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">Você</span>}
                      <span className="text-[9px] rounded-full bg-warning/15 px-1.5 py-0.5 text-warning font-semibold">Líder</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star size={8} className="text-warning" />
                      <span className="text-[10px] text-muted-foreground">{m.points} pontos</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-label mb-2 px-1 flex items-center gap-1.5"><User size={10} className="text-muted-foreground" /> MEMBROS</p>
            {regularMembers.length === 0 ? (
              <div className="card-zelo flex flex-col items-center py-6">
                <Users size={24} className="text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground mt-2">Nenhum membro ainda</p>
              </div>
            ) : (
              <div className="space-y-2">
                {regularMembers.map(m => (
                  <div key={m.id} className="card-zelo flex items-center gap-3">
                    {renderMemberAvatar(m, "h-10 w-10", "text-sm")}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{m.name}</p>
                        {m.user_id === dbProfile?.user_id && <span className="text-[9px] rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">Você</span>}
                        <span className="text-[9px] rounded-full bg-muted/50 px-1.5 py-0.5 text-muted-foreground">Membro</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star size={8} className="text-warning" />
                        <span className="text-[10px] text-muted-foreground">{m.points} pontos</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>,
    );
  }

  // Sub-view: Support Chat (user side)
  if (subView === "support") {
    const formatTime = (t: string) => {
      try {
        const d = new Date(t);
        return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      } catch { return ""; }
    };
    return renderLayer(
      <div className="fixed inset-0 z-[80] bg-background/95 backdrop-blur-sm flex flex-col" style={{ paddingTop: "env(safe-area-inset-top, 20px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="max-w-lg mx-auto w-full flex flex-col flex-1 min-h-0 px-4 py-4">
          <div className="flex items-center gap-3 mb-4 shrink-0">
            <button onClick={() => setSubView(null)} className="text-muted-foreground hover:text-foreground"><ChevronDown size={20} className="rotate-90" /></button>
            <div className="flex items-center gap-2 flex-1">
              <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center">
                <MessageSquare size={14} className="text-primary" />
              </div>
              <div>
                <h1 className="text-base font-bold">Suporte</h1>
                <p className="text-[10px] text-muted-foreground">{supportClosed ? "Chamado encerrado" : "Chat direto com o administrador"}</p>
              </div>
            </div>
          </div>

          {/* Closed notice */}
          {supportClosed && (
            <div className="mb-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-3 text-center shrink-0">
              <p className="text-xs text-yellow-500 font-semibold">O suporte encerrou este chamado.</p>
              <p className="text-[10px] text-muted-foreground mt-1">Caso precise de ajuda novamente, abra um novo chamado.</p>
              <button
                onClick={() => {
                  if (!dbProfile?.user_id) return;
                  localStorage.removeItem(`sparky-support-status-${dbProfile.user_id}`);
                  localStorage.removeItem(`sparky-support-chat-${dbProfile.user_id}`);
                  setSupportMessages([]);
                  setSupportClosed(false);
                  setSubView(null);
                  toast.success("Chamado anterior removido.");
                }}
                className="mt-2 rounded-lg bg-muted px-4 py-2 text-[10px] font-medium text-muted-foreground active:scale-95"
              >
                Fechar
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 rounded-xl border border-border bg-muted/20 p-3 mb-3">
            {supportMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <MessageSquare size={32} className="text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhuma mensagem ainda</p>
                <p className="text-[10px] text-muted-foreground mt-1">Envie uma mensagem para iniciar o suporte</p>
              </div>
            ) : (
              supportMessages.map((msg, i) => (
                <div key={i} className={cn("max-w-[80%] rounded-xl px-3 py-2", msg.from === "user" ? "ml-auto bg-primary/20 text-right" : "bg-muted")}>
                  <p className="text-[11px]">{msg.text}</p>
                  <p className="text-[8px] text-muted-foreground mt-0.5">
                    {msg.from === "admin" ? "Admin" : "Você"} • {formatTime(msg.time)}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Input (disabled if closed) */}
          {!supportClosed && (
            <div className="flex gap-2 shrink-0">
              <input
                type="text"
                value={supportInput}
                onChange={(e) => setSupportInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendSupportMessage()}
                placeholder="Digite sua mensagem..."
                className="flex-1 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <button onClick={handleSendSupportMessage} disabled={!supportInput.trim()}
                className="rounded-xl bg-primary px-3 py-2.5 text-primary-foreground active:scale-95 disabled:opacity-50">
                <Send size={14} />
              </button>
            </div>
          )}
        </div>
      </div>,
    );
  }

  // Sub-view: Admin Panel
  if (subView === "admin") {
    return renderLayer(<AdminPanel onClose={() => setSubView(null)} />);
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 active:scale-95 transition-transform" aria-label={trigger === "hamburger" ? "Abrir menu" : "Abrir perfil"}>
        {trigger === "hamburger" ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted/50 border border-border/60 hover:bg-muted/80 transition-colors">
            <Menu size={18} className="text-foreground" />
          </div>
        ) : isLoading ? (
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
        ) : (
          <>
            {renderAvatar(current!, "h-8 w-8", "text-xs")}
            <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", open && "rotate-180")} />
          </>
        )}
      </button>

      {open && !isLoading && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeAll} />
          <div className={cn("absolute top-12 z-50 w-72 rounded-2xl border border-border bg-card p-3 shadow-xl shadow-black/30 fade-in-up", trigger === "hamburger" ? "left-0" : "right-0")} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              {renderAvatar(current, "h-11 w-11", "text-sm")}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{current.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{current.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-xl bg-muted/40 p-2.5 flex items-center gap-2">
                <Star size={14} className="text-warning" />
                <div>
                  <p className="text-sm font-bold">{current.points}</p>
                  <p className="text-[9px] text-muted-foreground">Pontos</p>
                </div>
              </div>
              <div className="rounded-xl bg-muted/40 p-2.5 flex items-center gap-2">
                <Crown size={14} className="text-warning" />
                <div>
                  <p className="text-sm font-bold capitalize">{current.role}</p>
                  <p className="text-[9px] text-muted-foreground">{current.role === "admin" ? "Admin" : "Membro"}</p>
                </div>
              </div>
            </div>

            <div className="h-px bg-border mb-2" />

            <button onClick={() => openSubView("profile")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-muted/50 transition-colors active:scale-[0.97]">
              <User size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium">Meu Perfil</span>
            </button>
            <button onClick={() => openSubView("ranking")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-muted/50 transition-colors active:scale-[0.97]">
              <Trophy size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium">Ranking</span>
            </button>
            {current?.role === "admin" && !isDemo && hasActiveSupport && (
              <button onClick={() => openSubView("support")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-primary/10 transition-colors active:scale-[0.97]">
                <MessageSquare size={16} className="text-primary" />
                <span className="text-sm font-medium text-primary">Suporte</span>
                <span className="ml-auto h-2 w-2 rounded-full bg-primary animate-pulse" />
              </button>
            )}
            {current?.role === "admin" && !isDemo && !hasActiveSupport && (
              <button onClick={startSupportTicket} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-muted/50 transition-colors active:scale-[0.97]">
                <MessageSquare size={16} className="text-muted-foreground" />
                <span className="text-sm font-medium">Suporte</span>
              </button>
            )}

            <div className="h-px bg-border my-2" />
            <p className="text-[9px] text-muted-foreground font-semibold tracking-wider px-3 mb-1">ADMINISTRAÇÃO</p>

            {current?.role === "admin" && current?.email === "admin@sparky.app" && !isDemo && (
              <button onClick={() => { openSubView("admin"); setOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-primary/10 transition-colors active:scale-[0.97]">
                <Shield size={16} className="text-primary" />
                <span className="text-sm font-medium text-primary">Painel Admin</span>
              </button>
            )}
            <button onClick={() => openSubView("prizes")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-muted/50 transition-colors active:scale-[0.97]">
              <Gift size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium">Gerenciar Prêmios</span>
            </button>
            <button onClick={() => openSubView("members")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-muted/50 transition-colors active:scale-[0.97]">
              <Users size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium">Gerenciar Membros</span>
            </button>

            <div className="h-px bg-border my-2" />

            <p className="text-[9px] text-muted-foreground font-semibold tracking-wider px-3 mb-1">PERFIS</p>
            {profiles.map((p) => (
              <div key={p.id} className="flex items-center gap-1">
                <button
                  onClick={() => { setActive(p.id); setOpen(false); }}
                  className={cn(
                    "flex flex-1 items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors active:scale-[0.97]",
                    active === p.id ? "bg-primary/10" : "hover:bg-muted/50"
                  )}
                >
                  {renderAvatar(p, "h-7 w-7", "text-[10px]")}
                  <span className="text-sm font-medium flex-1">{p.name}</span>
                  {active === p.id && <Check size={14} className="text-primary" />}
                </button>
                {!p.isOriginal && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteProfile(p.id); }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-95 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}

            {addingProfile ? (
              <div className="mt-2 space-y-2 rounded-xl border border-border p-3">
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome" className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary" />
                <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email (opcional)" className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary" />
                <div className="flex gap-2">
                  <button onClick={() => setAddingProfile(false)} className="flex-1 rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground">Cancelar</button>
                  <button onClick={handleAddProfile} className="flex-1 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground">Salvar</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingProfile(true)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-muted-foreground hover:bg-muted/50 transition-colors active:scale-[0.97] mt-1">
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-muted-foreground/40">
                  <UserPlus size={12} />
                </div>
                <span className="text-sm">Adicionar perfil</span>
              </button>
            )}

            <div className="h-px bg-border my-2" />
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors active:scale-[0.97]"
            >
              <LogOut size={16} />
              <span className="text-sm font-medium">Sair da conta</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ProfileSwitcher;
