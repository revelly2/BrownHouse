// ============================================================================
// Color Constants — Design System
// Premium, modern color palette for the Gym Reservation App (Halid Treasury Theme)
// ============================================================================

const tintColor = "#FBBF24"; // Yellow

export const Colors = {
  // ---- Brand Colors ----
  primary: "#FBBF24", // Yellow
  primaryLight: "#FCD34D",
  primaryDark: "#D97706",
  secondary: "#9CA3AF", // Grey
  secondaryLight: "#D1D5DB",
  secondaryDark: "#4B5563",
  accent: "#F87171", // Soft Red
  accentLight: "#FCA5A5",
  accentDark: "#DC2626",

  // ---- Status Colors ----
  success: "#10B981",
  warning: "#FBBF24", // Yellow
  error: "#EF4444",
  info: "#3B82F6",

  // ---- Equipment Status ----
  available: "#10B981",
  maintenance: "#FBBF24",
  occupied: "#EF4444",

  // ---- Reservation Status ----
  confirmed: "#10B981",
  cancelled: "#EF4444",
  completed: "#10B981",

  // ---- Main Theme (Premium Dark) ----
  background: "#000000",
  surface: "#1C1C1E",
  surfaceElevated: "#2C2C2E",
  border: "#3A3A3C",
  borderLight: "#48484A",
  text: "#F3F4F6",
  textSecondary: "#9CA3AF",
  textTertiary: "#6B7280",
  tint: tintColor,
  icon: "#9CA3AF",
  tabIconDefault: "#6B7280",
  tabIconSelected: tintColor,
  cardShadow: "rgba(0, 0, 0, 0.5)",
  overlay: "rgba(0, 0, 0, 0.8)",

  // ---- Legacy compatibility (if needed) ----
  light: {
    // Keep dark mode colors mapped to light for now since this is a global aesthetic
    text: "#F3F4F6",
    textSecondary: "#9CA3AF",
    textTertiary: "#6B7280",
    background: "#000000",
    surface: "#1C1C1E",
    surfaceElevated: "#2C2C2E",
    border: "#3A3A3C",
    borderLight: "#48484A",
    tint: tintColor,
    icon: "#9CA3AF",
    tabIconDefault: "#6B7280",
    tabIconSelected: tintColor,
    cardShadow: "rgba(0, 0, 0, 0.5)",
    overlay: "rgba(0, 0, 0, 0.8)",
  },
  dark: {
    text: "#F3F4F6",
    textSecondary: "#9CA3AF",
    textTertiary: "#6B7280",
    background: "#000000",
    surface: "#1C1C1E",
    surfaceElevated: "#2C2C2E",
    border: "#3A3A3C",
    borderLight: "#48484A",
    tint: tintColor,
    icon: "#9CA3AF",
    tabIconDefault: "#6B7280",
    tabIconSelected: tintColor,
    cardShadow: "rgba(0, 0, 0, 0.5)",
    overlay: "rgba(0, 0, 0, 0.8)",
  },

  // ---- Gradient Presets ----
  gradients: {
    primary: ["#FCD34D", "#FBBF24"],
    secondary: ["#D1D5DB", "#9CA3AF"],
    accent: ["#FCA5A5", "#F87171"],
    dark: ["#000000", "#1C1C1E"],
    cardGlow: ["rgba(251, 191, 36, 0.15)", "rgba(251, 191, 36, 0)"],
    heroOverlay: ["rgba(0, 0, 0, 0.8)", "rgba(0, 0, 0, 0.4)"],
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
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 20,
    xl: 23,
    "2xl": 32,
    "3xl": 43,
    "4xl": 54,
  },
  lineHeight: {
    tight: 1.1,
    normal: 1.4,
    relaxed: 1.6,
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
  xl: 17, // Halid Treasury card radius
  full: 9999,
} as const;
