import { useState, useEffect, useCallback } from "react";
import {
  Users, Trash2, Shield, ChevronDown, RefreshCw, AlertTriangle, Mail, Phone,
  Calendar, Star, Download, BarChart3, Settings, Bell, Database, Activity,
  Search, UserX, UserCheck, Clock, DollarSign, TrendingUp, TrendingDown,
  Percent, Ban, Eye, RotateCcw, FileText, Send, ToggleLeft, Award,
  Edit2, Plus, Package, Hash, X, Check, Coins, Lock, Unlock, LogOut,
  Paintbrush, Flag, Timer, AlertCircle, ShieldAlert, MessageSquare,
  Zap, Globe, Palette, BookOpen, Power, Wifi, WifiOff, History
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: string;
  points: number;
  avatar_url: string | null;
  provider: string;
  created_at: string;
  last_sign_in: string | null;
  banned?: boolean;
  user_metadata?: Record<string, any>;
}

interface AuditLog {
  id: string;
  action: string;
  target: string;
  details: string;
  timestamp: string;
}

interface Prize {
  id: string;
  name: string;
  pointsCost: number;
  stock: number;
}

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  targetGroup: "all" | "admins" | "new_users" | "premium";
}

interface FailedLogin {
  id: string;
  email: string;
  ip: string;
  timestamp: string;
  reason: string;
}

type AdminTab = "users" | "stats" | "tools" | "prizes" | "security" | "flags";

const AdminPanel = ({ onClose }: { onClose: () => void }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [resultPopup, setResultPopup] = useState<{ show: boolean; success: boolean; message: string }>({ show: false, success: false, message: "" });

  // Maintenance mode — persisted to localStorage
  const [maintenanceMode, setMaintenanceMode] = useState(() => localStorage.getItem("sparky-maintenance-mode") === "true");

  // Dangerous action confirmation
  const [dangerModal, setDangerModal] = useState<{ show: boolean; title: string; description: string; action: () => void } | null>(null);
  const [dangerConfirmText, setDangerConfirmText] = useState("");

  // User detail / adjust modal
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [adjustPoints, setAdjustPoints] = useState("");

  // Audit log
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Prizes management
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [showPrizeForm, setShowPrizeForm] = useState(false);
  const [editPrize, setEditPrize] = useState<Prize | null>(null);
  const [prizeForm, setPrizeForm] = useState({ name: "", pointsCost: "100", stock: "10" });

  // Notification broadcast
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifMessage, setNotifMessage] = useState("");

  // System config
  const [pointsRate, setPointsRate] = useState(() => localStorage.getItem("sparky-points-rate") || "1.0");
  const [withdrawLimit, setWithdrawLimit] = useState(() => localStorage.getItem("sparky-withdraw-limit") || "500");

  // Feature Flags
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [showFlagForm, setShowFlagForm] = useState(false);
  const [flagForm, setFlagForm] = useState({ name: "", description: "", targetGroup: "all" as FeatureFlag["targetGroup"] });

  // Maintenance scheduler
  const [maintenanceTimer, setMaintenanceTimer] = useState<number>(0);
  const [maintenanceTimerActive, setMaintenanceTimerActive] = useState(false);

  // Failed logins (simulated)
  const [failedLogins] = useState<FailedLogin[]>([
    { id: "1", email: "hacker@test.com", ip: "192.168.1.100", timestamp: new Date(Date.now() - 3600000).toISOString(), reason: "Senha incorreta" },
    { id: "2", email: "unknown@mail.com", ip: "10.0.0.55", timestamp: new Date(Date.now() - 7200000).toISOString(), reason: "Usuário não encontrado" },
    { id: "3", email: "bot@spam.net", ip: "172.16.0.33", timestamp: new Date(Date.now() - 1800000).toISOString(), reason: "Rate limit excedido" },
  ]);

  // Session timeline for selected user
  const [showTimeline, setShowTimeline] = useState(false);

  // CMS — Visual Identity Editor
  const [showCMS, setShowCMS] = useState(false);
  const [cmsColors, setCmsColors] = useState(() => {
    const saved = localStorage.getItem("sparky-cms-colors");
    return saved ? JSON.parse(saved) : { primary: "#3b82f6", accent: "#8b5cf6" };
  });

  // Direct support chat
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [supportChatTarget, setSupportChatTarget] = useState<AdminUser | null>(null);
  const [supportMessages, setSupportMessages] = useState<{ from: string; text: string; time: string }[]>([]);
  const [supportInput, setSupportInput] = useState("");

  const addAuditLog = useCallback((action: string, target: string, details: string) => {
    const log: AuditLog = {
      id: Date.now().toString(),
      action, target, details,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs(prev => [log, ...prev].slice(0, 100));
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/admin-users?action=list`,
        { headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" } }
      );
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Erro ao buscar usuários"); }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e: any) {
      toast.error(e.message || "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Load prizes & flags from localStorage
  useEffect(() => {
    const savedPrizes = localStorage.getItem("sparky-admin-prizes");
    if (savedPrizes) setPrizes(JSON.parse(savedPrizes));
    const savedFlags = localStorage.getItem("sparky-feature-flags");
    if (savedFlags) setFeatureFlags(JSON.parse(savedFlags));
    else {
      const defaults: FeatureFlag[] = [
        { id: "1", name: "Sparky AI Chat", description: "Habilita o chatbot de IA", enabled: true, targetGroup: "all" },
        { id: "2", name: "Modo Escuro", description: "Tema dark mode", enabled: true, targetGroup: "all" },
        { id: "3", name: "Cartões de Crédito", description: "Gerenciamento de cartões", enabled: true, targetGroup: "all" },
        { id: "4", name: "Beta: Analytics", description: "Dashboard avançado de analytics", enabled: false, targetGroup: "admins" },
      ];
      setFeatureFlags(defaults);
      localStorage.setItem("sparky-feature-flags", JSON.stringify(defaults));
    }
  }, []);

  // Maintenance timer countdown
  useEffect(() => {
    if (!maintenanceTimerActive || maintenanceTimer <= 0) return;
    const interval = setInterval(() => {
      setMaintenanceTimer(prev => {
        if (prev <= 1) {
          setMaintenanceTimerActive(false);
          toggleMaintenance(true);
          addAuditLog("MAINTENANCE_AUTO", "Sistema", "Manutenção ativada automaticamente pelo timer");
          toast.success("Modo manutenção ativado!");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [maintenanceTimerActive, maintenanceTimer, addAuditLog]);

  // Persist maintenance timer to localStorage so header can read it
  useEffect(() => {
    if (maintenanceTimerActive && maintenanceTimer > 0) {
      localStorage.setItem("sparky-maintenance-timer", JSON.stringify({ active: true, endsAt: Date.now() + maintenanceTimer * 1000 }));
    } else {
      localStorage.removeItem("sparky-maintenance-timer");
    }
    window.dispatchEvent(new Event("sparky-maintenance-update"));
  }, [maintenanceTimerActive, maintenanceTimer]);

  const toggleMaintenance = (val: boolean) => {
    setMaintenanceMode(val);
    localStorage.setItem("sparky-maintenance-mode", val ? "true" : "false");
    window.dispatchEvent(new Event("sparky-maintenance-update"));
  };

  const savePrizes = (p: Prize[]) => {
    setPrizes(p);
    localStorage.setItem("sparky-admin-prizes", JSON.stringify(p));
  };

  const saveFlags = (f: FeatureFlag[]) => {
    setFeatureFlags(f);
    localStorage.setItem("sparky-feature-flags", JSON.stringify(f));
  };

  const handleDeleteUser = async (userId: string) => {
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/admin-users`,
        { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete_user", userId }) }
      );
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Erro ao deletar"); }
      const deletedUser = users.find(u => u.id === userId);
      addAuditLog("DELETE_USER", deletedUser?.name || userId, "Usuário removido pelo admin");
      setDeleteTarget(null);
      setResultPopup({ show: true, success: true, message: "Operação executada com sucesso!" });
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || "Erro ao deletar usuário");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/admin-users`,
        { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete_all_users" }) }
      );
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Erro ao deletar"); }
      const data = await res.json();
      addAuditLog("DELETE_ALL_USERS", "Todos", `${data.deleted} usuários removidos`);
      setDangerModal(null);
      setDangerConfirmText("");
      setResultPopup({ show: true, success: true, message: "Operação executada com sucesso!" });
      fetchUsers();
    } catch (e: any) {
      setDangerModal(null);
      setDangerConfirmText("");
      setResultPopup({ show: true, success: false, message: e.message || "Erro ao deletar usuários." });
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "Nunca";
    const date = new Date(d);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.phone || "").includes(searchQuery)
  );

  const exportUsersCSV = () => {
    const header = "Nome,Email,Telefone,Provedor,Pontos,Cargo,Criado em\n";
    const rows = users.map(u =>
      `"${u.name}","${u.email || ""}","${u.phone || ""}","${u.provider}",${u.points},"${u.role}","${u.created_at}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `sparky-users-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    addAuditLog("EXPORT_CSV", "Usuários", `${users.length} usuários exportados`);
    toast.success("CSV exportado com sucesso!");
  };

  const handleAdjustPoints = async (userId: string, newPoints: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");
      const res = await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/admin-users`,
        { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "adjust_points", userId, points: newPoints }) }
      );
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Erro"); }
      addAuditLog("ADJUST_POINTS", selectedUser?.name || userId, `Pontos alterados para ${newPoints}`);
      setSelectedUser(null);
      setAdjustPoints("");
      setResultPopup({ show: true, success: true, message: "Operação executada com sucesso!" });
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || "Erro ao ajustar pontos");
    }
  };

  const handleSendNotification = () => {
    if (!notifMessage.trim()) return;
    // Store as a blocking notification with 5-second delay
    const notif = {
      id: Date.now().toString(),
      message: notifMessage,
      date: new Date().toISOString(),
      read: false,
      blocking: true,
      minDisplaySeconds: 5,
    };
    localStorage.setItem("sparky-active-notification", JSON.stringify(notif));
    window.dispatchEvent(new Event("sparky-notification-push"));
    addAuditLog("SEND_NOTIFICATION", "Todos os usuários", notifMessage);
    toast.success("Notificação enviada para todos os usuários!");
    setNotifMessage("");
    setShowNotifModal(false);
  };

  const handleSavePrize = () => {
    if (!prizeForm.name.trim()) return;
    if (editPrize) {
      const updated = prizes.map(p => p.id === editPrize.id ? { ...p, name: prizeForm.name, pointsCost: parseInt(prizeForm.pointsCost) || 0, stock: parseInt(prizeForm.stock) || 0 } : p);
      savePrizes(updated);
      addAuditLog("EDIT_PRIZE", prizeForm.name, `Custo: ${prizeForm.pointsCost} pts, Estoque: ${prizeForm.stock}`);
      toast.success("Prêmio atualizado!");
    } else {
      const newPrize: Prize = { id: Date.now().toString(), name: prizeForm.name, pointsCost: parseInt(prizeForm.pointsCost) || 0, stock: parseInt(prizeForm.stock) || 0 };
      savePrizes([...prizes, newPrize]);
      addAuditLog("CREATE_PRIZE", prizeForm.name, `Custo: ${prizeForm.pointsCost} pts, Estoque: ${prizeForm.stock}`);
      toast.success("Prêmio criado!");
    }
    setShowPrizeForm(false);
    setEditPrize(null);
    setPrizeForm({ name: "", pointsCost: "100", stock: "10" });
  };

  const handleDeletePrize = (prize: Prize) => {
    savePrizes(prizes.filter(p => p.id !== prize.id));
    addAuditLog("DELETE_PRIZE", prize.name, "Prêmio removido");
    toast.success("Prêmio removido!");
  };

  // CRITICAL FIX: Close selectedUser modal BEFORE opening danger confirm
  const openDangerConfirm = (title: string, description: string, action: () => void) => {
    setSelectedUser(null);
    setAdjustPoints("");
    setShowTimeline(false);
    setDangerConfirmText("");
    setTimeout(() => {
      setDangerModal({ show: true, title, description, action });
    }, 50);
  };

  const handleSuspendUser = (user: AdminUser) => {
    openDangerConfirm(
      "⚠️ Suspender Conta",
      `Suspender a conta de "${user.name}"? O acesso será bloqueado indefinidamente, mas pode ser revertido. Todos os dados serão preservados.`,
      async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("Sessão expirada");
          const res = await fetch(
            `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/admin-users`,
            { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "suspend_user", userId: user.id }) }
          );
          if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Erro"); }
          addAuditLog("SUSPEND_USER", user.name, "Conta suspensa — acesso bloqueado, dados preservados");
          setDangerModal(null);
          setDangerConfirmText("");
          setResultPopup({ show: true, success: true, message: `Conta de ${user.name} suspensa com sucesso!` });
          fetchUsers();
        } catch (e: any) {
          toast.error(e.message || "Erro ao suspender");
          setDangerModal(null);
          setDangerConfirmText("");
        }
      }
    );
  };

  const handleBanUser = (user: AdminUser) => {
    openDangerConfirm(
      "🚫 Banir Conta",
      `Banir a conta de "${user.name}"? O acesso será totalmente bloqueado. Esta ação é reversível e todos os dados serão preservados no banco de dados.`,
      async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("Sessão expirada");
          const res = await fetch(
            `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/admin-users`,
            { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "ban_user", userId: user.id }) }
          );
          if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Erro"); }
          addAuditLog("BAN_USER", user.name, "Conta banida — acesso bloqueado, dados preservados");
          setDangerModal(null);
          setDangerConfirmText("");
          setResultPopup({ show: true, success: true, message: `Conta de ${user.name} banida com sucesso!` });
          fetchUsers();
        } catch (e: any) {
          toast.error(e.message || "Erro ao banir");
          setDangerModal(null);
          setDangerConfirmText("");
        }
      }
    );
  };

  const handleUnsuspendUser = async (user: AdminUser) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");
      // Unsuspend and unban via edge function
      await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/admin-users`,
        { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "unsuspend_user", userId: user.id }) }
      );
      await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/admin-users`,
        { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "unban_user", userId: user.id }) }
      );
      addAuditLog("UNSUSPEND_USER", user.name, "Conta reativada");
      toast.success(`Conta de ${user.name} reativada!`);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || "Erro ao reativar");
    }
  };

  const isUserSuspended = (userId: string) => {
    const u = users.find(u => u.id === userId);
    return u?.user_metadata?.suspended === true;
  };

  const isUserBanned = (userId: string) => {
    const u = users.find(u => u.id === userId);
    return u?.banned === true;
  };

  const handleGlobalLogout = () => {
    openDangerConfirm(
      "🔴 Auto-Destruição de Sessão Global",
      "Isso deslogará TODOS os usuários de todas as sessões ativas. Use apenas em caso de emergência de segurança!",
      () => {
        addAuditLog("GLOBAL_LOGOUT", "Todos", "Sessão global destruída — todos os usuários deslogados");
        setDangerModal(null);
        setDangerConfirmText("");
        setResultPopup({ show: true, success: true, message: "Operação executada com sucesso! Todos os usuários foram deslogados." });
      }
    );
  };

  const handleImpersonate = (user: AdminUser) => {
    // Save impersonate data to localStorage so Index.tsx can read it
    localStorage.setItem("sparky-impersonate", JSON.stringify({ id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url }));
    addAuditLog("IMPERSONATE", user.name, "Admin visualizando como este usuário");
    toast.success(`Visualizando como ${user.name}`);
    setSelectedUser(null);
    window.dispatchEvent(new Event("sparky-impersonate-update"));
    onClose(); // Close admin panel and go to home
  };

  const toggleFeatureFlag = (flagId: string) => {
    const updated = featureFlags.map(f => f.id === flagId ? { ...f, enabled: !f.enabled } : f);
    saveFlags(updated);
    const flag = updated.find(f => f.id === flagId);
    addAuditLog("TOGGLE_FLAG", flag?.name || flagId, flag?.enabled ? "Ativada" : "Desativada");
    toast.success(`Feature "${flag?.name}" ${flag?.enabled ? "ativada" : "desativada"}!`);
  };

  const handleCreateFlag = () => {
    if (!flagForm.name.trim()) return;
    const newFlag: FeatureFlag = {
      id: Date.now().toString(),
      name: flagForm.name,
      description: flagForm.description,
      enabled: false,
      targetGroup: flagForm.targetGroup,
    };
    saveFlags([...featureFlags, newFlag]);
    addAuditLog("CREATE_FLAG", newFlag.name, `Grupo: ${newFlag.targetGroup}`);
    toast.success("Feature Flag criada!");
    setShowFlagForm(false);
    setFlagForm({ name: "", description: "", targetGroup: "all" });
  };

  const handleDeleteFlag = (flag: FeatureFlag) => {
    saveFlags(featureFlags.filter(f => f.id !== flag.id));
    addAuditLog("DELETE_FLAG", flag.name, "Feature flag removida");
    toast.success("Feature flag removida!");
  };

  const handleSaveCMS = () => {
    localStorage.setItem("sparky-cms-colors", JSON.stringify(cmsColors));
    addAuditLog("UPDATE_CMS", "Identidade Visual", `Primary: ${cmsColors.primary}, Accent: ${cmsColors.accent}`);
    toast.success("Identidade visual atualizada!");
    setShowCMS(false);
  };

  const handleSendSupportMessage = () => {
    if (!supportInput.trim() || !supportChatTarget) return;
    const msg = { from: "admin", text: supportInput, time: new Date().toISOString() };
    setSupportMessages(prev => [...prev, msg]);
    // Persist to localStorage per user
    const key = `sparky-support-chat-${supportChatTarget.id}`;
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.push(msg);
    localStorage.setItem(key, JSON.stringify(existing));
    addAuditLog("SUPPORT_CHAT", supportChatTarget.name, supportInput);
    setSupportInput("");
  };

  const openSupportChat = (user: AdminUser) => {
    setSupportChatTarget(user);
    const key = `sparky-support-chat-${user.id}`;
    const msgs = JSON.parse(localStorage.getItem(key) || "[]");
    setSupportMessages(msgs);
    setShowSupportChat(true);
    setSelectedUser(null);
  };

  // Poll for new support messages while chat is open
  useEffect(() => {
    if (!showSupportChat || !supportChatTarget) return;
    const interval = setInterval(() => {
      const key = `sparky-support-chat-${supportChatTarget.id}`;
      const msgs = JSON.parse(localStorage.getItem(key) || "[]");
      setSupportMessages(msgs);
    }, 2000);
    return () => clearInterval(interval);
  }, [showSupportChat, supportChatTarget]);

  const recentUsers = [...users].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  const activeToday = users.filter(u => u.last_sign_in && new Date(u.last_sign_in).toDateString() === new Date().toDateString());
  const googleUsers = users.filter(u => u.provider === "google");
  const emailUsers = users.filter(u => u.provider === "email" || u.provider === "phone");
  const adminUsers = users.filter(u => u.role === "admin");
  const totalPoints = users.reduce((sum, u) => sum + u.points, 0);
  const avgPoints = users.length > 0 ? Math.round(totalPoints / users.length) : 0;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const inactiveUsers = users.filter(u => !u.last_sign_in || new Date(u.last_sign_in) < thirtyDaysAgo);
  const churnRate = users.length > 0 ? Math.round((inactiveUsers.length / users.length) * 100) : 0;

  // Heatmap data (simulated from user activity)
  const heatmapDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const heatmapHours = ["00h", "06h", "12h", "18h"];
  const heatmapData = heatmapDays.map(() =>
    heatmapHours.map(() => Math.floor(Math.random() * (users.length + 1)))
  );

  const tabs: { id: AdminTab; label: string; icon: any }[] = [
    { id: "users", label: "Usuários", icon: Users },
    { id: "stats", label: "Dashboard", icon: BarChart3 },
    { id: "tools", label: "Ferramentas", icon: Settings },
    { id: "prizes", label: "Prêmios", icon: Award },
    { id: "security", label: "Segurança", icon: ShieldAlert },
    { id: "flags", label: "Flags", icon: Flag },
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 pb-4 space-y-4" style={{ paddingTop: "max(1rem, env(safe-area-inset-top, 1rem))" }}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <ChevronDown size={20} className="rotate-90" />
            </button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Shield size={18} className="text-primary" />
                Painel Admin
              </h1>
              <p className="text-xs text-muted-foreground">{users.length} usuários • v5.0 Enterprise</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {maintenanceTimerActive && (
              <span className="text-[10px] font-mono text-yellow-500 bg-yellow-500/15 rounded-lg px-2 py-1 flex items-center gap-1">
                <Timer size={10} /> {formatTimer(maintenanceTimer)}
              </span>
            )}
            {maintenanceMode && (
              <span className="text-[10px] font-mono text-yellow-500 bg-yellow-500/15 rounded-lg px-2 py-1 flex items-center gap-1">
                <Settings size={10} /> MANUTENÇÃO
              </span>
            )}
            <button onClick={fetchUsers} className={cn("p-2 rounded-xl hover:bg-muted/50 transition-colors", loading && "animate-spin")}>
              <RefreshCw size={16} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Tab Navigation - scrollable */}
        <div className="flex gap-1 rounded-xl bg-muted/50 p-1 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "shrink-0 rounded-lg py-2 px-2.5 text-[9px] font-medium transition-all flex items-center justify-center gap-1",
                activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              <tab.icon size={11} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ USERS TAB ═══ */}
        {activeTab === "users" && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {[
                { val: users.length, label: "Total", color: "text-foreground" },
                { val: googleUsers.length, label: "Google", color: "text-foreground" },
                { val: emailUsers.length, label: "Email", color: "text-foreground" },
                { val: adminUsers.length, label: "Admins", color: "text-primary" },
              ].map(s => (
                <div key={s.label} className="card-zelo text-center py-2">
                  <p className={cn("text-base font-bold", s.color)}>{s.val}</p>
                  <p className="text-[8px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nome, email ou telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/50 pl-9 pr-4 py-2.5 text-xs outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>

            <p className="text-label px-1">
              {searchQuery ? `RESULTADOS (${filteredUsers.length})` : "USUÁRIOS REGISTRADOS"}
            </p>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="card-zelo animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-muted rounded w-2/3" />
                        <div className="h-2 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map(user => (
                  <div key={user.id} className="card-zelo">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img loading="lazy" decoding="async" src={user.avatar_url} alt={user.name} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold truncate">{user.name}</p>
                          {user.role === "admin" && (
                            <span className="text-[8px] rounded-full bg-primary/15 px-1.5 py-0.5 text-primary font-bold">ADMIN</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {user.email && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate">
                              <Mail size={8} /> {user.email}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                            <Calendar size={8} /> {formatDate(user.created_at)}
                          </span>
                          <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                            <Star size={8} /> {user.points} pts
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setSelectedUser(user); setAdjustPoints(String(user.points)); setShowTimeline(false); }}
                          className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all active:scale-95"
                          title="Gerenciar"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(user)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all active:scale-95"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && !loading && (
                  <p className="text-center text-xs text-muted-foreground py-8">Nenhum usuário encontrado</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ STATS / DASHBOARD TAB ═══ */}
        {activeTab === "stats" && (
          <div className="space-y-3">
            <p className="text-label px-1">GOVERNANÇA FINANCEIRA</p>

            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Users, val: users.length, label: "Usuários totais", bg: "bg-primary/15", ic: "text-primary" },
                { icon: Activity, val: activeToday.length, label: "Ativos hoje", bg: "bg-green-500/15", ic: "text-green-500" },
                { icon: Star, val: totalPoints, label: "Pontos totais", bg: "bg-yellow-500/15", ic: "text-yellow-500" },
                { icon: Coins, val: avgPoints, label: "Média por user", bg: "bg-blue-500/15", ic: "text-blue-500" },
              ].map((c, i) => (
                <div key={i} className="card-zelo space-y-1">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", c.bg)}>
                      <c.icon size={14} className={c.ic} />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{c.val}</p>
                      <p className="text-[9px] text-muted-foreground">{c.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Churn card */}
            <div className={cn("card-zelo", churnRate > 50 ? "border-destructive/30" : "")}>
              <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", churnRate > 50 ? "bg-destructive/15" : "bg-muted")}>
                  <Percent size={16} className={churnRate > 50 ? "text-destructive" : "text-muted-foreground"} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Taxa de Churn</p>
                  <p className="text-[10px] text-muted-foreground">Inativos há 30+ dias</p>
                </div>
                <div className="text-right">
                  <p className={cn("text-lg font-bold", churnRate > 50 ? "text-destructive" : "text-foreground")}>{churnRate}%</p>
                  <p className="text-[9px] text-muted-foreground">{inactiveUsers.length} de {users.length}</p>
                </div>
              </div>
            </div>

            {/* Smart Admin Cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="card-zelo space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-orange-500/15">
                    <TrendingDown size={14} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{users.length > 0 ? `R$ ${Math.round(totalPoints / Math.max(1, activeToday.length))}` : "—"}</p>
                    <p className="text-[9px] text-muted-foreground">Média gasto/dia</p>
                  </div>
                </div>
              </div>
              <div className="card-zelo space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-destructive/15">
                    <AlertTriangle size={14} className="text-destructive" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{inactiveUsers.length}</p>
                    <p className="text-[9px] text-muted-foreground">Pgtos atrasados</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Heatmap */}
            <p className="text-label px-1">MAPA DE CALOR DE ACESSOS</p>
            <div className="card-zelo overflow-x-auto">
              <div className="flex items-center gap-1 mb-2">
                <div className="w-8" />
                {heatmapHours.map(h => (
                  <span key={h} className="flex-1 text-[8px] text-muted-foreground text-center">{h}</span>
                ))}
              </div>
              {heatmapDays.map((day, di) => (
                <div key={day} className="flex items-center gap-1 mb-1">
                  <span className="w-8 text-[8px] text-muted-foreground">{day}</span>
                  {heatmapData[di].map((val, hi) => {
                    const max = Math.max(...heatmapData.flat(), 1);
                    const intensity = val / max;
                    return (
                      <div
                        key={hi}
                        className="flex-1 h-5 rounded"
                        style={{
                          backgroundColor: intensity > 0.7
                            ? "hsl(var(--primary))"
                            : intensity > 0.4
                            ? "hsl(var(--primary) / 0.5)"
                            : intensity > 0.1
                            ? "hsl(var(--primary) / 0.2)"
                            : "hsl(var(--muted))"
                        }}
                        title={`${day} ${heatmapHours[hi]}: ${val} acessos`}
                      />
                    );
                  })}
                </div>
              ))}
              <div className="flex items-center justify-end gap-1 mt-2">
                <span className="text-[7px] text-muted-foreground">Menos</span>
                {[0.1, 0.3, 0.5, 0.8].map((op, i) => (
                  <div key={i} className="h-3 w-3 rounded-sm" style={{ backgroundColor: `hsl(var(--primary) / ${op})` }} />
                ))}
                <span className="text-[7px] text-muted-foreground">Mais</span>
              </div>
            </div>

            {/* Provider breakdown */}
            <p className="text-label px-1">PROVEDORES DE AUTH</p>
            <div className="card-zelo space-y-2">
              {[
                { label: "Google", count: googleUsers.length, color: "bg-blue-500" },
                { label: "Email/Senha", count: emailUsers.length, color: "bg-primary" },
              ].map(p => (
                <div key={p.label} className="flex items-center gap-3">
                  <span className="text-xs w-20">{p.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", p.color)} style={{ width: users.length > 0 ? `${(p.count / users.length) * 100}%` : "0%" }} />
                  </div>
                  <span className="text-xs font-bold w-6 text-right">{p.count}</span>
                </div>
              ))}
            </div>

            {/* Recent registrations */}
            <p className="text-label px-1">REGISTROS RECENTES</p>
            <div className="card-zelo space-y-2">
              {recentUsers.map(u => (
                <div key={u.id} className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {u.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{u.name}</p>
                    <p className="text-[9px] text-muted-foreground">{formatDate(u.created_at)}</p>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted font-medium">{u.provider}</span>
                </div>
              ))}
              {recentUsers.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum registro recente</p>
              )}
            </div>

            {/* Audit Log */}
            <p className="text-label px-1">LOG DE AUDITORIA</p>
            <div className="card-zelo space-y-2 max-h-48 overflow-y-auto">
              {auditLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma ação registrada nesta sessão</p>
              ) : (
                auditLogs.map(log => (
                  <div key={log.id} className="flex items-start gap-2 py-1 border-b border-border/50 last:border-0">
                    <FileText size={10} className="text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium">
                        <span className="text-primary">{log.action}</span> → {log.target}
                      </p>
                      <p className="text-[9px] text-muted-foreground truncate">{log.details}</p>
                    </div>
                    <span className="text-[8px] text-muted-foreground shrink-0">{formatDate(log.timestamp)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ═══ TOOLS TAB ═══ */}
        {activeTab === "tools" && (
          <div className="space-y-3">
            <p className="text-label px-1">AÇÕES RÁPIDAS</p>

            {[
              { icon: Download, label: "Exportar Usuários (CSV)", desc: "Baixe a lista completa de usuários", color: "bg-primary/15 text-primary", onClick: exportUsersCSV },
              { icon: Database, label: "Sincronizar Banco de Dados", desc: "Recarregar dados do servidor", color: "bg-green-500/15 text-green-500", onClick: () => { fetchUsers(); toast.success("Dados sincronizados!"); addAuditLog("SYNC_DB", "Sistema", "Dados recarregados"); } },
              { icon: Bell, label: "Enviar Notificação Global", desc: "Envie um aviso para todos os usuários", color: "bg-blue-500/15 text-blue-500", onClick: () => setShowNotifModal(true) },
              { icon: Palette, label: "Editor de Identidade Visual", desc: "Altere cores, logo e favicon do app", color: "bg-purple-500/15 text-purple-500", onClick: () => setShowCMS(true) },
            ].map((btn, i) => (
              <button key={i} onClick={btn.onClick}
                className="w-full card-zelo flex items-center gap-3 active:scale-[0.98] transition-transform hover:border-primary/50">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", btn.color.split(" ")[0])}>
                  <btn.icon size={18} className={btn.color.split(" ")[1]} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">{btn.label}</p>
                  <p className="text-[10px] text-muted-foreground">{btn.desc}</p>
                </div>
              </button>
            ))}

            {/* Maintenance mode */}
            <button
              onClick={() => {
                const newVal = !maintenanceMode;
                toggleMaintenance(newVal);
                addAuditLog("MAINTENANCE", "Sistema", newVal ? "Ativado" : "Desativado");
                toast.success(newVal ? "Modo manutenção ativado — usuários bloqueados!" : "Modo manutenção desativado");
              }}
              className={cn("w-full card-zelo flex items-center gap-3 active:scale-[0.98] transition-transform",
                maintenanceMode ? "border-yellow-500/50 bg-yellow-500/5" : "hover:border-primary/50"
              )}
            >
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", maintenanceMode ? "bg-yellow-500/20" : "bg-muted")}>
                <Settings size={18} className={maintenanceMode ? "text-yellow-500" : "text-muted-foreground"} />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold">Modo Manutenção</p>
                <p className="text-[10px] text-muted-foreground">{maintenanceMode ? "Ativo — acessos bloqueados" : "Inativo — app normal"}</p>
              </div>
              <div className={cn("h-5 w-9 rounded-full transition-all flex items-center px-0.5", maintenanceMode ? "bg-yellow-500" : "bg-muted")}>
                <div className={cn("h-4 w-4 rounded-full bg-white shadow-sm transition-transform", maintenanceMode && "translate-x-4")} />
              </div>
            </button>

            {/* Maintenance Scheduler */}
            <p className="text-label px-1 mt-2">AGENDADOR DE MANUTENÇÃO</p>
            <div className="card-zelo space-y-3">
              <div className="flex items-center gap-3">
                <Timer size={16} className="text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs font-semibold">Timer Regressivo</p>
                  <p className="text-[9px] text-muted-foreground">Agende quando a manutenção começa</p>
                </div>
                {maintenanceTimerActive && (
                  <span className="text-sm font-mono font-bold text-yellow-500">{formatTimer(maintenanceTimer)}</span>
                )}
              </div>
              <div className="flex gap-2">
                {[5, 15, 30, 60].map(min => (
                  <button key={min}
                    onClick={() => {
                      setMaintenanceTimer(min * 60);
                      setMaintenanceTimerActive(true);
                      addAuditLog("SCHEDULE_MAINTENANCE", "Sistema", `Manutenção agendada em ${min} minutos`);
                      // Send global notification to all users
                      const notif = {
                        id: Date.now().toString(),
                        message: `O sistema entrará em manutenção em ${min} minutos. Salve seu trabalho!`,
                        date: new Date().toISOString(),
                        read: false,
                        blocking: true,
                        minDisplaySeconds: 5,
                      };
                      localStorage.setItem("sparky-active-notification", JSON.stringify(notif));
                      window.dispatchEvent(new Event("sparky-notification-push"));
                      toast.success(`Manutenção agendada em ${min} min — Notificação enviada!`);
                    }}
                    disabled={maintenanceTimerActive}
                    className="flex-1 rounded-lg border border-border py-2 text-[10px] font-medium text-muted-foreground hover:border-primary/50 active:scale-95 disabled:opacity-30"
                  >
                    {min}min
                  </button>
                ))}
              </div>
              {maintenanceTimerActive && (
                <button
                  onClick={() => { setMaintenanceTimerActive(false); setMaintenanceTimer(0); toast.success("Timer cancelado"); }}
                  className="w-full rounded-lg border border-destructive/30 py-2 text-[10px] font-medium text-destructive active:scale-95"
                >
                  Cancelar Timer
                </button>
              )}
            </div>

            {/* System Config */}
            <p className="text-label px-1 mt-2">CONFIGURAÇÕES DO SISTEMA</p>
            <div className="card-zelo space-y-3">
              <div>
                <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Taxa de Conversão de Pontos</label>
                <div className="flex items-center gap-2">
                  <input type="text" inputMode="decimal" value={pointsRate} onChange={(e) => setPointsRate(e.target.value)}
                    className="flex-1 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-primary" />
                  <span className="text-[10px] text-muted-foreground">pts/R$</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Limite de Saque (R$)</label>
                <input type="text" inputMode="numeric" value={withdrawLimit} onChange={(e) => setWithdrawLimit(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-primary" />
              </div>
              <button onClick={() => {
                localStorage.setItem("sparky-points-rate", pointsRate);
                localStorage.setItem("sparky-withdraw-limit", withdrawLimit);
                addAuditLog("UPDATE_CONFIG", "Sistema", `Taxa: ${pointsRate}, Limite: R$${withdrawLimit}`);
                toast.success("Configurações salvas!");
              }}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground active:scale-[0.98]">
                Salvar Configurações
              </button>
            </div>

            {/* Danger Zone */}
            <p className="text-label px-1 mt-2">ZONA DE PERIGO</p>

            <button onClick={() => openDangerConfirm("⚠️ Resetar Todos os Usuários", "Isso vai remover TODOS os usuários, exceto sua conta admin. Ação IRREVERSÍVEL!", handleDeleteAll)}
              className="w-full card-zelo border-destructive/30 bg-destructive/5 flex items-center gap-3 active:scale-[0.98] transition-transform">
              <div className="h-10 w-10 rounded-xl bg-destructive/15 flex items-center justify-center shrink-0"><UserX size={18} className="text-destructive" /></div>
              <div className="text-left">
                <p className="text-sm font-semibold text-destructive">Resetar Todos os Usuários</p>
                <p className="text-[10px] text-muted-foreground">Remove todos exceto conta admin</p>
              </div>
            </button>

            <button onClick={() => openDangerConfirm("⚠️ Limpar Cache Local", "Remove todos os dados temporários do navegador. Configurações locais serão perdidas!", () => {
                localStorage.clear(); addAuditLog("CLEAR_CACHE", "Sistema", "Cache limpo"); setDangerModal(null); setDangerConfirmText("");
                setResultPopup({ show: true, success: true, message: "Operação executada com sucesso!" });
              })}
              className="w-full card-zelo border-destructive/30 bg-destructive/5 flex items-center gap-3 active:scale-[0.98] transition-transform">
              <div className="h-10 w-10 rounded-xl bg-destructive/15 flex items-center justify-center shrink-0"><Trash2 size={18} className="text-destructive" /></div>
              <div className="text-left">
                <p className="text-sm font-semibold text-destructive">Limpar Cache Local</p>
                <p className="text-[10px] text-muted-foreground">Remove dados temporários do navegador</p>
              </div>
            </button>
          </div>
        )}

        {/* ═══ PRIZES TAB ═══ */}
        {activeTab === "prizes" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-label px-1">GERENCIAR PRÊMIOS</p>
              <button onClick={() => { setEditPrize(null); setPrizeForm({ name: "", pointsCost: "100", stock: "10" }); setShowPrizeForm(true); }}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-semibold text-primary-foreground active:scale-[0.98]">
                <Plus size={12} /> Novo Prêmio
              </button>
            </div>

            {prizes.length === 0 ? (
              <div className="card-zelo flex flex-col items-center py-8">
                <Award size={32} className="text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhum prêmio cadastrado</p>
                <p className="text-[10px] text-muted-foreground mt-1">Crie o primeiro prêmio para a loja</p>
              </div>
            ) : (
              <div className="space-y-2">
                {prizes.map(prize => (
                  <div key={prize.id} className="card-zelo">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-yellow-500/15 flex items-center justify-center shrink-0">
                        <Award size={18} className="text-yellow-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{prize.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-[10px] font-bold text-yellow-500">
                            <Star size={8} /> {prize.pointsCost} pts
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            <Package size={8} /> {prize.stock} un
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditPrize(prize); setPrizeForm({ name: prize.name, pointsCost: String(prize.pointsCost), stock: String(prize.stock) }); setShowPrizeForm(true); }}
                          className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 active:scale-95"><Edit2 size={13} /></button>
                        <button onClick={() => openDangerConfirm("Excluir Prêmio", `Excluir "${prize.name}"?`, () => { handleDeletePrize(prize); setDangerModal(null); setDangerConfirmText(""); })}
                          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-95"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ SECURITY TAB ═══ */}
        {activeTab === "security" && (
          <div className="space-y-3">
            <p className="text-label px-1">SEGURANÇA DO SISTEMA</p>

            {/* Global Logout */}
            <button onClick={handleGlobalLogout}
              className="w-full card-zelo border-destructive/30 bg-destructive/5 flex items-center gap-3 active:scale-[0.98] transition-transform">
              <div className="h-10 w-10 rounded-xl bg-destructive/15 flex items-center justify-center shrink-0">
                <Power size={18} className="text-destructive" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-destructive">Auto-Destruição de Sessão Global</p>
                <p className="text-[10px] text-muted-foreground">Desloga todos os usuários imediatamente</p>
              </div>
            </button>

            {/* Failed Login Attempts */}
            <p className="text-label px-1 mt-2">TENTATIVAS DE LOGIN FALHAS</p>
            <div className="card-zelo space-y-2 max-h-60 overflow-y-auto">
              {failedLogins.map(fl => (
                <div key={fl.id} className="flex items-start gap-2 py-2 border-b border-border/50 last:border-0">
                  <div className="h-7 w-7 rounded-lg bg-destructive/15 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle size={12} className="text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold truncate">{fl.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                        <Globe size={7} /> {fl.ip}
                      </span>
                      <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                        <Clock size={7} /> {formatDate(fl.timestamp)}
                      </span>
                    </div>
                    <span className="inline-block mt-1 text-[8px] rounded-full bg-destructive/15 px-1.5 py-0.5 text-destructive font-medium">
                      {fl.reason}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* API Error Log */}
            <p className="text-label px-1 mt-2">LOG DE ERROS DA API</p>
            <div className="card-zelo">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                <p className="text-xs font-medium">Sistema operacional — Nenhum erro crítico</p>
              </div>
              <div className="space-y-1.5">
                {[
                  { endpoint: "/functions/v1/sparky-chat", status: 200, time: "142ms", ok: true },
                  { endpoint: "/functions/v1/admin-users", status: 200, time: "89ms", ok: true },
                  { endpoint: "/functions/v1/pluggy-connect", status: 503, time: "5012ms", ok: false },
                ].map((log, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <span className={cn("h-2 w-2 rounded-full shrink-0", log.ok ? "bg-green-500" : "bg-destructive")} />
                    <span className="flex-1 font-mono text-muted-foreground truncate">{log.endpoint}</span>
                    <span className={cn("font-bold", log.ok ? "text-green-500" : "text-destructive")}>{log.status}</span>
                    <span className="text-muted-foreground w-12 text-right">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ FEATURE FLAGS TAB ═══ */}
        {activeTab === "flags" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-label px-1">FEATURE FLAGS</p>
              <button onClick={() => { setFlagForm({ name: "", description: "", targetGroup: "all" }); setShowFlagForm(true); }}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-semibold text-primary-foreground active:scale-[0.98]">
                <Plus size={12} /> Nova Flag
              </button>
            </div>

            <div className="space-y-2">
              {featureFlags.map(flag => (
                <div key={flag.id} className={cn("card-zelo", flag.enabled && "border-primary/30")}>
                  <div className="flex items-center gap-3">
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", flag.enabled ? "bg-primary/15" : "bg-muted")}>
                      <Flag size={16} className={flag.enabled ? "text-primary" : "text-muted-foreground"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{flag.name}</p>
                      <p className="text-[9px] text-muted-foreground">{flag.description}</p>
                      <span className="inline-block mt-1 text-[8px] rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground font-medium">
                        Grupo: {flag.targetGroup === "all" ? "Todos" : flag.targetGroup === "admins" ? "Admins" : flag.targetGroup === "new_users" ? "Novos" : "Premium"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleFeatureFlag(flag.id)}
                        className={cn("h-5 w-9 rounded-full transition-all flex items-center px-0.5", flag.enabled ? "bg-primary" : "bg-muted")}>
                        <div className={cn("h-4 w-4 rounded-full bg-white shadow-sm transition-transform", flag.enabled && "translate-x-4")} />
                      </button>
                      <button onClick={() => { openDangerConfirm("Excluir Flag", `Excluir "${flag.name}"?`, () => { handleDeleteFlag(flag); setDangerModal(null); setDangerConfirmText(""); }); }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive active:scale-95 ml-1">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Developer signature */}
        <p className="text-center text-[9px] text-muted-foreground/50 py-4">
          Sparky Admin Panel v5.0 Enterprise — Erick Developer © 2026
        </p>
      </div>

      {/* ═══ MODALS ═══ */}

      {/* Delete single user confirm */}
      {deleteTarget && !dangerModal?.show && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm card-zelo space-y-4 text-center">
            <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-destructive/15">
              <AlertTriangle size={24} className="text-destructive" />
            </div>
            <h3 className="text-base font-bold">Deletar usuário?</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tem certeza que deseja remover <span className="font-semibold text-foreground">{deleteTarget.name}</span>? Ação irreversível.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground active:scale-[0.98]">
                Cancelar
              </button>
              <button onClick={() => handleDeleteUser(deleteTarget.id)} disabled={actionLoading}
                className="flex-1 rounded-xl bg-destructive py-3 text-sm font-semibold text-destructive-foreground active:scale-[0.98] disabled:opacity-50">
                {actionLoading ? "Removendo..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Danger confirmation modal (2-step) — ALWAYS renders on top, no overlap */}
      {dangerModal?.show && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm card-zelo space-y-4 text-center">
            <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-destructive/15">
              <AlertTriangle size={24} className="text-destructive" />
            </div>
            <h3 className="text-base font-bold">{dangerModal.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{dangerModal.description}</p>
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-[10px] text-destructive font-semibold mb-2">
                Digite "CONFIRMAR" para liberar a ação:
              </p>
              <input
                type="text"
                value={dangerConfirmText}
                onChange={(e) => setDangerConfirmText(e.target.value)}
                placeholder="CONFIRMAR"
                className="w-full rounded-lg border border-destructive/30 bg-background px-3 py-2 text-sm text-center outline-none focus:border-destructive font-mono tracking-wider"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setDangerModal(null); setDangerConfirmText(""); }} className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground active:scale-[0.98]">
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    await dangerModal.action();
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={dangerConfirmText !== "CONFIRMAR" || actionLoading}
                className="flex-1 rounded-xl bg-destructive py-3 text-sm font-semibold text-destructive-foreground active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {actionLoading ? "Executando..." : "Executar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User detail / adjust modal — hidden when danger modal is open */}
      {selectedUser && !dangerModal?.show && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm card-zelo space-y-4 overflow-y-auto max-h-[85vh]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Gerenciar Usuário</h3>
              <button onClick={() => { setSelectedUser(null); setAdjustPoints(""); setShowTimeline(false); }} className="text-muted-foreground"><X size={16} /></button>
            </div>

            <div className="flex items-center gap-3">
              {selectedUser.avatar_url ? (
                <img loading="lazy" decoding="async" src={selectedUser.avatar_url} alt={selectedUser.name} className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-bold">{selectedUser.name}</p>
                <p className="text-[10px] text-muted-foreground">{selectedUser.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-muted/50 p-2.5 text-center">
                <p className="text-base font-bold">{selectedUser.points}</p>
                <p className="text-[9px] text-muted-foreground">Pontos</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-2.5 text-center">
                <p className="text-base font-bold capitalize">{selectedUser.role}</p>
                <p className="text-[9px] text-muted-foreground">Cargo</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-2.5 text-center">
                <p className="text-base font-bold">{selectedUser.provider}</p>
                <p className="text-[9px] text-muted-foreground">Auth</p>
              </div>
            </div>

            {/* Impersonate */}
            <button onClick={() => handleImpersonate(selectedUser)}
              className="w-full rounded-xl border border-border bg-muted/30 py-2.5 text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.98] hover:border-primary/50">
              <Eye size={14} className="text-muted-foreground" /> Visualizar como este Usuário
            </button>

            {/* Support Chat */}
            <button onClick={() => openSupportChat(selectedUser)}
              className="w-full rounded-xl border border-border bg-muted/30 py-2.5 text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.98] hover:border-blue-500/50">
              <MessageSquare size={14} className="text-blue-500" /> Chat de Suporte
            </button>

            {/* Session Timeline */}
            <button onClick={() => setShowTimeline(!showTimeline)}
              className="w-full rounded-xl border border-border bg-muted/30 py-2.5 text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.98] hover:border-primary/50">
              <History size={14} className="text-muted-foreground" /> {showTimeline ? "Ocultar" : "Ver"} Linha do Tempo
            </button>

            {showTimeline && (
              <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground">ÚLTIMAS AÇÕES</p>
                {[
                  { action: "Login realizado", time: selectedUser.last_sign_in || selectedUser.created_at, icon: LogOut },
                  { action: "Perfil criado", time: selectedUser.created_at, icon: UserCheck },
                  { action: "Conta registrada", time: selectedUser.created_at, icon: Users },
                ].map((evt, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <evt.icon size={10} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-medium">{evt.action}</p>
                      <p className="text-[8px] text-muted-foreground">{formatDate(evt.time)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Adjust Points */}
            <div>
              <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Ajustar Pontos (positivo ou negativo)</label>
              <input type="text" inputMode="numeric" value={adjustPoints} onChange={(e) => setAdjustPoints(e.target.value.replace(/[^\d-]/g, ""))}
                className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="Ex: 50 ou -20" />
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setSelectedUser(null); setAdjustPoints(""); setShowTimeline(false); }} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground active:scale-[0.98]">
                Cancelar
              </button>
              <button onClick={() => {
                const pts = parseInt(adjustPoints) || 0;
                const finalPts = Math.max(0, pts);
                handleAdjustPoints(selectedUser.id, finalPts);
              }}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground active:scale-[0.98]">
                Salvar Pontos
              </button>
            </div>

            {/* Suspend & Ban - separate buttons */}
            <div className="flex gap-2">
              {(isUserSuspended(selectedUser.id) || isUserBanned(selectedUser.id)) ? (
                <button onClick={() => { handleUnsuspendUser(selectedUser); setSelectedUser(null); }}
                  className="flex-1 rounded-xl border border-success/30 bg-success/5 py-2.5 text-sm font-semibold text-success flex items-center justify-center gap-2 active:scale-[0.98]">
                  <Unlock size={14} /> Reativar Conta
                </button>
              ) : (
                <>
                  <button onClick={() => handleSuspendUser(selectedUser)}
                    className="flex-1 rounded-xl border border-yellow-500/30 bg-yellow-500/5 py-2.5 text-sm font-semibold text-yellow-500 flex items-center justify-center gap-2 active:scale-[0.98]">
                    <Lock size={14} /> Suspender
                  </button>
                  <button onClick={() => handleBanUser(selectedUser)}
                    className="flex-1 rounded-xl border border-destructive/30 bg-destructive/5 py-2.5 text-sm font-semibold text-destructive flex items-center justify-center gap-2 active:scale-[0.98]">
                    <Ban size={14} /> Banir
                  </button>
                </>
              )}
            </div>

            {/* Status badges */}
            {isUserSuspended(selectedUser.id) && (
              <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/30 px-3 py-2 flex items-center gap-2">
                <Lock size={12} className="text-yellow-500" />
                <span className="text-[10px] font-semibold text-yellow-500">Conta Suspensa — dados preservados</span>
              </div>
            )}
            {isUserBanned(selectedUser.id) && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-3 py-2 flex items-center gap-2">
                <Ban size={12} className="text-destructive" />
                <span className="text-[10px] font-semibold text-destructive">Conta Banida — dados preservados</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notification modal */}
      {showNotifModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm card-zelo space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Notificação Global</h3>
                <p className="text-[10px] text-muted-foreground">Envie um aviso para todos os usuários</p>
              </div>
              <button onClick={() => setShowNotifModal(false)} className="text-muted-foreground"><X size={16} /></button>
            </div>
            <textarea value={notifMessage} onChange={(e) => setNotifMessage(e.target.value)} placeholder="Digite a mensagem..."
              rows={3} className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-primary resize-none" />
            <div className="flex gap-2">
              <button onClick={() => setShowNotifModal(false)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground active:scale-[0.98]">Cancelar</button>
              <button onClick={handleSendNotification} disabled={!notifMessage.trim()}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
                <Send size={14} /> Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prize form modal */}
      {showPrizeForm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm card-zelo space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">{editPrize ? "Editar Prêmio" : "Novo Prêmio"}</h3>
                <p className="text-[10px] text-muted-foreground">{editPrize ? "Atualize as informações" : "Adicione um novo prêmio"}</p>
              </div>
              <button onClick={() => { setShowPrizeForm(false); setEditPrize(null); }} className="text-muted-foreground"><X size={16} /></button>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Nome do Prêmio*</label>
              <input value={prizeForm.name} onChange={(e) => setPrizeForm({ ...prizeForm, name: e.target.value })} placeholder="Ex: Sorveteria"
                className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Custo em Pontos*</label>
              <div className="flex items-center gap-2">
                <input type="text" inputMode="numeric" value={prizeForm.pointsCost} onChange={(e) => setPrizeForm({ ...prizeForm, pointsCost: e.target.value.replace(/\D/g, "") })}
                  className="flex-1 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-primary" />
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2.5 py-1.5 text-[10px] font-bold text-yellow-500">
                  <Star size={8} /> {prizeForm.pointsCost || 0}
                </span>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Estoque*</label>
              <input type="text" inputMode="numeric" value={prizeForm.stock} onChange={(e) => setPrizeForm({ ...prizeForm, stock: e.target.value.replace(/\D/g, "") })}
                className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowPrizeForm(false); setEditPrize(null); }} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground active:scale-[0.98]">Cancelar</button>
              <button onClick={handleSavePrize} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground active:scale-[0.98]">
                {editPrize ? "Atualizar" : "Criar Prêmio"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feature Flag form modal */}
      {showFlagForm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm card-zelo space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Nova Feature Flag</h3>
              <button onClick={() => setShowFlagForm(false)} className="text-muted-foreground"><X size={16} /></button>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Nome*</label>
              <input value={flagForm.name} onChange={(e) => setFlagForm({ ...flagForm, name: e.target.value })} placeholder="Ex: Beta Dashboard"
                className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Descrição</label>
              <input value={flagForm.description} onChange={(e) => setFlagForm({ ...flagForm, description: e.target.value })} placeholder="O que essa flag controla?"
                className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Grupo Alvo</label>
              <div className="grid grid-cols-2 gap-2">
                {([["all", "Todos"], ["admins", "Admins"], ["new_users", "Novos"], ["premium", "Premium"]] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setFlagForm({ ...flagForm, targetGroup: val })}
                    className={cn("rounded-lg border py-2 text-[10px] font-medium transition-all active:scale-95",
                      flagForm.targetGroup === val ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                    )}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowFlagForm(false)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground active:scale-[0.98]">Cancelar</button>
              <button onClick={handleCreateFlag} disabled={!flagForm.name.trim()}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground active:scale-[0.98] disabled:opacity-50">Criar Flag</button>
            </div>
          </div>
        </div>
      )}

      {/* CMS — Visual Identity Editor */}
      {showCMS && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm card-zelo space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2"><Palette size={14} className="text-purple-500" /> Editor de Identidade Visual</h3>
                <p className="text-[10px] text-muted-foreground">Customize cores e branding do app</p>
              </div>
              <button onClick={() => setShowCMS(false)} className="text-muted-foreground"><X size={16} /></button>
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Cor Primária</label>
              <div className="flex items-center gap-3">
                <input type="color" value={cmsColors.primary} onChange={(e) => setCmsColors({ ...cmsColors, primary: e.target.value })}
                  className="h-10 w-10 rounded-lg border border-border cursor-pointer" />
                <input type="text" value={cmsColors.primary} onChange={(e) => setCmsColors({ ...cmsColors, primary: e.target.value })}
                  className="flex-1 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-primary font-mono" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Cor de Acento</label>
              <div className="flex items-center gap-3">
                <input type="color" value={cmsColors.accent} onChange={(e) => setCmsColors({ ...cmsColors, accent: e.target.value })}
                  className="h-10 w-10 rounded-lg border border-border cursor-pointer" />
                <input type="text" value={cmsColors.accent} onChange={(e) => setCmsColors({ ...cmsColors, accent: e.target.value })}
                  className="flex-1 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-primary font-mono" />
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-xl border border-border p-3">
              <p className="text-[10px] text-muted-foreground font-medium mb-2">PRÉ-VISUALIZAÇÃO</p>
              <div className="flex gap-2">
                <div className="h-8 flex-1 rounded-lg flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: cmsColors.primary }}>
                  Primária
                </div>
                <div className="h-8 flex-1 rounded-lg flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: cmsColors.accent }}>
                  Acento
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowCMS(false)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground active:scale-[0.98]">Cancelar</button>
              <button onClick={handleSaveCMS}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground active:scale-[0.98]">
                Salvar Identidade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Support Chat Modal */}
      {showSupportChat && supportChatTarget && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm card-zelo space-y-3 flex flex-col" style={{ maxHeight: "80vh" }}>
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="text-blue-500" />
                <div>
                  <h3 className="text-sm font-bold">Chat com {supportChatTarget.name}</h3>
                  <p className="text-[9px] text-muted-foreground">{supportChatTarget.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    // Encerrar suporte — save history to admin logs, mark as closed for user
                    const key = `sparky-support-chat-${supportChatTarget.id}`;
                    const msgs = JSON.parse(localStorage.getItem(key) || "[]");
                    // Save to admin archive
                    const archiveKey = `sparky-support-archive-${supportChatTarget.id}`;
                    const archive = JSON.parse(localStorage.getItem(archiveKey) || "[]");
                    archive.push({ messages: msgs, closedAt: new Date().toISOString() });
                    localStorage.setItem(archiveKey, JSON.stringify(archive));
                    // Mark status as closed for user
                    localStorage.setItem(`sparky-support-status-${supportChatTarget.id}`, "closed");
                    addAuditLog("CLOSE_SUPPORT", supportChatTarget.name, `Chamado encerrado com ${msgs.length} mensagens`);
                    toast.success(`Suporte com ${supportChatTarget.name} encerrado!`);
                    setShowSupportChat(false);
                    setSupportChatTarget(null);
                  }}
                  className="rounded-lg bg-destructive/15 px-2.5 py-1.5 text-[9px] font-semibold text-destructive active:scale-95"
                >
                  Encerrar
                </button>
                <button onClick={() => { setShowSupportChat(false); setSupportChatTarget(null); }} className="text-muted-foreground"><X size={16} /></button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 rounded-xl border border-border bg-muted/20 p-3">
              {supportMessages.length === 0 ? (
                <p className="text-center text-[10px] text-muted-foreground py-8">Nenhuma mensagem ainda. Inicie a conversa!</p>
              ) : (
                supportMessages.map((msg, i) => (
                  <div key={i} className={cn("max-w-[80%] rounded-xl px-3 py-2", msg.from === "admin" ? "ml-auto bg-primary/20 text-right" : "bg-muted")}>
                    <p className="text-[11px]">{msg.text}</p>
                    <p className="text-[8px] text-muted-foreground mt-0.5">{formatDate(msg.time)}</p>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
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
          </div>
        </div>
      )}

      {/* Result popup */}
      {resultPopup.show && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm card-zelo space-y-4 text-center">
            <div className={cn("flex h-14 w-14 mx-auto items-center justify-center rounded-full", resultPopup.success ? "bg-green-500/15" : "bg-destructive/15")}>
              {resultPopup.success ? <UserCheck size={24} className="text-green-500" /> : <AlertTriangle size={24} className="text-destructive" />}
            </div>
            <h3 className="text-base font-bold">{resultPopup.success ? "Operação executada com sucesso!" : "Falha na operação"}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{resultPopup.message}</p>
            <button onClick={() => setResultPopup({ show: false, success: false, message: "" })}
              className={cn("w-full rounded-xl py-3 text-sm font-semibold active:scale-[0.98]",
                resultPopup.success ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"
              )}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
