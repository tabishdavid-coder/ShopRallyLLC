import { AutopilotLogo, AutopilotLogoImage, AutopilotMark } from "@/components/autopilot3030/brand/autopilot-logo";
import { AP_BRAND, AP_BRAND_COLORS } from "@/lib/autopilot3030/brand";

export const metadata = {
  title: "Autopilot brand preview — Project 3030",
  description: "Deep Ocean Command palette + typographic AP mark",
};

const swatches = [
  { name: "Abyss", hex: AP_BRAND_COLORS.abyss, role: "Primary / sidebar" },
  { name: "Tide", hex: AP_BRAND_COLORS.tide, role: "Primary buttons" },
  { name: "Coral", hex: AP_BRAND_COLORS.coral, role: "Accent / active nav" },
  { name: "Seafoam", hex: AP_BRAND_COLORS.seafoam, role: "Success / step complete" },
  { name: "Signal", hex: AP_BRAND_COLORS.signal, role: "Destructive" },
] as const;

export default function AutopilotBrandPage() {
  return (
    <div className="min-h-screen ap-bg-surface ap-text">
      <header
        className="px-6 py-10 text-white"
        style={{ backgroundColor: AP_BRAND_COLORS.abyss }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-white/75">
          {AP_BRAND.name} · {AP_BRAND_COLORS.palette} · Project 3030
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Brand preview</h1>
        <p className="mt-2 max-w-xl text-sm text-white/90">{AP_BRAND.tagline}</p>
      </header>

      <main className="mx-auto grid max-w-3xl gap-5 p-6">
        <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Logo lockup
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-8">
            <AutopilotLogo href="#" showTagline />
            <AutopilotLogoImage />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Command rail mark
          </h2>
          <div
            className="mt-4 inline-flex items-center gap-6 rounded-lg p-6"
            style={{ backgroundColor: AP_BRAND_COLORS.abyss }}
          >
            <AutopilotMark size={32} variant="onDark" />
            <AutopilotMark size={48} variant="onDark" />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Palette C — Deep Ocean Command
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
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

        <section className="space-y-3 rounded-xl border border-dashed border-brand-light/50 p-6 ap-bg-surface-raised">
          <p className="text-sm font-medium">Preview server</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Run <code className="rounded bg-muted px-1.5 py-0.5">npm run dev:3030</code> then open{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">http://localhost:3030/dashboard</code>
          </p>
        </section>
      </main>
    </div>
  );
}
