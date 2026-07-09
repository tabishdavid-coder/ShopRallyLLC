import { ShopRallyLogo, ShopRallyMark } from "@/components/brand/shoprally-logo";
import { BRAND, BRAND_ASSETS, BRAND_COLORS, BRAND_LOGO_ALT, BRAND_MARK_ALT } from "@/lib/brand";

export const metadata = {
  title: "ShopRally logo preview",
  description: "Approved ShopRally lockup + official brand palette",
};

const swatches = [
  { name: "Navy", hex: BRAND_COLORS.deep, role: "Trust — sidebar, Shop wordmark, chrome" },
  { name: "Azure", hex: BRAND_COLORS.flow, role: "Bridge — links, focus rings, active nav" },
  { name: "Racing orange", hex: BRAND_COLORS.action, role: "Action — Rally wordmark, CTAs" },
  { name: "Signal", hex: BRAND_COLORS.signal, role: "Destructive / urgent only" },
] as const;

export default function BrandPreviewPage() {
  return (
    <div className="min-h-screen bg-[#f4f7fb] text-brand-navy">
      <header
        className="px-6 py-10 text-white"
        style={{ backgroundColor: BRAND_COLORS.deep }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-white/75">
          ShopRally · Official brand kit
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Logo preview</h1>
        <p className="mt-2 max-w-xl text-sm text-white/90">
          Three chevrons (navy · azure · orange) ·{" "}
          <span className="font-semibold text-white">Shop</span>
          <span className="font-semibold" style={{ color: BRAND_COLORS.action }}>
            Rally
          </span>{" "}
          wordmark
        </p>
      </header>

      <main className="mx-auto grid max-w-3xl gap-5 p-6">
        <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Horizontal lockup — light background
          </h2>
          <div className="mt-4 overflow-hidden rounded-lg border border-dashed border-border bg-muted/20 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BRAND_ASSETS.logoLockup}
              alt={BRAND_LOGO_ALT}
              className="h-8 w-auto object-contain"
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            File:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">{BRAND_ASSETS.logoLockup}</code>
          </p>
        </section>

        <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            SVG export (email / CMS)
          </h2>
          <div className="mt-4 overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BRAND_ASSETS.logoLockupSvg}
              alt={BRAND_LOGO_ALT}
              width={320}
              height={80}
              className="h-auto w-full max-w-md"
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            File:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">{BRAND_ASSETS.logoLockupSvg}</code>
          </p>
        </section>

        <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            React components (light background)
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-8 rounded-lg border border-dashed border-border bg-muted/30 p-6">
            <ShopRallyLogo href="#" />
            <ShopRallyLogo href="#" size="sm" />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Sidebar style (navy chrome)
          </h2>
          <div
            className="mt-4 flex flex-wrap items-center gap-8 rounded-lg p-6"
            style={{ backgroundColor: BRAND_COLORS.deep }}
          >
            <ShopRallyLogo href="#" variant="onDark" />
            <div className="flex items-center gap-3">
              <ShopRallyMark size={48} variant="onDark" />
              <span className="text-xl font-bold text-white">
                Shop<span className="text-brand-orange">Rally</span>
              </span>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Active nav uses azure accent — not shown in the logo above.
          </p>
        </section>

        <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Mark only — favicon / app icon
          </h2>
          <div className="mt-4 flex flex-wrap items-end gap-8">
            <div className="text-center">
              <ShopRallyMark size={32} />
              <p className="mt-2 text-[10px] text-muted-foreground">32px</p>
            </div>
            <div className="text-center">
              <ShopRallyMark size={48} />
              <p className="mt-2 text-[10px] text-muted-foreground">48px</p>
            </div>
            <div className="text-center">
              <ShopRallyMark size={96} />
              <p className="mt-2 text-[10px] text-muted-foreground">96px</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND_ASSETS.markSvg} alt={BRAND_MARK_ALT} width={64} height={64} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND_ASSETS.mark} alt={BRAND_MARK_ALT} width={64} height={64} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND_ASSETS.appIcon} alt={BRAND_MARK_ALT} width={64} height={64} />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Official palette — {BRAND_COLORS.palette}
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {swatches.map((s) => (
              <div key={s.hex} className="text-center">
                <div
                  className="mx-auto h-14 w-full rounded-lg border border-black/5"
                  style={{ backgroundColor: s.hex }}
                />
                <p className="mt-2 text-xs font-semibold">{s.name}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{s.hex}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{s.role}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
