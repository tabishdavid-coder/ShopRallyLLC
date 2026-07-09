import { z } from "zod";

import type { PlansPageTemplate } from "@/generated/prisma";

export const BRAND_PRIMARY_HEX = "1A1D21";
export const BRAND_ACCENT_HEX = "0EA5E9";
export const BRAND_LIGHT_HEX = "0EA5E9";
export const PREMIUM_GOLD_HEX = "C9A227";

export const PLANS_PAGE_TEMPLATES = ["CLASSIC", "MODERN", "BOLD", "PREMIUM"] as const;

export type HeroStyle = "solid" | "gradient" | "minimal";
export type CardStyle = "bordered" | "shadow" | "flat";
export type ButtonStyle = "filled" | "outline";
export type ColumnsLayout = "3" | "2" | "1";
export type FontScale = "sm" | "md" | "lg";

export const PlansThemeConfigSchema = z.object({
  primaryColor: z
    .string()
    .regex(/^[0-9A-Fa-f]{6}$/, "Use 6-digit hex without #")
    .optional(),
  accentColor: z
    .string()
    .regex(/^[0-9A-Fa-f]{6}$/, "Use 6-digit hex without #")
    .optional(),
  heroStyle: z.enum(["solid", "gradient", "minimal"]).optional(),
  cardStyle: z.enum(["bordered", "shadow", "flat"]).optional(),
  buttonStyle: z.enum(["filled", "outline"]).optional(),
  showPhone: z.boolean().optional(),
  showAddress: z.boolean().optional(),
  showLogo: z.boolean().optional(),
  columnsLayout: z.enum(["3", "2", "1"]).optional(),
  fontScale: z.enum(["sm", "md", "lg"]).optional(),
});

export type PlansThemeConfig = z.infer<typeof PlansThemeConfigSchema>;

export type ResolvedPlansTheme = {
  template: PlansPageTemplate;
  primaryColor: string;
  accentColor: string;
  heroStyle: HeroStyle;
  cardStyle: CardStyle;
  buttonStyle: ButtonStyle;
  showPhone: boolean;
  showAddress: boolean;
  showLogo: boolean;
  columnsLayout: ColumnsLayout;
  fontScale: FontScale;
};

export const TEMPLATE_META: Record<
  PlansPageTemplate,
  { label: string; description: string }
> = {
  CLASSIC: {
    label: "Classic",
    description: "Navy hero with clean white plan cards — professional and familiar.",
  },
  MODERN: {
    label: "Modern",
    description: "Light, airy layout with soft shadows and rounded cards.",
  },
  BOLD: {
    label: "Bold",
    description: "Gradient hero and strong red accents — featured plans stand out.",
  },
  PREMIUM: {
    label: "Premium",
    description: "Dark elegant hero with refined typography and gold accents.",
  },
};

const TEMPLATE_DEFAULTS: Record<PlansPageTemplate, PlansThemeConfig> = {
  CLASSIC: {
    primaryColor: BRAND_PRIMARY_HEX,
    accentColor: BRAND_ACCENT_HEX,
    heroStyle: "solid",
    cardStyle: "shadow",
    buttonStyle: "filled",
    showPhone: true,
    showAddress: true,
    showLogo: true,
    columnsLayout: "3",
    fontScale: "md",
  },
  MODERN: {
    primaryColor: BRAND_PRIMARY_HEX,
    accentColor: BRAND_LIGHT_HEX,
    heroStyle: "minimal",
    cardStyle: "shadow",
    buttonStyle: "outline",
    showPhone: true,
    showAddress: false,
    showLogo: true,
    columnsLayout: "3",
    fontScale: "md",
  },
  BOLD: {
    primaryColor: BRAND_PRIMARY_HEX,
    accentColor: BRAND_ACCENT_HEX,
    heroStyle: "gradient",
    cardStyle: "bordered",
    buttonStyle: "filled",
    showPhone: true,
    showAddress: true,
    showLogo: true,
    columnsLayout: "3",
    fontScale: "lg",
  },
  PREMIUM: {
    primaryColor: "1E293B",
    accentColor: PREMIUM_GOLD_HEX,
    heroStyle: "solid",
    cardStyle: "flat",
    buttonStyle: "filled",
    showPhone: true,
    showAddress: true,
    showLogo: true,
    columnsLayout: "2",
    fontScale: "md",
  },
};

export function getTemplateDefaults(template: PlansPageTemplate): PlansThemeConfig {
  return { ...TEMPLATE_DEFAULTS[template] };
}

export function parseThemeConfig(raw: unknown): PlansThemeConfig | null {
  if (raw == null) return null;
  const parsed = PlansThemeConfigSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function resolvePlansPageTheme(
  template: PlansPageTemplate,
  overrides?: PlansThemeConfig | null,
): ResolvedPlansTheme {
  const defaults = getTemplateDefaults(template);
  const merged = { ...defaults, ...stripUndefined(overrides ?? {}) };
  return {
    template,
    primaryColor: merged.primaryColor ?? BRAND_PRIMARY_HEX,
    accentColor: merged.accentColor ?? BRAND_ACCENT_HEX,
    heroStyle: merged.heroStyle ?? "solid",
    cardStyle: merged.cardStyle ?? "shadow",
    buttonStyle: merged.buttonStyle ?? "filled",
    showPhone: merged.showPhone ?? true,
    showAddress: merged.showAddress ?? true,
    showLogo: merged.showLogo ?? true,
    columnsLayout: merged.columnsLayout ?? "3",
    fontScale: merged.fontScale ?? "md",
  };
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

export function hexColor(hex: string): string {
  return hex.startsWith("#") ? hex : `#${hex}`;
}

export function themeCssVars(theme: ResolvedPlansTheme): Record<string, string> {
  return {
    "--plans-primary": hexColor(theme.primaryColor),
    "--plans-accent": hexColor(theme.accentColor),
  };
}

export const FONT_SCALE = {
  sm: {
    heroTitle: "text-xl sm:text-2xl",
    heroSubtitle: "text-sm",
    cardTitle: "text-base",
    price: "text-xl",
  },
  md: {
    heroTitle: "text-2xl sm:text-3xl",
    heroSubtitle: "text-sm sm:text-base",
    cardTitle: "text-lg",
    price: "text-2xl",
  },
  lg: {
    heroTitle: "text-3xl sm:text-4xl",
    heroSubtitle: "text-base sm:text-lg",
    cardTitle: "text-xl",
    price: "text-3xl",
  },
} as const;

export const COLUMNS_GRID: Record<ColumnsLayout, string> = {
  "3": "grid gap-6 sm:grid-cols-2 lg:grid-cols-3",
  "2": "grid gap-6 sm:grid-cols-2 max-w-4xl mx-auto",
  "1": "grid gap-6 max-w-md mx-auto",
};

export function isDarkPlansPage(template: PlansPageTemplate): boolean {
  return template === "PREMIUM";
}

/** Shared panel/footer typography for light vs dark maintenance page templates. */
export function getPlansSurfaceClasses(theme: ResolvedPlansTheme) {
  if (isDarkPlansPage(theme.template)) {
    return {
      panel: "rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-100",
      heading: "text-neutral-100",
      muted: "text-neutral-400",
      body: "text-neutral-300",
      emphasis: "text-neutral-200",
      border: "border-neutral-800",
      footer: "border-neutral-800 text-neutral-500",
      chipIdle: "text-neutral-300 hover:bg-neutral-800",
    };
  }

  return {
    panel: "rounded-lg border bg-card",
    heading: "",
    muted: "text-muted-foreground",
    body: "text-muted-foreground",
    emphasis: "text-foreground",
    border: "",
    footer: "text-muted-foreground",
    chipIdle: "hover:bg-accent",
  };
}

/** Parse CRM live-preview query params into template + theme overrides. */
export function parsePlansPreviewParams(
  params: Record<string, string | string[] | undefined>,
): { template?: PlansPageTemplate; themeConfig?: PlansThemeConfig } | null {
  if (params.preview !== "1") return null;

  const pick = (key: string) => {
    const v = params[key];
    return typeof v === "string" ? v : undefined;
  };

  const templateRaw = pick("template") ?? pick("previewTemplate");
  const template =
    templateRaw && PLANS_PAGE_TEMPLATES.includes(templateRaw as PlansPageTemplate)
      ? (templateRaw as PlansPageTemplate)
      : undefined;

  const themeConfig: PlansThemeConfig = {};
  const primary = pick("primary");
  const accent = pick("accent");
  if (primary && /^[0-9A-Fa-f]{6}$/.test(primary)) themeConfig.primaryColor = primary;
  if (accent && /^[0-9A-Fa-f]{6}$/.test(accent)) themeConfig.accentColor = accent;

  const heroStyle = pick("heroStyle");
  if (heroStyle === "solid" || heroStyle === "gradient" || heroStyle === "minimal") {
    themeConfig.heroStyle = heroStyle;
  }
  const cardStyle = pick("cardStyle");
  if (cardStyle === "bordered" || cardStyle === "shadow" || cardStyle === "flat") {
    themeConfig.cardStyle = cardStyle;
  }
  const buttonStyle = pick("buttonStyle");
  if (buttonStyle === "filled" || buttonStyle === "outline") {
    themeConfig.buttonStyle = buttonStyle;
  }
  const columns = pick("columns") ?? pick("columnsLayout");
  if (columns === "1" || columns === "2" || columns === "3") {
    themeConfig.columnsLayout = columns;
  }
  const fontScale = pick("fontScale");
  if (fontScale === "sm" || fontScale === "md" || fontScale === "lg") {
    themeConfig.fontScale = fontScale;
  }

  const boolParam = (key: string): boolean | undefined => {
    const v = pick(key);
    if (v === "1" || v === "true") return true;
    if (v === "0" || v === "false") return false;
    return undefined;
  };
  const showPhone = boolParam("showPhone");
  const showAddress = boolParam("showAddress");
  const showLogo = boolParam("showLogo");
  if (showPhone !== undefined) themeConfig.showPhone = showPhone;
  if (showAddress !== undefined) themeConfig.showAddress = showAddress;
  if (showLogo !== undefined) themeConfig.showLogo = showLogo;

  return { template, themeConfig: Object.keys(themeConfig).length ? themeConfig : undefined };
}

export function buildPreviewQueryString(
  template: PlansPageTemplate,
  themeConfig: PlansThemeConfig,
): string {
  const q = new URLSearchParams();
  q.set("preview", "1");
  q.set("template", template);
  if (themeConfig.primaryColor) q.set("primary", themeConfig.primaryColor);
  if (themeConfig.accentColor) q.set("accent", themeConfig.accentColor);
  if (themeConfig.heroStyle) q.set("heroStyle", themeConfig.heroStyle);
  if (themeConfig.cardStyle) q.set("cardStyle", themeConfig.cardStyle);
  if (themeConfig.buttonStyle) q.set("buttonStyle", themeConfig.buttonStyle);
  if (themeConfig.columnsLayout) q.set("columns", themeConfig.columnsLayout);
  if (themeConfig.fontScale) q.set("fontScale", themeConfig.fontScale);
  if (themeConfig.showPhone === false) q.set("showPhone", "0");
  if (themeConfig.showAddress === false) q.set("showAddress", "0");
  if (themeConfig.showLogo === false) q.set("showLogo", "0");
  return q.toString();
}
