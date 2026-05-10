// Logos de marcas para Assinaturas e serviços recorrentes — via Simple Icons CDN.
// Mesma estratégia do bankLogos.ts: slug oficial + cor da marca + fallback de avatar.

export interface AppBrand {
  name: string;
  /** Slug do Simple Icons. Vazio = sem logo, usa fallback de avatar. */
  slug: string;
  /** Cor hex da marca SEM o "#". */
  hex: string;
  /** Iniciais para o avatar de fallback. */
  abbr: string;
  /** Nome de ícone do Lucide para fallback (preferido sobre abbr). */
  iconName?: string;
}

export const APP_BRANDS: Record<string, AppBrand> = {
  "netflix":           { name: "Netflix",           slug: "netflix",          hex: "E50914", abbr: "N"  },
  "spotify":           { name: "Spotify",           slug: "spotify",          hex: "1DB954", abbr: "S"  },
  "disney":            { name: "Disney+",           slug: "disneyplus",       hex: "0E2A6B", abbr: "D+" },
  "disney+":           { name: "Disney+",           slug: "disneyplus",       hex: "0E2A6B", abbr: "D+" },
  "amazon prime":      { name: "Amazon Prime",      slug: "primevideo",       hex: "00A8E1", abbr: "AP" },
  "prime video":       { name: "Prime Video",       slug: "primevideo",       hex: "00A8E1", abbr: "PV" },
  "amazon":            { name: "Amazon",            slug: "amazon",           hex: "FF9900", abbr: "AZ" },
  "youtube premium":   { name: "YouTube Premium",   slug: "youtube",          hex: "FF0000", abbr: "YT" },
  "youtube":           { name: "YouTube",           slug: "youtube",          hex: "FF0000", abbr: "YT" },
  "icloud":            { name: "iCloud",            slug: "icloud",           hex: "3693F3", abbr: "iC" },
  "apple":             { name: "Apple",             slug: "apple",            hex: "000000", abbr: "AP" },
  "apple music":       { name: "Apple Music",       slug: "applemusic",       hex: "FA243C", abbr: "AM" },
  "apple tv":          { name: "Apple TV+",         slug: "appletv",          hex: "000000", abbr: "TV" },
  "adobe":             { name: "Adobe",             slug: "adobe",            hex: "FA0F00", abbr: "Ad" },
  "hbo":               { name: "HBO Max",           slug: "hbo",              hex: "0046FF", abbr: "HB" },
  "max":               { name: "Max",               slug: "max",              hex: "0046FF", abbr: "MX" },
  "crunchyroll":       { name: "Crunchyroll",       slug: "crunchyroll",      hex: "F47521", abbr: "CR" },
  "xbox":              { name: "Xbox Game Pass",    slug: "xbox",             hex: "107C10", abbr: "XB" },
  "playstation":       { name: "PlayStation Plus",  slug: "playstation",      hex: "003791", abbr: "PS" },
  "globoplay":         { name: "Globoplay",         slug: "globo",            hex: "FF1F1F", abbr: "GP" },
  "paramount":         { name: "Paramount+",        slug: "paramountplus",    hex: "0064FF", abbr: "P+" },
  "deezer":            { name: "Deezer",            slug: "deezer",           hex: "A238FF", abbr: "DZ" },
  "tidal":             { name: "Tidal",             slug: "tidal",            hex: "000000", abbr: "TD" },
  "google one":        { name: "Google One",        slug: "googleone",        hex: "4285F4", abbr: "G1" },
  "google":            { name: "Google",            slug: "google",           hex: "4285F4", abbr: "G"  },
  "microsoft":         { name: "Microsoft 365",     slug: "microsoft",        hex: "0078D4", abbr: "M"  },
  "office":            { name: "Office 365",        slug: "microsoftoffice",  hex: "D83B01", abbr: "OF" },
  "github":            { name: "GitHub",            slug: "github",           hex: "181717", abbr: "GH" },
  "openai":            { name: "ChatGPT",           slug: "openai",           hex: "10A37F", abbr: "AI" },
  "chatgpt":           { name: "ChatGPT",           slug: "openai",           hex: "10A37F", abbr: "AI" },
  "notion":            { name: "Notion",            slug: "notion",           hex: "000000", abbr: "NT" },
  "canva":             { name: "Canva",             slug: "canva",            hex: "00C4CC", abbr: "CV" },
  "figma":             { name: "Figma",             slug: "figma",            hex: "F24E1E", abbr: "FG" },
  "duolingo":          { name: "Duolingo",          slug: "duolingo",         hex: "58CC02", abbr: "DL" },
  "udemy":             { name: "Udemy",             slug: "udemy",            hex: "A435F0", abbr: "UD" },
  "alura":             { name: "Alura",             slug: "",                 hex: "0F4C81", abbr: "AL", iconName: "graduation-cap" },
  "coursera":          { name: "Coursera",          slug: "coursera",         hex: "0056D2", abbr: "CO" },
  "linkedin":          { name: "LinkedIn",          slug: "linkedin",         hex: "0A66C2", abbr: "LI" },
  "twitch":            { name: "Twitch",            slug: "twitch",           hex: "9146FF", abbr: "TW" },
  "uber":              { name: "Uber One",          slug: "uber",             hex: "000000", abbr: "UB" },
  "ifood":             { name: "iFood",             slug: "ifood",            hex: "EA1D2C", abbr: "iF" },
  "rappi":             { name: "Rappi",             slug: "rappi",            hex: "FF441F", abbr: "RP" },
  "claro":             { name: "Claro",             slug: "claro",            hex: "E60000", abbr: "CL" },
  "vivo":              { name: "Vivo",              slug: "vivo",             hex: "660099", abbr: "VV" },
  "tim":               { name: "TIM",               slug: "",                 hex: "003DA5", abbr: "TM", iconName: "phone" },
  "oi":                { name: "Oi",                slug: "",                 hex: "FFD700", abbr: "OI", iconName: "phone" },
};

const APP_FALLBACK: AppBrand = {
  name: "App",
  slug: "",
  hex: "64748B",
  abbr: "",
};

export const getAppBrand = (rawName: string): AppBrand => {
  if (!rawName) return APP_FALLBACK;
  const lower = rawName.toLowerCase().trim();
  if (APP_BRANDS[lower]) return APP_BRANDS[lower];
  for (const [key, brand] of Object.entries(APP_BRANDS)) {
    if (lower.includes(key)) return brand;
  }
  return { ...APP_FALLBACK, abbr: rawName.slice(0, 2).toUpperCase() };
};

/** URL do logo via Simple Icons CDN. Null se não houver slug. */
export const getAppLogoUrl = (brand: AppBrand): string | null => {
  if (!brand.slug) return null;
  return `https://cdn.simpleicons.org/${brand.slug}/${brand.hex}`;
};

// Lista para o seletor de assinaturas populares
export const POPULAR_APPS: AppBrand[] = [
  APP_BRANDS["netflix"],
  APP_BRANDS["spotify"],
  APP_BRANDS["disney+"],
  APP_BRANDS["amazon prime"],
  APP_BRANDS["youtube premium"],
  APP_BRANDS["hbo"],
  APP_BRANDS["paramount"],
  APP_BRANDS["globoplay"],
  APP_BRANDS["apple music"],
  APP_BRANDS["deezer"],
  APP_BRANDS["icloud"],
  APP_BRANDS["google one"],
  APP_BRANDS["microsoft"],
  APP_BRANDS["adobe"],
  APP_BRANDS["canva"],
  APP_BRANDS["chatgpt"],
  APP_BRANDS["crunchyroll"],
  APP_BRANDS["xbox"],
  APP_BRANDS["playstation"],
  APP_BRANDS["duolingo"],
];
