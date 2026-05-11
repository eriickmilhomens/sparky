// Cofrinhos (savings jars) — visual goals with deadline + monthly contribution suggestion
export interface Cofrinho {
  id: string;
  name: string;
  emoji: string;
  color: string; // hsl token expression e.g. "hsl(var(--primary))"
  target: number;
  saved: number;
  deadline?: string; // ISO date YYYY-MM-DD
  createdAt: string;
}

const KEY = "sparky-cofrinhos";

export const COFRINHO_PRESETS: Array<{ emoji: string; name: string; color: string }> = [
  { emoji: "🏝️", name: "Viagem", color: "hsl(var(--info))" },
  { emoji: "🚗", name: "Carro Novo", color: "hsl(var(--primary))" },
  { emoji: "🏠", name: "Casa Própria", color: "hsl(var(--success))" },
  { emoji: "💍", name: "Casamento", color: "hsl(var(--destructive))" },
  { emoji: "🎓", name: "Educação", color: "hsl(var(--warning))" },
  { emoji: "💻", name: "Notebook", color: "hsl(var(--accent-foreground))" },
  { emoji: "🛡️", name: "Reserva", color: "hsl(var(--success))" },
  { emoji: "🎁", name: "Presente", color: "hsl(var(--primary))" },
];

export const loadCofrinhos = (): Cofrinho[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

export const saveCofrinhos = (list: Cofrinho[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("sparky-cofrinhos-update"));
  } catch {}
};

export const createCofrinho = (input: Omit<Cofrinho, "id" | "createdAt" | "saved"> & { saved?: number }): Cofrinho => {
  const c: Cofrinho = {
    id: crypto.randomUUID?.() || `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    saved: input.saved ?? 0,
    createdAt: new Date().toISOString(),
    ...input,
  };
  const list = loadCofrinhos();
  list.push(c);
  saveCofrinhos(list);
  return c;
};

export const updateCofrinho = (id: string, patch: Partial<Cofrinho>) => {
  const list = loadCofrinhos().map(c => c.id === id ? { ...c, ...patch } : c);
  saveCofrinhos(list);
};

export const deleteCofrinho = (id: string) => {
  saveCofrinhos(loadCofrinhos().filter(c => c.id !== id));
};

export const depositCofrinho = (id: string, amount: number) => {
  if (amount <= 0) return;
  const list = loadCofrinhos().map(c => c.id === id ? { ...c, saved: c.saved + amount } : c);
  saveCofrinhos(list);
};

export const withdrawCofrinho = (id: string, amount: number) => {
  if (amount <= 0) return;
  const list = loadCofrinhos().map(c => c.id === id ? { ...c, saved: Math.max(0, c.saved - amount) } : c);
  saveCofrinhos(list);
};

export const monthsUntil = (deadline?: string): number | null => {
  if (!deadline) return null;
  const end = new Date(deadline);
  const now = new Date();
  const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
  return Math.max(1, months);
};

export const monthlyContribution = (c: Cofrinho): number | null => {
  const m = monthsUntil(c.deadline);
  if (!m) return null;
  const remaining = Math.max(0, c.target - c.saved);
  return remaining / m;
};
