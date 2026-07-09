import { ImageResponse } from "next/og";

import {
  SHOPRALLY_MARK_COLORS,
  SHOPRALLY_MARK_PATHS,
  SHOPRALLY_MARK_STROKE,
  SHOPRALLY_MARK_TILE,
} from "@/components/brand/shoprally-mark-paths";
import { BRAND, BRAND_COLORS } from "@/lib/brand";

export const runtime = "edge";

export const alt = `${BRAND.name} — Auto repair shop management software`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  const sw = SHOPRALLY_MARK_STROKE;
  const { w, h, rx } = SHOPRALLY_MARK_TILE;

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
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="96" height="96" viewBox="0 0 1024 1024">
              <rect width={w} height={h} rx={rx} fill={SHOPRALLY_MARK_COLORS.tile} />
              <path
                d={SHOPRALLY_MARK_PATHS.chevron1}
                fill="none"
                stroke={SHOPRALLY_MARK_COLORS.chevron1}
                strokeWidth={sw}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={SHOPRALLY_MARK_COLORS.chevron1Opacity}
              />
              <path
                d={SHOPRALLY_MARK_PATHS.chevron2}
                fill="none"
                stroke={SHOPRALLY_MARK_COLORS.chevron2}
                strokeWidth={sw}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={SHOPRALLY_MARK_PATHS.chevron3}
                fill="none"
                stroke={SHOPRALLY_MARK_COLORS.chevron3}
                strokeWidth={sw}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: "-0.03em" }}>
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
