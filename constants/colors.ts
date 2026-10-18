// ============================================================================
// Color Constants — Design System
// Premium, modern color palette for the Gym Reservation App (Halid Treasury Theme)
// ============================================================================
import { Platform } from "react-native";

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

  // ---- Apple Translucent Materials & Depth ----
  materials: {
    glass: "rgba(24, 24, 28, 0.72)",
    glassElevated: "rgba(32, 32, 38, 0.82)",
    glassSubtle: "rgba(255, 255, 255, 0.05)",
    glassBorder: "rgba(255, 255, 255, 0.12)",
    glassBorderSubtle: "rgba(255, 255, 255, 0.07)",
    glassHighlight: "rgba(255, 255, 255, 0.22)",
    scrim: "rgba(0, 0, 0, 0.75)",
  },
} as const;

// ---- Typography Scale & Optical Tracking ----
export const Typography = {
  fontFamily: {
    sans: Platform.select({
      ios: "System",
      android: "Roboto",
      web: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', system-ui, sans-serif",
      default: "System",
    }),
    regular: Platform.select({
      ios: "System",
      android: "Roboto",
      web: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
      default: "System",
    }),
    medium: Platform.select({
      ios: "System",
      android: "Roboto-Medium",
      web: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
      default: "System",
    }),
    bold: Platform.select({
      ios: "System",
      android: "Roboto-Bold",
      web: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
      default: "System",
    }),
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    "2xl": 30,
    "3xl": 38,
    "4xl": 48,
  },
  lineHeight: {
    tight: 1.15,
    normal: 1.45,
    relaxed: 1.6,
  },
  letterSpacing: {
    tighter: -0.6, // negative tracking on big titles (Apple design §15)
    tight: -0.3,   // titles & headers
    normal: 0,     // comfortable body
    wide: 0.25,    // small labels & captions
    wider: 0.8,    // uppercase category badges
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

// ---- Border Radius (Apple Squircles) ----
export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,   // iOS input fields & compact buttons
  lg: 16,   // interactive modules
  xl: 22,   // Apple standard cards
  "2xl": 28,// floating sheets & modals
  full: 9999,
} as const;
