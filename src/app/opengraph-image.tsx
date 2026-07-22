import { ImageResponse } from "next/og";

import { BRAND, BRAND_COLORS } from "@/lib/brand";

/** Node runtime — edge + nested SVG crashed Turbopack dev with empty replies. */
export const runtime = "nodejs";

export const alt = `${BRAND.name} — Auto repair shop management software`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 80px",
          background: `linear-gradient(135deg, ${BRAND_COLORS.deep} 0%, #152a40 100%)`,
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 20,
              background: BRAND_COLORS.deep,
              border: "2px solid rgba(255,255,255,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 14,
                height: 44,
                background: "rgba(255,255,255,0.45)",
                transform: "skewX(-18deg)",
              }}
            />
            <div
              style={{
                width: 14,
                height: 44,
                background: BRAND_COLORS.flow,
                transform: "skewX(-18deg)",
              }}
            />
            <div
              style={{
                width: 14,
                height: 44,
                background: BRAND_COLORS.action,
                transform: "skewX(-18deg)",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: "-0.03em", display: "flex" }}>
              Shop<span style={{ color: BRAND_COLORS.action }}>Rally</span>
            </div>
            <div style={{ fontSize: 28, opacity: 0.92, maxWidth: 720, lineHeight: 1.35 }}>
              {BRAND.tagline}
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 48,
            fontSize: 22,
            opacity: 0.75,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          CRM · Job board · Estimates · Payments
        </div>
      </div>
    ),
    { ...size },
  );
}
