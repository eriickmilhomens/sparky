// Import reminder: tracks last manual import + user-configurable frequency.
// Storage keys
const LAST_IMPORT_KEY = "sparky-last-import";
const CONFIG_KEY = "sparky-import-reminder-config";
const SNOOZE_KEY = "sparky-import-reminder-snooze";

export interface ImportReminderConfig {
  enabled: boolean;
  frequencyDays: number; // 3 | 7 | 15 | 30
}

const DEFAULT_CONFIG: ImportReminderConfig = { enabled: true, frequencyDays: 7 };

export const getReminderConfig = (): ImportReminderConfig => {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : true,
      frequencyDays: [3, 7, 15, 30].includes(parsed.frequencyDays) ? parsed.frequencyDays : 7,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
};

export const setReminderConfig = (cfg: ImportReminderConfig) => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  window.dispatchEvent(new Event("sparky-import-reminder-changed"));
};

export const markImported = () => {
  localStorage.setItem(LAST_IMPORT_KEY, new Date().toISOString());
  localStorage.removeItem(SNOOZE_KEY);
  window.dispatchEvent(new Event("sparky-import-reminder-changed"));
};

export const snoozeReminder = (hours = 24) => {
  const until = Date.now() + hours * 60 * 60 * 1000;
  localStorage.setItem(SNOOZE_KEY, String(until));
  window.dispatchEvent(new Event("sparky-import-reminder-changed"));
};

export const getLastImport = (): Date | null => {
  const raw = localStorage.getItem(LAST_IMPORT_KEY);
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};

export const getDaysSinceImport = (): number | null => {
  const last = getLastImport();
  if (!last) return null;
  return Math.floor((Date.now() - last.getTime()) / (24 * 60 * 60 * 1000));
};

export const shouldShowReminder = (): boolean => {
  const cfg = getReminderConfig();
  if (!cfg.enabled) return false;
  const snooze = Number(localStorage.getItem(SNOOZE_KEY) || 0);
  if (snooze && Date.now() < snooze) return false;
  const last = getLastImport();
  if (!last) return true; // never imported
  const days = (Date.now() - last.getTime()) / (24 * 60 * 60 * 1000);
  return days >= cfg.frequencyDays;
};
