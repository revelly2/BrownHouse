# GymReserve AI — Project Documentation

> A cross-platform gym management & AI-powered workout recommendation app built with Expo (React Native).

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Architecture & Key Concepts](#4-architecture--key-concepts)
5. [Database Schema (Supabase)](#5-database-schema-supabase)
6. [Environment Variables](#6-environment-variables)
7. [Prerequisites](#7-prerequisites)
8. [Running the App — Step by Step](#8-running-the-app--step-by-step)
9. [Building for Production](#9-building-for-production)
10. [Supabase Edge Functions](#10-supabase-edge-functions)
11. [User Roles & Navigation Flow](#11-user-roles--navigation-flow)
12. [Component Library](#12-component-library)

---

## 1. Project Overview

**GymReserve AI** (`balneg`) is a mobile-first application for managing a gym facility. It supports three user roles:

| Role | Capabilities |
|------|-------------|
| **Client** | Book equipment, track workouts, view AI-generated recommendations, manage profile |
| **Admin** | Manage equipment, approve/cancel reservations, view all users |
| **Trainer** | Same access level as Admin |

The app uses **Supabase** as its backend (auth, database, real-time, storage) and **Expo** as the cross-platform framework targeting **Android**, **iOS**, and **Web**.

---

## 2. Tech Stack

### Core Framework

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React Native** | `0.85.3` | Cross-platform mobile UI |
| **React** | `19.2.3` | UI library |
| **Expo** | `~56.0.12` | Managed workflow, build tooling |
| **TypeScript** | `~6.0.3` | Static typing |

### Routing & Navigation

| Package | Purpose |
|---------|---------|
| `expo-router` `^56.2.11` | File-based routing (like Next.js but for React Native) |
| `react-native-screens` | Native screen containers for performance |
| `react-native-safe-area-context` | Safe area insets on notched devices |

### Backend & Auth

| Package | Purpose |
|---------|---------|
| `@supabase/supabase-js` `^2.108.2` | Supabase client — auth, DB queries, realtime |
| `expo-secure-store` | Secure JWT token storage on native |
| `expo-auth-session` | OAuth session helpers |
| `expo-web-browser` | In-app browser for OAuth flows |
| `react-native-url-polyfill` | URL API polyfill required by Supabase on React Native |

### UI & Animations

| Package | Purpose |
|---------|---------|
| `expo-linear-gradient` | Gradient backgrounds & cards |
| `react-native-reanimated` `4.3.1` | Smooth 60fps animations |
| `react-native-svg` `15.15.4` | SVG rendering (used in charts & gauges) |
| `react-native-chart-kit` `^7.0.1` | Line/bar/pie charts for dashboards |
| `lucide-react-native` `^1.22.0` | Icon library |

### Media & Device

| Package | Purpose |
|---------|---------|
| `expo-image-picker` | Camera roll & camera access for profile pictures |
| `expo-notifications` | Push notifications |
| `expo-device` | Device info (used for push token registration) |
| `expo-constants` | App constants & manifest access |
| `expo-crypto` | Cryptographic utilities |
| `expo-linking` | Deep linking & universal links |

### Build & Tooling

| Package | Purpose |
|---------|---------|
| `@expo/metro-runtime` | Metro bundler runtime for web |
| `react-native-web` | Web target renderer |
| `react-dom` | React DOM for web target |
| `@expo/ngrok` | Local tunnel for testing on physical devices |
| `eas.json` | Expo Application Services build configuration |

---

## 3. Project Structure

```
balneg/
├── app/                        # File-based routes (expo-router)
│   ├── _layout.tsx             # Root layout — auth guard, providers
│   ├── index.tsx               # Entry point — splash + role-based redirect
│   ├── (auth)/                 # Unauthenticated routes (grouped, no tab bar)
│   │   ├── _layout.tsx
│   │   ├── login.tsx           # Login screen
│   │   ├── register.tsx        # Registration screen
│   │   └── onboarding/         # Onboarding flow for new users
│   ├── client/                 # Client-facing screens (tab navigation)
│   │   ├── _layout.tsx         # Tab bar layout
│   │   ├── dashboard.tsx       # Home dashboard with stats & AI tips
│   │   ├── equipment.tsx       # Browse & reserve equipment
│   │   ├── reservations.tsx    # My bookings
│   │   ├── workouts.tsx        # Workout plans & logging
│   │   ├── workout-form.tsx    # Create/edit workout form
│   │   ├── notifications.tsx   # In-app notifications
│   │   └── profile.tsx         # Profile & body measurements
│   └── admin/                  # Admin/Trainer screens (tab navigation)
│       ├── _layout.tsx         # Tab bar layout
│       ├── dashboard.tsx       # Analytics & overview
│       ├── equipment-manage.tsx# CRUD for gym equipment
│       ├── reservations-manage.tsx # Manage all reservations
│       └── users.tsx           # View all registered users
│
├── components/                 # Reusable components
│   ├── NotificationListener.tsx# Background push notification handler
│   ├── equipment/              # Equipment-specific components
│   ├── navigation/             # Custom nav components
│   └── ui/                     # Design system components
│       ├── ActivityGauge.tsx   # Circular activity gauge (SVG)
│       ├── AnimatedBackground.tsx # Animated gradient background
│       ├── Badge.tsx           # Status badge chips
│       ├── Button.tsx          # Primary/secondary/ghost buttons
│       ├── Card.tsx            # Glass-morphism card container
│       ├── GlassAlert.tsx      # Toast-style alert overlays
│       ├── Icon.tsx            # Icon wrapper (lucide)
│       ├── Input.tsx           # Styled text input
│       └── Toast.tsx           # Global toast notification system
│
├── lib/                        # Core utilities & services
│   ├── auth.tsx                # AuthContext + useAuth hook
│   ├── supabase.ts             # Supabase client singleton
│   ├── types.ts                # TypeScript types (maps to DB schema)
│   ├── utils.ts                # General utility functions
│   ├── notifications.ts        # Push notification registration helpers
│   └── queue-fallback.ts       # Offline queue / retry logic
│
├── constants/                  # App-wide constants
│   └── colors.ts               # Color palette & design tokens
│
├── assets/                     # Static assets
│   ├── icon.png
│   ├── favicon.png
│   └── android-icon-*.png
│
├── supabase/                   # Supabase backend
│   ├── functions/
│   │   └── ai-recommendation/
│   │       └── index.ts        # Edge Function: AI workout recommendations
│   └── migrations/             # SQL migration files
│
├── app.json                    # Expo app manifest
├── eas.json                    # EAS Build configuration
├── package.json
├── tsconfig.json
├── .env                        # Local secrets (not committed)
└── .env.example                # Template for .env
```

---

## 4. Architecture & Key Concepts

### File-Based Routing (expo-router)

Routes are defined by the file system under `app/`. Special conventions:

- `_layout.tsx` — wraps children in a shared layout (Stack, Tabs, etc.)
- `(auth)/` — parentheses denote a **route group** (the folder name is not part of the URL)
- `index.tsx` — the default screen for a folder

### Auth & Role-Based Access

`lib/auth.tsx` exports an `AuthProvider` and `useAuth()` hook. On mount it:
1. Reads the persisted Supabase session from `SecureStore`
2. Fetches the user's `profile` row to determine their **role** (`admin | trainer | client`)
3. Listens to real-time auth state changes

`app/index.tsx` uses the role to redirect:
```
Not logged in  →  /(auth)/login
client         →  /client/dashboard
admin/trainer  →  /admin/dashboard
```

### Token Storage Strategy

| Platform | Storage |
|----------|---------|
| iOS / Android | `expo-secure-store` (encrypted keychain) |
| Web | `localStorage` |

### Supabase Realtime

The client is configured with `eventsPerSecond: 10` for real-time subscriptions (e.g., live reservation status updates, notifications).

---

## 5. Database Schema (Supabase)

The following tables are defined in the TypeScript types and mirror the Supabase PostgreSQL schema:

| Table | Description |
|-------|-------------|
| `profiles` | Extended user info — name, role, height, weight, fitness goal |
| `equipment` | Gym equipment inventory |
| `exercises` | Exercise library with muscle groups & tutorial URLs |
| `reservations` | Equipment booking records |
| `maintenance_log` | Equipment maintenance history |
| `workout_plans` | AI or manually created workout plans |
| `workout_details` | Individual exercises within a plan (sets, reps, rest) |
| `completed_sessions` | Logged workout sessions with performance metrics |
| `ai_recommendations` | AI-generated plan/exercise suggestions |
| `notifications` | In-app notification records |
| `measurement_history` | Weight/height tracking over time |

### User Roles (Enum)

```
admin | trainer | client
```

### Equipment Status (Enum)

```
available | maintenance | occupied
```

### Reservation Status (Enum)

```
confirmed | cancelled | completed
```

---

## 6. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
# Required — from Supabase Dashboard → Project Settings → API
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional — for the AI Edge Function
# AI_API_KEY=sk-your-openai-api-key
# AI_API_URL=https://api.openai.com/v1/chat/completions
# AI_MODEL=gpt-4o-mini
```

> [!IMPORTANT]
> Variables prefixed with `EXPO_PUBLIC_` are **embedded at build time** and visible to the client. Never put secret/service-role keys here.

---

## 7. Prerequisites

Make sure the following are installed on your machine before running the app:

| Tool | Version | Check |
|------|---------|-------|
| **Node.js** | ≥ 18.x | `node -v` |
| **npm** | ≥ 9.x | `npm -v` |
| **Expo CLI** | Latest | `npx expo --version` |
| **Git** | Any | `git --version` |

For physical device testing:
- Install the **Expo Go** app from the App Store / Google Play

For Android emulation:
- Install **Android Studio** and create an AVD (Android Virtual Device)

For iOS simulation (macOS only):
- Install **Xcode** and the iOS Simulator

---

## 8. Running the App — Step by Step

### Step 1 — Clone the repository

```bash
git clone <your-repo-url>
cd balneg
```

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — Set up environment variables

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

Open `.env` and fill in your **Supabase URL** and **Anon Key**:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

> Get these from [https://app.supabase.com](https://app.supabase.com) → Your Project → **Project Settings → API**

### Step 4 — Set up the Supabase Database

1. Go to your Supabase project → **SQL Editor**
2. Run the migration files found in `supabase/migrations/` in order
3. Verify the tables are created in the **Table Editor**

### Step 5 — Start the development server

```bash
npm start
# or equivalently:
npx expo start
```

This opens the **Expo DevTools** in your terminal. You will see a QR code.

### Step 6 — Open on your preferred platform

| Command | Platform |
|---------|---------|
| Press `a` | Android Emulator |
| Press `i` | iOS Simulator (macOS only) |
| Press `w` | Web browser |
| Scan QR code | Physical device via **Expo Go** app |

**Shortcut npm scripts:**

```bash
npm run android   # Opens on Android emulator
npm run ios       # Opens on iOS simulator
npm run web       # Opens in browser at http://localhost:8081
```

### Step 7 — Log in or register

- Open the app → you will be redirected to the **Login** screen
- Register a new account or log in with existing Supabase credentials
- The app automatically redirects you to the correct dashboard based on your **role**

---

## 9. Building for Production

The project uses **EAS Build** (Expo Application Services).

### Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### Build an Android APK (Preview)

```bash
eas build --platform android --profile preview
```

### Build for Production

```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```

> [!NOTE]
> The `preview` build profile in `eas.json` already has the Supabase credentials baked in. The `production` profile reads from EAS environment variables — set them in the EAS dashboard.

---

## 10. Supabase Edge Functions

### `ai-recommendation`

**Path:** `supabase/functions/ai-recommendation/index.ts`

This Deno-based Edge Function generates AI-powered workout recommendations for clients. It:

1. Receives a client profile (fitness goal, weight, height, difficulty preference)
2. Calls an external AI API (OpenAI-compatible endpoint configured via env vars)
3. Returns a structured workout plan or exercise suggestion
4. The result is stored in the `ai_recommendations` table

**To deploy the function:**

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login and link your project
supabase login
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy ai-recommendation

# Set AI environment secrets
supabase secrets set AI_API_KEY=sk-your-openai-key
supabase secrets set AI_API_URL=https://api.openai.com/v1/chat/completions
supabase secrets set AI_MODEL=gpt-4o-mini
```

---

## 11. User Roles & Navigation Flow

```
App Launch
    │
    ▼
index.tsx (Splash)
    │
    ├── Not logged in ──────────► (auth)/login
    │                                  │
    │                             register.tsx
    │                             onboarding/
    │
    ├── role: client ──────────► /client/dashboard
    │                              ├── Equipment
    │                              ├── Reservations
    │                              ├── Workouts
    │                              ├── Notifications
    │                              └── Profile
    │
    └── role: admin/trainer ───► /admin/dashboard
                                   ├── Equipment Manage
                                   ├── Reservations Manage
                                   └── Users
```

---

## 12. Component Library

All reusable UI components live in `components/ui/`:

| Component | Description |
|-----------|-------------|
| `Button` | Primary, secondary, ghost, and danger variants with loading states |
| `Input` | Styled text input with label, error, and icon support |
| `Card` | Glass-morphism card container with optional shadow |
| `Badge` | Small status chip (e.g., "Available", "Maintenance") |
| `Toast` | Global toast notification system (success, error, info) |
| `GlassAlert` | Full-width dismissible alert banner |
| `ActivityGauge` | Circular SVG gauge for workout activity metrics |
| `AnimatedBackground` | Full-screen animated gradient background |
| `Icon` | Wrapper for `lucide-react-native` icons with sizing |

---

> [!TIP]
> **Quick Start Summary:**
> 1. `npm install`
> 2. Copy `.env.example` → `.env` and add Supabase credentials
> 3. Run migrations in Supabase SQL Editor
> 4. `npm start` → press `w` for web, `a` for Android, `i` for iOS
