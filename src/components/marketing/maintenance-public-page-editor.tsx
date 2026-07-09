"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Loader2, MapPin, Phone, RotateCcw } from "lucide-react";

import { MaintenanceSectionNav } from "@/components/marketing/maintenance-section-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PlansPageTemplate } from "@/generated/prisma";
import { parseHeroSubtitle, serializeHeroSubtitle } from "@/lib/maintenance-public-page";
import {
  BRAND_ACCENT_HEX,
  BRAND_PRIMARY_HEX,
  PLANS_PAGE_TEMPLATES,
  TEMPLATE_META,
  buildPreviewQueryString,
  getTemplateDefaults,
  parseThemeConfig,
  type PlansThemeConfig,
} from "@/lib/plans-page-theme";
import { updateMaintenanceProgramSettings } from "@/server/actions/maintenance-programs";
import { cn } from "@/lib/utils";

type Settings = {
  enabled: boolean;
  plansSlug: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  termsDefault: string | null;
  pageTemplate?: PlansPageTemplate;
  themeConfig?: unknown;
};

type ShopInfo = {
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

type Props = {
  canEdit: boolean;
  settings: Settings;
  shopCode: string;
  plansUrl: string;
  embedIframe: string;
  embedLink: string;
  shop: ShopInfo;
};

const inputCls =
  "rounded-md border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20";

type EditorTab = "content" | "design" | "preview" | "share";

function slugify(code: string) {
  return code.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const TEMPLATE_PREVIEW_STYLES: Record<
  PlansPageTemplate,
  { hero: string; cards: string; featured?: number }
> = {
  CLASSIC: {
    hero: "bg-brand-navy",
    cards: "bg-white border-slate-200/80",
  },
  MODERN: {
    hero: "bg-gradient-to-b from-white to-slate-100 border-b border-slate-200/80",
    cards: "bg-white border-slate-100 shadow-sm",
  },
  BOLD: {
    hero: "bg-gradient-to-br from-brand-navy to-brand-light",
    cards: "bg-white border-brand-light/30",
    featured: 1,
  },
  PREMIUM: {
    hero: "bg-[#1E293B]",
    cards: "bg-neutral-900 border-neutral-700",
  },
};

function TemplateMiniPreview({ template }: { template: PlansPageTemplate }) {
  const styles = TEMPLATE_PREVIEW_STYLES[template];
  const isLightHero = template === "MODERN";

  return (
    <div
      aria-hidden
      className="w-[4.5rem] shrink-0 overflow-hidden rounded border border-border/60 bg-muted/30"
    >
      <div className={cn("h-3", styles.hero)} />
      <div className="flex gap-px bg-muted/50 p-0.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "h-2.5 flex-1 rounded-[2px] border",
              styles.cards,
              i === styles.featured && "ring-1 ring-brand-red",
            )}
          />
        ))}
      </div>
      <div className="flex justify-center py-0.5">
        <span
          className={cn(
            "h-0.5 w-4 rounded-full opacity-50",
            isLightHero ? "bg-slate-400" : "bg-white/50",
          )}
        />
      </div>
    </div>
  );
}

function TemplatePicker({
  value,
  onChange,
  disabled,
}: {
  value: PlansPageTemplate;
  onChange: (template: PlansPageTemplate) => void;
  disabled?: boolean;
}) {
  const selectedMeta = TEMPLATE_META[value];

  return (
    <div className="space-y-2">
      <Label id="page-template-label">Page template</Label>
      <div
        role="radiogroup"
        aria-labelledby="page-template-label"
        className="grid gap-2 sm:grid-cols-2"
      >
        {PLANS_PAGE_TEMPLATES.map((template) => {
          const meta = TEMPLATE_META[template];
          const selected = value === template;

          return (
            <button
              key={template}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(template)}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-lg border-2 px-2.5 py-2 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy focus-visible:ring-offset-2",
                selected
                  ? "border-brand-navy bg-white shadow-md ring-2 ring-brand-navy/15"
                  : "border-slate-200 bg-slate-50 hover:border-slate-400 hover:bg-white",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <TemplateMiniPreview template={template} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-tight text-slate-900">
                  {meta.label}
                </span>
                <span className="block text-xs text-slate-600 line-clamp-2">
                  {meta.description}
                </span>
              </span>
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  selected
                    ? "border-brand-navy bg-brand-navy text-white"
                    : "border-muted-foreground/25 bg-background",
                )}
              >
                {selected ? <Check className="size-2.5" strokeWidth={3} /> : null}
              </span>
            </button>
          );
        })}
      </div>
      <p className="rounded-lg border-2 border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-slate-700">
        <span className="font-semibold text-slate-900">{selectedMeta.label}:</span>{" "}
        {selectedMeta.description}
      </p>
    </div>
  );
}

export function MaintenancePublicPageEditor({
  canEdit,
  settings,
  shopCode,
  plansUrl,
  embedIframe,
  embedLink,
  shop,
}: Props) {
  const parsed = parseHeroSubtitle(settings.heroSubtitle);
  const savedTheme = parseThemeConfig(settings.themeConfig);

  const [enabled, setEnabled] = useState(settings.enabled);
  const [plansSlug, setPlansSlug] = useState(settings.plansSlug ?? slugify(shopCode));
  const [heroTitle, setHeroTitle] = useState(settings.heroTitle ?? "VIP Oil Maintenance Packages");
  const [heroSubtitle, setHeroSubtitle] = useState(parsed.subtitle);
  const [featuredHighlight, setFeaturedHighlight] = useState(parsed.highlight);
  const [termsDefault, setTermsDefault] = useState(settings.termsDefault ?? "");
  const [pageTemplate, setPageTemplate] = useState<PlansPageTemplate>(
    settings.pageTemplate ?? "CLASSIC",
  );
  const [themeConfig, setThemeConfig] = useState<PlansThemeConfig>(() => ({
    ...getTemplateDefaults(settings.pageTemplate ?? "CLASSIC"),
    ...savedTheme,
  }));
  const [editorTab, setEditorTab] = useState<EditorTab>("content");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const addressLine = [shop.address, shop.city, shop.state, shop.zip].filter(Boolean).join(", ");
  const slugPath = plansSlug.trim().toLowerCase() || slugify(shopCode);
  const basePreviewUrl = plansUrl.replace(/\/plans\/[^/?#]+/, `/plans/${slugPath}`);

  const previewUrl = useMemo(() => {
    const qs = buildPreviewQueryString(pageTemplate, themeConfig);
    return `${basePreviewUrl}?${qs}`;
  }, [basePreviewUrl, pageTemplate, themeConfig]);

  function selectTemplate(template: PlansPageTemplate) {
    if (!canEdit) return;
    setPageTemplate(template);
    setThemeConfig(getTemplateDefaults(template));
  }

  function patchTheme(patch: Partial<PlansThemeConfig>) {
    setThemeConfig((prev) => ({ ...prev, ...patch }));
  }

  function resetThemeToTemplate() {
    setThemeConfig(getTemplateDefaults(pageTemplate));
  }

  function saveSettings() {
    if (!canEdit) return;
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await updateMaintenanceProgramSettings({
        enabled,
        plansSlug: plansSlug.trim().toLowerCase(),
        heroTitle,
        heroSubtitle: serializeHeroSubtitle(featuredHighlight, heroSubtitle),
        termsDefault,
        pageTemplate,
        themeConfig,
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function copy(text: string, key: string) {
    void navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <section className="rounded-xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-white/10 bg-brand-navy px-5 py-4 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Public plans page</h2>
            <p className="text-sm text-white/80 mt-0.5">
              Edit content and design in separate tabs — preview when you&apos;re ready.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="bg-white text-brand-navy hover:bg-slate-100"
              asChild
            >
              <a href={previewUrl.replace(/\?preview=1.*/, "")} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 size-4" />
                Open page
              </a>
            </Button>
            {canEdit ? (
              <Button
                size="sm"
                className="bg-brand-red text-white hover:bg-brand-red/90"
                onClick={saveSettings}
                disabled={pending}
              >
                {pending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
                Save settings
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <MaintenanceSectionNav
          tabs={[
            { id: "content", label: "Content" },
            { id: "design", label: "Design" },
            { id: "preview", label: "Preview" },
            { id: "share", label: "Share" },
          ]}
          active={editorTab}
          onChange={(id) => setEditorTab(id as EditorTab)}
        />
      </div>

      <div className="p-5 md:p-6">
        {editorTab === "content" ? (
          <div className="mx-auto max-w-2xl space-y-5">
            <label className="flex items-start gap-3 rounded-lg border-2 border-slate-200 bg-slate-50 p-4 text-sm">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                disabled={!canEdit}
                className="mt-0.5 size-4 rounded border-slate-400"
              />
              <span>
                <span className="block font-semibold text-slate-900">Enable public maintenance plans page</span>
                <span className="block text-slate-600 mt-0.5">
                  Customers can browse and sign up at your public URL when this is on.
                </span>
              </span>
            </label>

            <div className="space-y-1.5">
              <Label htmlFor="pub-hero-title" className="text-slate-900">Page title</Label>
              <Input
                id="pub-hero-title"
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                disabled={!canEdit}
                placeholder="VIP Oil Maintenance Packages"
                className={inputCls}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pub-hero-sub" className="text-slate-900">Page subtitle</Label>
              <Textarea
                id="pub-hero-sub"
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                disabled={!canEdit}
                rows={3}
                placeholder="Prepaid packages and monthly memberships — proactive care, predictable pricing."
                className={inputCls}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pub-featured" className="text-slate-900">Featured plan note (optional)</Label>
              <Input
                id="pub-featured"
                value={featuredHighlight}
                onChange={(e) => setFeaturedHighlight(e.target.value)}
                disabled={!canEdit}
                placeholder="Most popular — Car Care Club"
                className={inputCls}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pub-slug" className="text-slate-900">Public URL</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600 shrink-0">/plans/</span>
                <Input
                  id="pub-slug"
                  value={plansSlug}
                  onChange={(e) => setPlansSlug(e.target.value)}
                  disabled={!canEdit}
                  className={cn(inputCls, "font-mono flex-1")}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 border-2 border-slate-300"
                  onClick={() => copy(basePreviewUrl, "url")}
                  title="Copy public URL"
                >
                  {copied === "url" ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-4 space-y-2 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                Shop contact (read-only)
              </p>
              {shop.phone ? (
                <p className="flex items-center gap-1.5 text-slate-800">
                  <Phone className="size-3.5 shrink-0" /> {shop.phone}
                </p>
              ) : (
                <p className="text-slate-600 italic">No phone on file</p>
              )}
              {addressLine ? (
                <p className="flex items-start gap-1.5 text-slate-800">
                  <MapPin className="size-3.5 shrink-0 mt-0.5" /> {addressLine}
                </p>
              ) : (
                <p className="text-slate-600 italic">No address on file</p>
              )}
              <Link href="/settings" className="text-brand-navy text-xs font-semibold hover:underline">
                Edit in Settings → Shop Profile
              </Link>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="terms-default" className="text-slate-900">Default terms & conditions</Label>
              <Textarea
                id="terms-default"
                value={termsDefault}
                onChange={(e) => setTermsDefault(e.target.value)}
                disabled={!canEdit}
                rows={4}
                placeholder="Vehicle-specific, non-transferable, services do not roll over…"
                className={inputCls}
              />
            </div>
          </div>
        ) : null}

        {editorTab === "design" ? (
          <div className="mx-auto max-w-3xl space-y-6">
            <TemplatePicker value={pageTemplate} onChange={selectTemplate} disabled={!canEdit} />

            <div className="space-y-4 rounded-xl border-2 border-slate-200 bg-white p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-900">Appearance</h3>
                {canEdit ? (
                  <Button type="button" variant="outline" size="sm" onClick={resetThemeToTemplate} className="border-slate-300">
                    <RotateCcw className="mr-1.5 size-4" />
                    Reset to template
                  </Button>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="theme-primary" className="text-slate-900">Primary color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="theme-primary"
                      type="color"
                      value={`#${themeConfig.primaryColor ?? BRAND_PRIMARY_HEX}`}
                      onChange={(e) => patchTheme({ primaryColor: e.target.value.replace("#", "") })}
                      disabled={!canEdit}
                      className="size-10 cursor-pointer rounded border-2 border-slate-300"
                    />
                    <Input
                      value={themeConfig.primaryColor ?? BRAND_PRIMARY_HEX}
                      onChange={(e) => patchTheme({ primaryColor: e.target.value.replace("#", "") })}
                      disabled={!canEdit}
                      className={cn(inputCls, "font-mono uppercase")}
                      maxLength={6}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="theme-accent" className="text-slate-900">Accent color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="theme-accent"
                      type="color"
                      value={`#${themeConfig.accentColor ?? BRAND_ACCENT_HEX}`}
                      onChange={(e) => patchTheme({ accentColor: e.target.value.replace("#", "") })}
                      disabled={!canEdit}
                      className="size-10 cursor-pointer rounded border-2 border-slate-300"
                    />
                    <Input
                      value={themeConfig.accentColor ?? BRAND_ACCENT_HEX}
                      onChange={(e) => patchTheme({ accentColor: e.target.value.replace("#", "") })}
                      disabled={!canEdit}
                      className={cn(inputCls, "font-mono uppercase")}
                      maxLength={6}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-900">Hero style</Label>
                  <select
                    value={themeConfig.heroStyle ?? "solid"}
                    onChange={(e) => patchTheme({ heroStyle: e.target.value as PlansThemeConfig["heroStyle"] })}
                    disabled={!canEdit}
                    className={cn(inputCls, "w-full")}
                  >
                    <option value="solid">Solid</option>
                    <option value="gradient">Gradient</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-900">Card style</Label>
                  <select
                    value={themeConfig.cardStyle ?? "shadow"}
                    onChange={(e) => patchTheme({ cardStyle: e.target.value as PlansThemeConfig["cardStyle"] })}
                    disabled={!canEdit}
                    className={cn(inputCls, "w-full")}
                  >
                    <option value="bordered">Bordered</option>
                    <option value="shadow">Shadow</option>
                    <option value="flat">Flat</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-900">Button style</Label>
                  <select
                    value={themeConfig.buttonStyle ?? "filled"}
                    onChange={(e) => patchTheme({ buttonStyle: e.target.value as PlansThemeConfig["buttonStyle"] })}
                    disabled={!canEdit}
                    className={cn(inputCls, "w-full")}
                  >
                    <option value="filled">Filled</option>
                    <option value="outline">Outline</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-900">Layout columns</Label>
                  <select
                    value={themeConfig.columnsLayout ?? "3"}
                    onChange={(e) => patchTheme({ columnsLayout: e.target.value as PlansThemeConfig["columnsLayout"] })}
                    disabled={!canEdit}
                    className={cn(inputCls, "w-full")}
                  >
                    <option value="3">3 columns</option>
                    <option value="2">2 columns</option>
                    <option value="1">Stacked</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-900">Font scale</Label>
                  <select
                    value={themeConfig.fontScale ?? "md"}
                    onChange={(e) => patchTheme({ fontScale: e.target.value as PlansThemeConfig["fontScale"] })}
                    disabled={!canEdit}
                    className={cn(inputCls, "w-full")}
                  >
                    <option value="sm">Small</option>
                    <option value="md">Medium</option>
                    <option value="lg">Large</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-slate-800">
                {(
                  [
                    ["showPhone", "Show phone"],
                    ["showAddress", "Show address"],
                    ["showLogo", "Show logo"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={themeConfig[key] ?? true}
                      onChange={(e) => patchTheme({ [key]: e.target.checked })}
                      disabled={!canEdit}
                      className="size-4 rounded border-slate-400"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {editorTab === "preview" ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Live preview updates as you change template and colors on the Design tab.
            </p>
            <div className="rounded-xl border-2 border-slate-300 overflow-hidden bg-white shadow-md">
              <iframe
                key={previewUrl}
                src={previewUrl}
                title="Public plans page preview"
                className="w-full h-[min(720px,70vh)] border-0"
                loading="lazy"
              />
            </div>
            <p className="text-sm text-slate-600">
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-navy underline">
                Open full preview in a new tab
              </a>
            </p>
          </div>
        ) : null}

        {editorTab === "share" ? (
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-700 mb-2">Public URL</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="flex-1 min-w-0 truncate rounded bg-white border border-slate-300 px-3 py-2 text-sm text-slate-900">
                  {basePreviewUrl}
                </code>
                <Button type="button" variant="outline" className="border-slate-300" onClick={() => copy(basePreviewUrl, "url")}>
                  {copied === "url" ? <Check className="mr-1 size-4" /> : <Copy className="mr-1 size-4" />}
                  Copy URL
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="border-slate-300" onClick={() => copy(embedIframe, "iframe")}>
                {copied === "iframe" ? <Check className="mr-1 size-4" /> : <Copy className="mr-1 size-4" />}
                Copy embed iframe
              </Button>
              <Button variant="outline" className="border-slate-300" onClick={() => copy(embedLink, "link")}>
                {copied === "link" ? <Check className="mr-1 size-4" /> : <Copy className="mr-1 size-4" />}
                Copy HTML link
              </Button>
            </div>
          </div>
        ) : null}

        {error ? <p className="mt-4 text-sm font-medium text-destructive">{error}</p> : null}
        {saved ? (
          <p className="mt-4 flex items-center gap-1 text-sm font-medium text-emerald-700">
            <Check className="size-4" /> Settings saved
          </p>
        ) : null}
      </div>
    </section>
  );
}
