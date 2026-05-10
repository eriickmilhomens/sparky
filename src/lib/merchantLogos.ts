// Mapa centralizado de marcas (mercados, farmácias, postos, restaurantes,
// transporte, lojas, etc) — logos via Simple Icons CDN.
// Usado pelo <MerchantLogo /> para renderizar a marca real em transações.

import { APP_BRANDS, type AppBrand } from "./brandLogos";
import { BANK_BRANDS } from "./bankLogos";

export type MerchantBrand = AppBrand;

// Marcas brasileiras / globais comuns em extrato (supermercados, farmácias,
// postos, varejo, transporte, alimentação, telecom, utilities, etc).
export const MERCHANT_BRANDS: Record<string, MerchantBrand> = {
  // Supermercados / Atacado
  "carrefour":     { name: "Carrefour",     slug: "carrefour",     hex: "004E9F", abbr: "CF" },
  "pão de açúcar": { name: "Pão de Açúcar", slug: "",              hex: "E4002B", abbr: "PA" },
  "pao de acucar": { name: "Pão de Açúcar", slug: "",              hex: "E4002B", abbr: "PA" },
  "extra":         { name: "Extra",         slug: "",              hex: "EE2722", abbr: "EX" },
  "assaí":         { name: "Assaí",         slug: "",              hex: "F2B600", abbr: "AS" },
  "assai":         { name: "Assaí",         slug: "",              hex: "F2B600", abbr: "AS" },
  "atacadão":      { name: "Atacadão",      slug: "",              hex: "E30613", abbr: "AT" },
  "atacadao":      { name: "Atacadão",      slug: "",              hex: "E30613", abbr: "AT" },
  "sams club":     { name: "Sam's Club",    slug: "samsclub",      hex: "0067A0", abbr: "SC" },
  "sam's club":    { name: "Sam's Club",    slug: "samsclub",      hex: "0067A0", abbr: "SC" },
  "walmart":       { name: "Walmart",       slug: "walmart",       hex: "0071CE", abbr: "WM" },
  "dia":           { name: "Dia",           slug: "",              hex: "EE2722", abbr: "DI" },
  "big":           { name: "BIG",           slug: "",              hex: "E30613", abbr: "BG" },
  "supermercado":  { name: "Supermercado",  slug: "",              hex: "16A34A", abbr: "SM" },
  "mercado":       { name: "Mercado",       slug: "",              hex: "16A34A", abbr: "MC" },

  // Farmácias
  "drogasil":          { name: "Drogasil",          slug: "", hex: "FFCB05", abbr: "DG" },
  "raia":              { name: "Droga Raia",        slug: "", hex: "0033A0", abbr: "DR" },
  "droga raia":        { name: "Droga Raia",        slug: "", hex: "0033A0", abbr: "DR" },
  "pacheco":           { name: "Drogarias Pacheco", slug: "", hex: "E4002B", abbr: "PC" },
  "pague menos":       { name: "Pague Menos",       slug: "", hex: "E4002B", abbr: "PM" },
  "ultrafarma":        { name: "Ultrafarma",        slug: "", hex: "F58220", abbr: "UF" },
  "drogaria":          { name: "Drogaria",          slug: "", hex: "DC2626", abbr: "FA" },
  "farmácia":          { name: "Farmácia",          slug: "", hex: "DC2626", abbr: "FA" },
  "farmacia":          { name: "Farmácia",          slug: "", hex: "DC2626", abbr: "FA" },

  // Postos / Combustível
  "shell":   { name: "Shell",   slug: "shell",   hex: "FBCE07", abbr: "SH" },
  "ipiranga":{ name: "Ipiranga",slug: "",        hex: "0033A0", abbr: "IP" },
  "petrobras":{name: "Petrobras",slug:"petrobras",hex: "008542", abbr: "PB" },
  "ale":     { name: "ALE",     slug: "",        hex: "E30613", abbr: "AL" },
  "posto":   { name: "Posto",   slug: "",        hex: "F59E0B", abbr: "PO" },

  // Transporte / Mobilidade
  "uber":      { name: "Uber",      slug: "uber",     hex: "000000", abbr: "UB" },
  "99":        { name: "99",        slug: "",         hex: "FFD400", abbr: "99" },
  "lyft":      { name: "Lyft",      slug: "lyft",     hex: "FF00BF", abbr: "LY" },
  "blablacar": { name: "BlaBlaCar", slug: "blablacar",hex: "0067B1", abbr: "BB" },

  // Comida / Delivery
  "ifood":      { name: "iFood",       slug: "ifood",       hex: "EA1D2C", abbr: "iF" },
  "rappi":      { name: "Rappi",       slug: "rappi",       hex: "FF441F", abbr: "RP" },
  "mcdonalds":  { name: "McDonald's",  slug: "mcdonalds",   hex: "FFC72C", abbr: "MC" },
  "mcdonald":   { name: "McDonald's",  slug: "mcdonalds",   hex: "FFC72C", abbr: "MC" },
  "burger king":{ name: "Burger King", slug: "burgerking",  hex: "D62300", abbr: "BK" },
  "subway":     { name: "Subway",      slug: "subway",      hex: "008C15", abbr: "SW" },
  "starbucks":  { name: "Starbucks",   slug: "starbucks",   hex: "00704A", abbr: "SB" },
  "kfc":        { name: "KFC",         slug: "kfc",         hex: "F40027", abbr: "KF" },
  "pizza hut":  { name: "Pizza Hut",   slug: "pizzahut",    hex: "EE3124", abbr: "PH" },
  "dominos":    { name: "Domino's",    slug: "dominos",     hex: "0078AE", abbr: "DM" },
  "habibs":     { name: "Habib's",     slug: "",            hex: "E30613", abbr: "HB" },
  "habib's":    { name: "Habib's",     slug: "",            hex: "E30613", abbr: "HB" },
  "outback":    { name: "Outback",     slug: "",            hex: "8B2424", abbr: "OB" },

  // Telecom
  "claro":  { name: "Claro",  slug: "claro", hex: "E60000", abbr: "CL" },
  "vivo":   { name: "Vivo",   slug: "vivo",  hex: "660099", abbr: "VV" },
  "tim":    { name: "TIM",    slug: "",      hex: "003DA5", abbr: "TM" },
  "oi":     { name: "Oi",     slug: "",      hex: "FFD700", abbr: "OI" },

  // Utilities
  "enel":      { name: "Enel",     slug: "enel", hex: "00308F", abbr: "EN" },
  "sabesp":    { name: "Sabesp",   slug: "",     hex: "0072BC", abbr: "SB", iconName: "droplet" },
  "comgás":    { name: "Comgás",   slug: "",     hex: "00A0E3", abbr: "CG", iconName: "flame" },
  "comgas":    { name: "Comgás",   slug: "",     hex: "00A0E3", abbr: "CG", iconName: "flame" },
  "cemig":     { name: "Cemig",    slug: "",     hex: "00308F", abbr: "CM", iconName: "zap" },
  "cpfl":      { name: "CPFL",     slug: "",     hex: "F37021", abbr: "CP", iconName: "zap" },
  "light":     { name: "Light",    slug: "",     hex: "FCB813", abbr: "LT", iconName: "zap" },
  "copel":     { name: "Copel",    slug: "",     hex: "00A859", abbr: "CO", iconName: "zap" },
  "celesc":    { name: "Celesc",   slug: "",     hex: "0033A0", abbr: "CE", iconName: "zap" },
  "energia":   { name: "Energia",  slug: "",     hex: "F59E0B", abbr: "EN", iconName: "zap" },
  "luz":       { name: "Energia",  slug: "",     hex: "F59E0B", abbr: "EN", iconName: "zap" },
  "água":      { name: "Água",     slug: "",     hex: "0EA5E9", abbr: "AG", iconName: "droplet" },
  "agua":      { name: "Água",     slug: "",     hex: "0EA5E9", abbr: "AG", iconName: "droplet" },
  "gás":       { name: "Gás",      slug: "",     hex: "F97316", abbr: "GS", iconName: "flame" },
  "gas":       { name: "Gás",      slug: "",     hex: "F97316", abbr: "GS", iconName: "flame" },
  "internet":  { name: "Internet", slug: "",     hex: "6366F1", abbr: "NT", iconName: "wifi" },
  "wifi":      { name: "Internet", slug: "",     hex: "6366F1", abbr: "NT", iconName: "wifi" },

  // Categorias / Pagamentos genéricos (com ícones Lucide)
  "pix":           { name: "Pix",            slug: "",  hex: "32BCAD", abbr: "PX", iconName: "arrow-left-right" },
  "ted":           { name: "TED",            slug: "",  hex: "0EA5E9", abbr: "TE", iconName: "arrow-left-right" },
  "doc":           { name: "DOC",            slug: "",  hex: "0EA5E9", abbr: "DC", iconName: "arrow-left-right" },
  "transferência": { name: "Transferência",  slug: "",  hex: "0EA5E9", abbr: "TR", iconName: "arrow-left-right" },
  "transferencia": { name: "Transferência",  slug: "",  hex: "0EA5E9", abbr: "TR", iconName: "arrow-left-right" },
  "boleto":        { name: "Boleto",         slug: "",  hex: "475569", abbr: "BO", iconName: "receipt" },
  "iptu":          { name: "IPTU",           slug: "",  hex: "0F766E", abbr: "IP", iconName: "landmark" },
  "ipva":          { name: "IPVA",           slug: "",  hex: "0F766E", abbr: "IV", iconName: "car" },
  "imposto":       { name: "Imposto",        slug: "",  hex: "0F766E", abbr: "IM", iconName: "landmark" },
  "taxa":          { name: "Taxa",           slug: "",  hex: "475569", abbr: "TX", iconName: "receipt" },
  "tarifa":        { name: "Tarifa",         slug: "",  hex: "475569", abbr: "TF", iconName: "receipt" },
  "aluguel":       { name: "Aluguel",        slug: "",  hex: "0EA5E9", abbr: "AL", iconName: "home" },
  "condomínio":    { name: "Condomínio",     slug: "",  hex: "0EA5E9", abbr: "CO", iconName: "building" },
  "condominio":    { name: "Condomínio",     slug: "",  hex: "0EA5E9", abbr: "CO", iconName: "building" },
  "manutenção":    { name: "Manutenção",     slug: "",  hex: "94A3B8", abbr: "MN", iconName: "wrench" },
  "manutencao":    { name: "Manutenção",     slug: "",  hex: "94A3B8", abbr: "MN", iconName: "wrench" },
  "reforma":       { name: "Reforma",        slug: "",  hex: "94A3B8", abbr: "RF", iconName: "hammer" },
  "moradia":       { name: "Moradia",        slug: "",  hex: "0EA5E9", abbr: "MO", iconName: "home" },
  "casa":          { name: "Casa",           slug: "",  hex: "0EA5E9", abbr: "CA", iconName: "home" },

  // Educação
  "curso":         { name: "Curso",          slug: "",  hex: "8B5CF6", abbr: "CU", iconName: "graduation-cap" },
  "escola":        { name: "Escola",         slug: "",  hex: "8B5CF6", abbr: "ES", iconName: "graduation-cap" },
  "faculdade":     { name: "Faculdade",      slug: "",  hex: "8B5CF6", abbr: "FA", iconName: "graduation-cap" },
  "mensalidade":   { name: "Mensalidade",    slug: "",  hex: "8B5CF6", abbr: "ME", iconName: "graduation-cap" },
  "educação":      { name: "Educação",       slug: "",  hex: "8B5CF6", abbr: "ED", iconName: "book-open" },
  "educacao":      { name: "Educação",       slug: "",  hex: "8B5CF6", abbr: "ED", iconName: "book-open" },
  "livro":         { name: "Livros",         slug: "",  hex: "8B5CF6", abbr: "LV", iconName: "book-open" },

  // Saúde / lazer / outros
  "academia":      { name: "Academia",       slug: "",  hex: "EF4444", abbr: "AC", iconName: "dumbbell" },
  "smartfit":      { name: "Smart Fit",      slug: "",  hex: "FFCC00", abbr: "SF", iconName: "dumbbell" },
  "consulta":      { name: "Consulta",       slug: "",  hex: "EF4444", abbr: "CN", iconName: "stethoscope" },
  "médico":        { name: "Médico",         slug: "",  hex: "EF4444", abbr: "MD", iconName: "stethoscope" },
  "medico":        { name: "Médico",         slug: "",  hex: "EF4444", abbr: "MD", iconName: "stethoscope" },
  "exame":         { name: "Exame",          slug: "",  hex: "EF4444", abbr: "EX", iconName: "stethoscope" },
  "saúde":         { name: "Saúde",          slug: "",  hex: "EF4444", abbr: "SA", iconName: "heart" },
  "saude":         { name: "Saúde",          slug: "",  hex: "EF4444", abbr: "SA", iconName: "heart" },
  "unimed":        { name: "Unimed",         slug: "",  hex: "00995D", abbr: "UN", iconName: "stethoscope" },
  "amil":          { name: "Amil",           slug: "",  hex: "00A4E0", abbr: "AM", iconName: "stethoscope" },
  "hapvida":       { name: "Hapvida",        slug: "",  hex: "F58220", abbr: "HP", iconName: "stethoscope" },
  "salário":       { name: "Salário",        slug: "",  hex: "16A34A", abbr: "SA", iconName: "dollar-sign" },
  "salario":       { name: "Salário",        slug: "",  hex: "16A34A", abbr: "SA", iconName: "dollar-sign" },
  "freela":        { name: "Freelance",      slug: "",  hex: "16A34A", abbr: "FR", iconName: "briefcase" },
  "investimento":  { name: "Investimento",   slug: "",  hex: "16A34A", abbr: "IN", iconName: "trending-up" },
  "rendimento":    { name: "Rendimento",     slug: "",  hex: "16A34A", abbr: "RE", iconName: "trending-up" },
  "presente":      { name: "Presente",       slug: "",  hex: "EC4899", abbr: "PR", iconName: "gift" },
  "viagem":        { name: "Viagem",         slug: "",  hex: "0EA5E9", abbr: "VI", iconName: "plane" },
  "hotel":         { name: "Hotel",          slug: "",  hex: "0EA5E9", abbr: "HT", iconName: "hotel" },
  "passagem":      { name: "Passagem",       slug: "",  hex: "0EA5E9", abbr: "PA", iconName: "plane" },
  "lazer":         { name: "Lazer",          slug: "",  hex: "EC4899", abbr: "LZ", iconName: "party-popper" },
  "festa":         { name: "Festa",          slug: "",  hex: "EC4899", abbr: "FT", iconName: "party-popper" },
  "café":          { name: "Café",           slug: "",  hex: "78350F", abbr: "CF", iconName: "coffee" },
  "cafe":          { name: "Café",           slug: "",  hex: "78350F", abbr: "CF", iconName: "coffee" },
  "padaria":       { name: "Padaria",        slug: "",  hex: "F59E0B", abbr: "PD", iconName: "coffee" },
  "restaurante":   { name: "Restaurante",    slug: "",  hex: "F59E0B", abbr: "RT", iconName: "utensils" },
  "lanche":        { name: "Lanche",         slug: "",  hex: "F59E0B", abbr: "LN", iconName: "utensils" },
  "alimentação":   { name: "Alimentação",    slug: "",  hex: "F59E0B", abbr: "AL", iconName: "utensils" },
  "alimentacao":   { name: "Alimentação",    slug: "",  hex: "F59E0B", abbr: "AL", iconName: "utensils" },
  "pet":           { name: "Pet",            slug: "",  hex: "EAB308", abbr: "PT", iconName: "paw-print" },
  "veterinário":   { name: "Veterinário",    slug: "",  hex: "EAB308", abbr: "VT", iconName: "paw-print" },
  "veterinario":   { name: "Veterinário",    slug: "",  hex: "EAB308", abbr: "VT", iconName: "paw-print" },
  "roupa":         { name: "Roupas",         slug: "",  hex: "EC4899", abbr: "RP", iconName: "shirt" },
  "vestuário":     { name: "Vestuário",      slug: "",  hex: "EC4899", abbr: "VS", iconName: "shirt" },
  "vestuario":     { name: "Vestuário",      slug: "",  hex: "EC4899", abbr: "VS", iconName: "shirt" },
  "barbearia":     { name: "Barbearia",      slug: "",  hex: "57534E", abbr: "BB", iconName: "scissors" },
  "salão":         { name: "Salão",          slug: "",  hex: "EC4899", abbr: "SL", iconName: "scissors" },
  "salao":         { name: "Salão",          slug: "",  hex: "EC4899", abbr: "SL", iconName: "scissors" },
  "estacionamento":{ name: "Estacionamento", slug: "",  hex: "475569", abbr: "ET", iconName: "car" },
  "ônibus":        { name: "Ônibus",         slug: "",  hex: "0EA5E9", abbr: "ON", iconName: "bus" },
  "onibus":        { name: "Ônibus",         slug: "",  hex: "0EA5E9", abbr: "ON", iconName: "bus" },
  "metrô":         { name: "Metrô",          slug: "",  hex: "0EA5E9", abbr: "MT", iconName: "train" },
  "metro":         { name: "Metrô",          slug: "",  hex: "0EA5E9", abbr: "MT", iconName: "train" },
  "transporte":    { name: "Transporte",     slug: "",  hex: "0EA5E9", abbr: "TP", iconName: "bus" },
  "combustível":   { name: "Combustível",    slug: "",  hex: "F59E0B", abbr: "CB", iconName: "fuel" },
  "combustivel":   { name: "Combustível",    slug: "",  hex: "F59E0B", abbr: "CB", iconName: "fuel" },
  "seguro":        { name: "Seguro",         slug: "",  hex: "1E40AF", abbr: "SG", iconName: "shield" },
  "igreja":        { name: "Igreja",         slug: "",  hex: "78716C", abbr: "IG", iconName: "church" },
  "dízimo":        { name: "Dízimo",         slug: "",  hex: "78716C", abbr: "DZ", iconName: "church" },
  "dizimo":        { name: "Dízimo",         slug: "",  hex: "78716C", abbr: "DZ", iconName: "church" },
  "jogo":          { name: "Jogos",          slug: "",  hex: "8B5CF6", abbr: "JG", iconName: "gamepad" },
  "games":         { name: "Games",          slug: "",  hex: "8B5CF6", abbr: "GM", iconName: "gamepad" },
  "cartão":        { name: "Cartão",         slug: "",  hex: "475569", abbr: "CT", iconName: "credit-card" },
  "cartao":        { name: "Cartão",         slug: "",  hex: "475569", abbr: "CT", iconName: "credit-card" },
  "fatura":        { name: "Fatura",         slug: "",  hex: "475569", abbr: "FT", iconName: "credit-card" },
  "empréstimo":    { name: "Empréstimo",     slug: "",  hex: "475569", abbr: "EM", iconName: "landmark" },
  "emprestimo":    { name: "Empréstimo",     slug: "",  hex: "475569", abbr: "EM", iconName: "landmark" },
  "financiamento": { name: "Financiamento",  slug: "",  hex: "475569", abbr: "FI", iconName: "landmark" },
  "poupança":      { name: "Poupança",       slug: "",  hex: "16A34A", abbr: "PP", iconName: "piggy-bank" },
  "poupanca":      { name: "Poupança",       slug: "",  hex: "16A34A", abbr: "PP", iconName: "piggy-bank" },
  "compra":        { name: "Compras",        slug: "",  hex: "8B5CF6", abbr: "CP", iconName: "shopping-cart" },
  "bebê":          { name: "Bebê",           slug: "",  hex: "EC4899", abbr: "BB", iconName: "baby" },
  "bebe":          { name: "Bebê",           slug: "",  hex: "EC4899", abbr: "BB", iconName: "baby" },

  // Pets stores
  "petz":   { name: "Petz",   slug: "", hex: "00A859", abbr: "PZ", iconName: "paw-print" },
  "cobasi": { name: "Cobasi", slug: "", hex: "00853E", abbr: "CB", iconName: "paw-print" },
};

const FALLBACK: MerchantBrand = {
  name: "Estabelecimento",
  slug: "",
  hex: "64748B",
  abbr: "",
};

/**
 * Resolve uma string livre (descrição da transação ou categoria) numa marca.
 * Procura primeiro nos mercados, depois apps/serviços e, por último, bancos.
 */
export const getMerchantBrand = (rawName: string): MerchantBrand => {
  if (!rawName) return FALLBACK;
  const lower = rawName.toLowerCase().trim();

  if (MERCHANT_BRANDS[lower]) return MERCHANT_BRANDS[lower];
  if (APP_BRANDS[lower]) return APP_BRANDS[lower];
  if (BANK_BRANDS[lower]) return BANK_BRANDS[lower];

  for (const [key, brand] of Object.entries(MERCHANT_BRANDS)) {
    if (lower.includes(key)) return brand;
  }
  for (const [key, brand] of Object.entries(APP_BRANDS)) {
    if (lower.includes(key)) return brand;
  }
  for (const [key, brand] of Object.entries(BANK_BRANDS)) {
    if (lower.includes(key)) return brand;
  }

  return { ...FALLBACK, abbr: rawName.slice(0, 2).toUpperCase() };
};
