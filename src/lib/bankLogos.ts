// Mapa centralizado de bancos brasileiros — logos via Simple Icons CDN.
// Cada banco aponta para um slug oficial da biblioteca (https://simpleicons.org).
// Se o slug não existir / falhar, exibimos um avatar circular com a inicial e a cor da marca.

export interface BankBrand {
  name: string;
  /** Slug do Simple Icons (ex: "nubank"). Vazio = sem logo, usa fallback. */
  slug: string;
  /** Cor hex da marca SEM o "#" (usada tanto pelo CDN quanto pelo fallback). */
  hex: string;
  /** Iniciais para o avatar de fallback. */
  abbr: string;
  /** Nome de ícone do Lucide para fallback (preferido sobre abbr). */
  iconName?: string;
}

// Chaves em lowercase. getBankBrand() faz match exato e por substring.
export const BANK_BRANDS: Record<string, BankBrand> = {
  "nubank":          { name: "Nubank",          slug: "nubank",        hex: "820AD1", abbr: "NU" },
  "nu ":             { name: "Nubank",          slug: "nubank",        hex: "820AD1", abbr: "NU" },
  "itaú":            { name: "Itaú",            slug: "itau",          hex: "EC7000", abbr: "IT" },
  "itau":            { name: "Itaú",            slug: "itau",          hex: "EC7000", abbr: "IT" },
  "bradesco":        { name: "Bradesco",        slug: "bradesco",      hex: "CC092F", abbr: "BR" },
  "santander":       { name: "Santander",       slug: "santander",     hex: "EC0000", abbr: "SA" },
  "banco do brasil": { name: "Banco do Brasil", slug: "bancodobrasil", hex: "FAE128", abbr: "BB" },
  "bb":              { name: "Banco do Brasil", slug: "bancodobrasil", hex: "FAE128", abbr: "BB" },
  "caixa":           { name: "Caixa",           slug: "caixa",         hex: "0070AF", abbr: "CX" },
  "inter":           { name: "Inter",           slug: "inter",         hex: "FF7A00", abbr: "IN" },
  "c6":              { name: "C6 Bank",         slug: "",              hex: "0F0F0F", abbr: "C6" },
  "btg":             { name: "BTG Pactual",     slug: "",              hex: "001E62", abbr: "BT" },
  "xp":              { name: "XP",              slug: "",              hex: "000000", abbr: "XP" },
  "picpay":          { name: "PicPay",          slug: "picpay",        hex: "21C25E", abbr: "PP" },
  "mercado pago":    { name: "Mercado Pago",    slug: "mercadopago",   hex: "00B1EA", abbr: "MP" },
  "next":            { name: "Next",            slug: "",              hex: "00FF5F", abbr: "NX" },
  "neon":            { name: "Neon",            slug: "",              hex: "00E1A0", abbr: "NE" },
  "pan":             { name: "Pan",             slug: "",              hex: "0033A0", abbr: "PN" },
  "original":        { name: "Original",        slug: "",              hex: "00C853", abbr: "OR" },
  "safra":           { name: "Safra",           slug: "",              hex: "00377B", abbr: "SF" },
  "sicoob":          { name: "Sicoob",          slug: "",              hex: "003641", abbr: "SC" },
  "sicredi":         { name: "Sicredi",         slug: "",              hex: "3FA535", abbr: "SI" },
  "will":            { name: "Will Bank",       slug: "",              hex: "00FF85", abbr: "WI" },
  "pagbank":         { name: "PagBank",         slug: "",              hex: "00A868", abbr: "PB" },
  "pagseguro":       { name: "PagBank",         slug: "",              hex: "00A868", abbr: "PB" },
};

const FALLBACK: BankBrand = {
  name: "Banco",
  slug: "",
  hex: "64748B", // slate-500
  abbr: "",
};

export const getBankBrand = (rawName: string): BankBrand => {
  if (!rawName) return FALLBACK;
  const lower = rawName.toLowerCase().trim();
  if (BANK_BRANDS[lower]) return BANK_BRANDS[lower];
  for (const [key, brand] of Object.entries(BANK_BRANDS)) {
    if (lower.includes(key)) return brand;
  }
  return { ...FALLBACK, abbr: rawName.slice(0, 2).toUpperCase() };
};

/**
 * URL do logo via Simple Icons CDN (SVG vetorial, fundo transparente).
 * Documentação: https://simpleicons.org
 * Retorna null se a marca não tem slug mapeado (cai no avatar de fallback).
 */
export const getBankLogoUrl = (brand: BankBrand): string | null => {
  if (!brand.slug) return null;
  // Renderiza o ícone na cor oficial da marca, fundo transparente
  return `https://cdn.simpleicons.org/${brand.slug}/${brand.hex}`;
};

// Lista pública para o seletor de bancos
export const BANK_OPTIONS_LIST: BankBrand[] = [
  BANK_BRANDS["nubank"],
  BANK_BRANDS["itau"],
  BANK_BRANDS["bradesco"],
  BANK_BRANDS["inter"],
  BANK_BRANDS["bb"],
  BANK_BRANDS["caixa"],
  BANK_BRANDS["santander"],
  BANK_BRANDS["c6"],
  BANK_BRANDS["btg"],
  BANK_BRANDS["xp"],
  BANK_BRANDS["picpay"],
  BANK_BRANDS["mercado pago"],
  BANK_BRANDS["next"],
  BANK_BRANDS["neon"],
  BANK_BRANDS["pan"],
  BANK_BRANDS["safra"],
  BANK_BRANDS["sicoob"],
  BANK_BRANDS["sicredi"],
  BANK_BRANDS["will"],
  BANK_BRANDS["pagbank"],
];
