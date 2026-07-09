/**
 * ShopRally mark geometry — official brand-kit chevrons on navy squircle.
 * viewBox: 0 0 1024 1024 (matches shoprally-brand-kit/svg/app-icon.svg).
 */
export const SHOPRALLY_MARK_VIEWBOX = "0 0 1024 1024";

export const SHOPRALLY_MARK_TILE = {
  x: 0,
  y: 0,
  w: 1024,
  h: 1024,
  rx: 230,
} as const;

/** Chevron stroke — matches approved app-icon proportions */
export const SHOPRALLY_MARK_STROKE = 86;

export const SHOPRALLY_MARK_PATHS = {
  chevron1: "M 238.2 311.3 L 375.8 512.0 L 238.2 712.7",
  chevron2: "M 444.6 311.3 L 582.2 512.0 L 444.6 712.7",
  chevron3: "M 651.1 311.3 L 788.7 512.0 L 651.1 712.7",
} as const;

export const SHOPRALLY_MARK_COLORS = {
  tile: "#1E3A56",
  chevron1: "#FFFFFF",
  chevron1Opacity: 0.45,
  chevron2: "#00A9FF",
  chevron3: "#F4581C",
} as const;
