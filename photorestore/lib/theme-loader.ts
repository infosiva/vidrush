import { get } from "@vercel/edge-config";

export interface SiteWidgets {
  chatbot?: boolean;
  usagePill?: boolean;
  streak?: boolean;
  banner?: boolean;
  stickyFooterCTA?: boolean;
  backToTop?: boolean;
  pageStats?: boolean;
  cookieConsent?: boolean;
}

export interface SiteLayout {
  hideSections?: string[];
  heroVariant?: "split" | "centered" | "minimal";
}

export interface SiteCopy {
  headline?: string;
  subheadline?: string;
  ctaPrimary?: string;
  badge?: string;
}

export interface SiteFont {
  heading?: string;
  body?: string;
}

export interface SiteTheme {
  background?: string;
  primary?: string;
  secondary?: string;
  texture?: string;
  widgets?: SiteWidgets;
  layout?: SiteLayout;
  copy?: SiteCopy;
  font?: SiteFont;
}

/**
 * Reads theme_<siteId> from shared Edge Config.
 * Returns null if no override is set — caller should use its own defaults.
 */
export async function loadSiteTheme(siteId: string): Promise<SiteTheme | null> {
  try {
    const theme = await get<SiteTheme>(`theme_${siteId}`);
    return theme ?? null;
  } catch {
    return null;
  }
}

/**
 * Generates a <style> tag string injecting CSS custom properties.
 * Drop into layout.tsx dangerouslySetInnerHTML to apply theme globally.
 */
export function buildThemeStyleTag(theme: SiteTheme | null, defaults?: {
  background?: string;
  primary?: string;
  secondary?: string;
}): string {
  const bg  = theme?.background ?? defaults?.background;
  const pri = theme?.primary    ?? defaults?.primary;
  const sec = theme?.secondary  ?? defaults?.secondary;

  const vars: string[] = [];
  if (bg)  vars.push(`--background: ${bg}; --theme-base: ${bg};`);
  if (pri) vars.push(`--theme-primary: ${pri}; --color-primary: ${pri};`);
  if (sec) vars.push(`--theme-secondary: ${sec}; --color-secondary: ${sec};`);

  // Font overrides
  const headingFont = theme?.font?.heading;
  const bodyFont    = theme?.font?.body;

  const rules: string[] = [];
  if (vars.length > 0) rules.push(`:root { ${vars.join(" ")} }`);
  if (headingFont) rules.push(`h1,h2,h3,.display { font-family: '${headingFont}', sans-serif !important; }`);
  if (bodyFont)    rules.push(`body { font-family: '${bodyFont}', system-ui, sans-serif !important; }`);

  return rules.join("\n");
}

/**
 * Checks if a specific widget is hidden for this site.
 * Default: shown unless explicitly set to false.
 */
export function isWidgetHidden(theme: SiteTheme | null, widgetKey: keyof SiteWidgets): boolean {
  return theme?.widgets?.[widgetKey] === false;
}

/**
 * Returns true if the given section should be hidden.
 */
export function isSectionHidden(theme: SiteTheme | null, sectionId: string): boolean {
  return theme?.layout?.hideSections?.includes(sectionId) ?? false;
}

/**
 * Returns copy override or falls back to provided default.
 */
export function getCopy(theme: SiteTheme | null, key: keyof SiteCopy, fallback: string): string {
  return theme?.copy?.[key] ?? fallback;
}
