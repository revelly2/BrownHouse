// ============================================================================
// Color Constants — Design System
// Premium, modern color palette for the Gym Reservation App
// ============================================================================

const tintColorLight = "#6C63FF";
const tintColorDark = "#8B83FF";

export const Colors = {
  // ---- Brand Colors ----
  primary: "#6C63FF",
  primaryLight: "#8B83FF",
  primaryDark: "#4A42D4",
  secondary: "#00D9A6",
  secondaryLight: "#33E4BC",
  secondaryDark: "#00B88A",
  accent: "#FF6B6B",
  accentLight: "#FF8E8E",
  accentDark: "#E04545",

  // ---- Status Colors ----
  success: "#00D9A6",
  warning: "#FFB84D",
  error: "#FF6B6B",
  info: "#63B3ED",

  // ---- Equipment Status ----
  available: "#00D9A6",
  maintenance: "#FFB84D",
  occupied: "#FF6B6B",

  // ---- Reservation Status ----
  confirmed: "#6C63FF",
  cancelled: "#FF6B6B",
  completed: "#00D9A6",

  // ---- Light Theme ----
  light: {
    text: "#1A1A2E",
    textSecondary: "#6B7280",
    textTertiary: "#9CA3AF",
    background: "#F8F9FE",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    border: "#E5E7EB",
    borderLight: "#F3F4F6",
    tint: tintColorLight,
    icon: "#6B7280",
    tabIconDefault: "#9CA3AF",
    tabIconSelected: tintColorLight,
    cardShadow: "rgba(0, 0, 0, 0.08)",
    overlay: "rgba(0, 0, 0, 0.5)",
  },

  // ---- Dark Theme ----
  dark: {
    text: "#F8F9FE",
    textSecondary: "#9CA3AF",
    textTertiary: "#6B7280",
    background: "#0F0F1A",
    surface: "#1A1A2E",
    surfaceElevated: "#252540",
    border: "#2D2D4A",
    borderLight: "#1F1F35",
    tint: tintColorDark,
    icon: "#9CA3AF",
    tabIconDefault: "#6B7280",
    tabIconSelected: tintColorDark,
    cardShadow: "rgba(0, 0, 0, 0.3)",
    overlay: "rgba(0, 0, 0, 0.7)",
  },

  // ---- Gradient Presets ----
  gradients: {
    primary: ["#6C63FF", "#8B83FF"],
    secondary: ["#00D9A6", "#33E4BC"],
    accent: ["#FF6B6B", "#FF8E8E"],
    dark: ["#1A1A2E", "#252540"],
    cardGlow: ["rgba(108, 99, 255, 0.15)", "rgba(108, 99, 255, 0)"],
    heroOverlay: ["rgba(15, 15, 26, 0.8)", "rgba(15, 15, 26, 0.4)"],
  },
} as const;

// ---- Typography Scale ----
export const Typography = {
  fontFamily: {
    regular: "System",
    medium: "System",
    bold: "System",
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    "2xl": 30,
    "3xl": 36,
    "4xl": 48,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// ---- Spacing Scale ----
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
  "5xl": 64,
} as const;

// ---- Border Radius ----
export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;
