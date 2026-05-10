import { useState } from "react";
import { Copy, Check, Crown, Star, Shield, Users, Trophy, Zap, Gift, ChevronDown, ChevronUp, Award, Pencil, X, Clock } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { usePoints, POINTS_RULES } from "@/hooks/usePoints";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Prize {
  id: string;
  name: string;
  pointsCost: number;
  stock: number;
}

interface Redemption {
  id: string;
  prizeId: string;
  prizeName: string;
  userName: string;
  date: string;
}

const PRIZES_KEY = "sparky-admin-prizes";
const REDEMPTIONS_KEY = "sparky-redemption-history";

const loadPrizes = (): Prize[] => {
  try { return JSON.parse(localStorage.getItem(PRIZES_KEY) || "[]"); } catch { return []; }
};

const loadRedemptions = (): Redemption[] => {
  try { return JSON.parse(localStorage.getItem(REDEMPTIONS_KEY) || "[]"); } catch { return []; }
};

const MembersView = () => {
  const [copied, setCopied] = useState(false);
  const [showPointsGuide, setShowPointsGuide] = useState(false);
  const [showPrizes, setShowPrizes] = useState(false);
  const [editPrize, setEditPrize] = useState<Prize | null>(null);
  const [editForm, setEditForm] = useState({ name: "", pointsCost: "", stock: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Prize | null>(null);
  const { profile } = useProfile();
  const { currentPoints, monthlyEarnings, recentActivity } = usePoints();
  const { members, isLeader } = useGroupMembers();

  const prizes = loadPrizes();
  const redemptions = loadRedemptions();

  // Check if current user is leader (owner)
  const isOwner = profile ? isLeader({ invite_code: profile.invite_code, group_code: profile.group_code } as any) : false;

  const groupCode = profile?.group_code || profile?.invite_code || "--------";

  const handleCopy = () => {
    navigator.clipboard.writeText(groupCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRedeem = (prize: Prize) => {
    if (currentPoints < prize.pointsCost) {
      toast.error("Pontos insuficientes para resgatar este prêmio!");
      return;
    }
    if (prize.stock <= 0) {
      toast.error("Este prêmio está esgotado!");
      return;
    }

    // Deduct points
    const newPoints = currentPoints - prize.pointsCost;
    // Update prize stock
    const updatedPrizes = prizes.map(p => p.id === prize.id ? { ...p, stock: p.stock - 1 } : p);
    localStorage.setItem(PRIZES_KEY, JSON.stringify(updatedPrizes));

    // Log redemption
    const newRedemption: Redemption = {
      id: Date.now().toString(),
      prizeId: prize.id,
      prizeName: prize.name,
      userName: profile?.name || "Usuário",
      date: new Date().toISOString(),
    };
    const allRedemptions = [...loadRedemptions(), newRedemption];
    localStorage.setItem(REDEMPTIONS_KEY, JSON.stringify(allRedemptions));

    toast.success(`Prêmio "${prize.name}" resgatado! -${prize.pointsCost} pts`);
  };

  const handleEditSave = () => {
    if (!editPrize || !editForm.name.trim()) return;
    const updated = prizes.map(p => p.id === editPrize.id ? {
      ...p,
      name: editForm.name,
      pointsCost: parseInt(editForm.pointsCost) || 0,
      stock: parseInt(editForm.stock) || 0,
    } : p);
    localStorage.setItem(PRIZES_KEY, JSON.stringify(updated));
    setEditPrize(null);
    toast.success("Prêmio atualizado!");
  };

  const handleDeletePrize = (prize: Prize) => {
    const updated = prizes.filter(p => p.id !== prize.id);
    localStorage.setItem(PRIZES_KEY, JSON.stringify(updated));
    setShowDeleteConfirm(null);
    setEditPrize(null);
    toast.success("Prêmio excluído!");
  };

  const getRankBadge = (index: number, member: any) => {
    if (isLeader(member)) return { icon: Crown, color: "text-warning", bg: "bg-warning/15", label: "Líder" };
    if (index === 0) return { icon: Crown, color: "text-warning", bg: "bg-warning/15", label: "1º lugar" };
    if (index === 1) return { icon: Star, color: "text-primary", bg: "bg-primary/15", label: "2º lugar" };
    if (index === 2) return { icon: Star, color: "text-success", bg: "bg-success/15", label: "3º lugar" };
    return { icon: Star, color: "text-muted-foreground", bg: "bg-muted", label: `${index + 1}º` };
  };

  const getLevel = (pts: number) => {
    if (pts >= 100) return { name: "Mestre Financeiro", color: "text-warning", min: 100 };
    if (pts >= 50) return { name: "Investidor", color: "text-primary", min: 50 };
    if (pts >= 20) return { name: "Economizador", color: "text-success", min: 20 };
    if (pts >= 5) return { name: "Iniciante", color: "text-muted-foreground", min: 5 };
    return { name: "Novato", color: "text-muted-foreground", min: 0 };
  };

  const level = getLevel(currentPoints);
  const nextLevel = currentPoints >= 100
    ? null
    : currentPoints >= 50 ? { name: "Mestre Financeiro", min: 100 }
    : currentPoints >= 20 ? { name: "Investidor", min: 50 }
    : currentPoints >= 5 ? { name: "Economizador", min: 20 }
    : { name: "Iniciante", min: 5 };

  const progressToNext = nextLevel
    ? Math.min(100, ((currentPoints - level.min) / (nextLevel.min - level.min)) * 100)
    : 100;

  // Sort members: leaders first, then by points
  const sortedMembers = [...members].sort((a, b) => {
    const aIsLeader = isLeader(a);
    const bIsLeader = isLeader(b);
    if (aIsLeader && !bIsLeader) return -1;
    if (!aIsLeader && bIsLeader) return 1;
    return b.points - a.points;
  });

  const leaderCount = members.filter(m => isLeader(m)).length;
  const memberCount = members.length - leaderCount;

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="px-4 pb-24 space-y-4">
      <div className="pt-3">
        <h1 className="text-xl font-bold">Ranking & Membros</h1>
      </div>

      {/* Your Points Card */}
      <div className="card-zelo fade-in-up relative overflow-hidden">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-warning/5" />
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/15">
              <Trophy size={22} className="text-warning" />
            </div>
            <div>
              <p className="text-sm font-bold">Seus Pontos</p>
              <p className={`text-[11px] font-semibold ${level.color}`}>{level.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold tabular-nums text-warning">{currentPoints}</p>
            <p className="text-[10px] text-muted-foreground">pontos</p>
          </div>
        </div>

        {nextLevel && (
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>{level.name}</span>
              <span>{nextLevel.name} ({nextLevel.min} pts)</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-warning transition-all duration-700" style={{ width: `${progressToNext}%` }} />
            </div>
          </div>
        )}

        {monthlyEarnings > 0 && (
          <div className="mt-3 flex items-center gap-1.5">
            <Zap size={12} className="text-success" />
            <span className="text-[11px] text-success font-medium">+{monthlyEarnings} pts este mês</span>
          </div>
        )}
      </div>

      {/* Prizes Section */}
      {prizes.length > 0 && (
        <div className="card-zelo fade-in-up stagger-1">
          <button onClick={() => setShowPrizes(!showPrizes)} className="w-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/15">
                <Award size={18} className="text-yellow-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold">Loja de Prêmios</p>
                <p className="text-[10px] text-muted-foreground">{prizes.length} prêmio(s) disponível(is)</p>
              </div>
            </div>
            {showPrizes ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
          </button>

          {showPrizes && (
            <div className="mt-4 space-y-3">
              {prizes.map(prize => (
                <div key={prize.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-yellow-500/15 flex items-center justify-center shrink-0">
                      <Award size={16} className="text-yellow-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{prize.name}</p>
                        {isOwner && (
                          <button
                            onClick={() => { setEditPrize(prize); setEditForm({ name: prize.name, pointsCost: String(prize.pointsCost), stock: String(prize.stock) }); }}
                            className="p-1 rounded text-muted-foreground/50 hover:text-muted-foreground active:scale-90"
                          >
                            <Pencil size={11} />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-[10px] font-bold text-yellow-500">
                          <Star size={8} /> {prize.pointsCost} pts
                        </span>
                        <span className="text-[10px] text-muted-foreground">{prize.stock} restantes</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRedeem(prize)}
                      disabled={currentPoints < prize.pointsCost || prize.stock <= 0}
                      className="rounded-lg bg-primary/15 border border-primary/20 px-3 py-1.5 text-[10px] font-semibold text-primary active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Resgatar
                    </button>
                  </div>
                </div>
              ))}

              {/* Redemption History */}
              {redemptions.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-2">HISTÓRICO DE RESGATES</p>
                  <div className="space-y-1.5">
                    {redemptions.slice(-10).reverse().map(r => (
                      <div key={r.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Clock size={10} className="text-muted-foreground" />
                          <div>
                            <p className="text-[10px] font-medium">{r.userName} resgatou {r.prizeName}</p>
                            <p className="text-[8px] text-muted-foreground">{formatDate(r.date)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Points System Explainer */}
      <div className="card-zelo fade-in-up stagger-1">
        <button
          onClick={() => setShowPointsGuide(!showPointsGuide)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <Gift size={18} className="text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold">Como ganhar pontos?</p>
              <p className="text-[10px] text-muted-foreground">Entenda o sistema e as recompensas</p>
            </div>
          </div>
          {showPointsGuide ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </button>

        {showPointsGuide && (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground mb-2">COMO GANHAR</p>
              <div className="space-y-2">
                {POINTS_RULES.map(rule => (
                  <div key={rule.id} className="flex items-start gap-2.5 rounded-xl bg-muted/50 border border-border px-3 py-2.5">
                    <span className="text-base mt-0.5">{rule.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold">{rule.label}</p>
                        <span className="text-xs font-bold text-warning tabular-nums">+{rule.points} pts</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{rule.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold text-muted-foreground mb-2">NÍVEIS</p>
              <div className="space-y-1.5">
                {[
                  { name: "Novato", min: 0, color: "text-muted-foreground" },
                  { name: "Iniciante", min: 5, color: "text-muted-foreground" },
                  { name: "Economizador", min: 20, color: "text-success" },
                  { name: "Investidor", min: 50, color: "text-primary" },
                  { name: "Mestre Financeiro", min: 100, color: "text-warning" },
                ].map(lvl => (
                  <div key={lvl.name} className={`flex items-center justify-between rounded-lg px-3 py-2 ${currentPoints >= lvl.min ? "bg-muted/50 border border-border" : "opacity-50"}`}>
                    <span className={`text-xs font-semibold ${lvl.color}`}>{lvl.name}</span>
                    <span className="text-[10px] text-muted-foreground">{lvl.min}+ pts</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-primary/10 border border-primary/20 p-3">
              <p className="text-xs font-bold text-primary mb-1">🎁 Para que servem os pontos?</p>
              <ul className="text-[11px] text-muted-foreground space-y-1">
                <li>• <strong>Ranking familiar</strong> — compita com membros do grupo</li>
                <li>• <strong>Loja de prêmios</strong> — resgate recompensas exclusivas</li>
                <li>• <strong>Níveis de conquista</strong> — evolua seu perfil financeiro</li>
                <li>• <strong>Reconhecimento</strong> — mostre sua disciplina financeira</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Group Code */}
      <div className="card-zelo fade-in-up stagger-2">
        <p className="text-label mb-2">CÓDIGO DE CONVITE DO GRUPO</p>
        <div className="flex items-center gap-3">
          <span className="flex-1 rounded-xl bg-muted/50 border border-border px-4 py-3 text-lg font-mono font-bold tracking-[0.3em] text-center">
            {groupCode}
          </span>
          <button
            onClick={handleCopy}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary active:scale-95 transition-all"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="card-zelo fade-in-up stagger-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
              <Users size={14} className="text-primary" />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">Membros</span>
          </div>
          <p className="text-2xl font-bold">{memberCount}</p>
        </div>
        <div className="card-zelo fade-in-up stagger-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/15">
              <Crown size={14} className="text-warning" />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">Líderes</span>
          </div>
          <p className="text-2xl font-bold">{leaderCount}</p>
        </div>
      </div>

      {/* Members Ranking — leaders first */}
      <div className="fade-in-up stagger-4">
        <p className="text-label mb-2 px-1">CLASSIFICAÇÃO GERAL</p>
        <div className="card-zelo !p-0 divide-y divide-border">
          {sortedMembers.length === 0 && profile && (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-warning/40 to-warning/10 text-sm font-bold">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <Crown size={12} className="absolute -top-1 -right-1 text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{profile.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
                    <Crown size={8} /> Líder
                  </span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{currentPoints} pontos</span>
                </div>
              </div>
            </div>
          )}
          {sortedMembers.map((member, index) => {
            const memberIsLeader = isLeader(member);
            const badge = getRankBadge(index, member);
            const BadgeIcon = badge.icon;
            const colors = [
              "from-warning/40 to-warning/10",
              "from-primary/40 to-primary/10",
              "from-success/40 to-success/10",
              "from-destructive/40 to-destructive/10",
            ];
            return (
              <div key={member.id} className={cn("flex items-center gap-3 px-4 py-3.5", memberIsLeader && "bg-warning/5")}>
                <div className="relative">
                  {member.avatar_url ? (
                    <img loading="lazy" decoding="async" src={member.avatar_url} alt={member.name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${colors[index % colors.length]} text-sm font-bold`}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <BadgeIcon size={12} className={`absolute -top-1 -right-1 ${badge.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{member.name}</p>
                    {member.user_id === profile?.user_id && (
                      <span className="text-[9px] text-primary font-medium">(você)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center gap-1 rounded-full ${badge.bg} px-2 py-0.5 text-[10px] font-semibold ${badge.color}`}>
                      <BadgeIcon size={8} /> {memberIsLeader ? "Líder" : "Membro"}
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{member.points} pontos</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-muted-foreground">{index + 1}º</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="fade-in-up">
          <p className="text-label mb-2 px-1">ATIVIDADE RECENTE</p>
          <div className="card-zelo !p-0 divide-y divide-border">
            {recentActivity.map((entry, i) => {
              const rule = POINTS_RULES.find(r => r.id === entry.ruleId);
              return (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm">{rule?.icon || "⭐"}</span>
                    <div>
                      <p className="text-xs font-medium">{entry.description}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(entry.date).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-warning tabular-nums">+{entry.points}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Prize Modal — only for owners */}
      {editPrize && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm card-zelo space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Editar Prêmio</h3>
              <button onClick={() => setEditPrize(null)} className="text-muted-foreground"><X size={16} /></button>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Nome</label>
              <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Custo em Pontos</label>
              <input type="text" inputMode="numeric" value={editForm.pointsCost}
                onChange={(e) => setEditForm({ ...editForm, pointsCost: e.target.value.replace(/\D/g, "") })}
                className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditPrize(null)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground active:scale-[0.98]">Cancelar</button>
              <button onClick={handleEditSave} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground active:scale-[0.98]">Salvar</button>
            </div>
            <button onClick={() => setShowDeleteConfirm(editPrize)}
              className="w-full rounded-xl border border-destructive/30 bg-destructive/5 py-2.5 text-sm font-semibold text-destructive flex items-center justify-center gap-2 active:scale-[0.98]">
              Excluir Prêmio
            </button>
          </div>
        </div>
      )}

      {/* Delete Prize Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm card-zelo space-y-4 text-center">
            <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-destructive/15">
              <Award size={24} className="text-destructive" />
            </div>
            <h3 className="text-base font-bold">Excluir prêmio?</h3>
            <p className="text-xs text-muted-foreground">Tem certeza que deseja excluir "{showDeleteConfirm.name}"?</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground active:scale-[0.98]">Cancelar</button>
              <button onClick={() => handleDeletePrize(showDeleteConfirm)} className="flex-1 rounded-xl bg-destructive py-3 text-sm font-semibold text-destructive-foreground active:scale-[0.98]">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembersView;
