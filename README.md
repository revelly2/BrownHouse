# 🏋️ GymReserve AI — Gym Equipment Reservation & Personalized Workout System

> AI-powered mobile application for gym equipment reservation, personalized workout planning, and real-time equipment management.

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React Native (Expo) + TypeScript |
| **Backend** | Supabase (PostgreSQL, Auth, Realtime, Edge Functions) |
| **AI Engine** | OpenAI-compatible API with deterministic fallback |
| **Navigation** | Expo Router (file-based routing) |

## 📁 Project Structure

```
balneg/
├── app/                          # Expo Router screens
│   ├── (auth)/                   # Auth screens (Login, Register)
│   ├── (client)/                 # Client module (5 tabs)
│   │   ├── dashboard.tsx         # Home with stats & quick actions
│   │   ├── equipment.tsx         # Browse & reserve machines
│   │   ├── reservations.tsx      # My bookings
│   │   ├── workouts.tsx          # AI workout plans & history
│   │   └── profile.tsx           # Profile management
│   ├── (admin)/                  # Admin module (4 tabs)
│   │   ├── dashboard.tsx         # Analytics overview
│   │   ├── users.tsx             # User management
│   │   ├── equipment-manage.tsx  # Equipment CRUD + status toggle
│   │   └── reservations-manage.tsx # Booking management
│   ├── _layout.tsx               # Root layout (AuthProvider)
│   └── index.tsx                 # Role-based redirect
├── components/                   # Reusable UI components
│   ├── ui/                       # Button, Card, Input, Badge
│   └── equipment/                # EquipmentCard
├── lib/                          # Core libraries
│   ├── supabase.ts               # Supabase client singleton
│   ├── auth.tsx                  # Auth context + useAuth hook
│   ├── types.ts                  # TypeScript DB type map
│   └── queue-fallback.ts         # Dynamic queue fallback logic
├── constants/colors.ts           # Design system tokens
├── supabase/
│   ├── migrations/               # PostgreSQL DDL scripts
│   └── functions/                # Edge Functions (AI)
└── .env.example                  # Environment template
```

## 🔧 Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Supabase
```bash
# Copy env template
cp .env.example .env

# Fill in your Supabase project credentials:
# EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Database Migration
Go to your Supabase Dashboard → SQL Editor → paste the contents of:
```
supabase/migrations/00001_initial_schema.sql
```

This creates all 10 tables, RLS policies, and the auto-profile trigger.

### 4. Start Development Server
```bash
npm run start
```

Then scan the QR code with Expo Go, or press:
- `a` for Android emulator
- `i` for iOS simulator
- `w` for web browser

## 📊 Database Schema

| Table | Description |
|-------|------------|
| `profiles` | User profiles (extends auth.users) |
| `equipment` | Gym machine catalog with real-time status |
| `exercises` | Exercise library with muscle group mapping |
| `reservations` | Equipment booking records |
| `maintenance_log` | Equipment maintenance records |
| `workout_plans` | Personalized plans with FITT parameters |
| `workout_details` | Individual exercises within a plan |
| `completed_sessions` | Logged sessions with JSONB metrics |
| `ai_recommendations` | AI-generated recommendations (audit log) |
| `notifications` | In-app notification inbox |

## 🤖 AI Recommendation Engine

The AI Edge Function (`supabase/functions/ai-recommendation/index.ts`):

1. Reads the authenticated user's profile (height, weight, fitness goal)
2. Applies the **FITT Principle** (Frequency, Intensity, Time, Type)
3. Generates a workout plan via AI API (or falls back to rule-based engine)
4. Returns a structured JSON workout matrix
5. Persists the recommendation for audit

## ⚡ Dynamic Queue Fallback

When equipment becomes unavailable (`lib/queue-fallback.ts`):

1. Subscribes to real-time equipment status changes via Supabase Realtime
2. Identifies affected reservations for the day
3. Looks up exercises that use that equipment → gets `muscle_group`
4. Queries for alternative exercises targeting the same muscle group
5. Filters to only include exercises using currently available equipment
6. Notifies affected clients with fallback suggestions

## 📱 Module Overview

### Client Module
- **Dashboard**: Greeting, quick stats, upcoming reservations, notifications
- **Equipment**: Browse with search & filters, real-time status, inline reservation
- **Reservations**: View bookings, cancel confirmed reservations
- **Workouts**: AI plan generator, FITT parameter display, session history
- **Profile**: Edit personal info, BMI calculation, fitness goals

### Admin Module
- **Dashboard**: Aggregate stats, equipment health bar, quick actions
- **Users**: Search & view all registered members with role badges
- **Equipment Manager**: Add/remove machines, toggle availability status
- **Reservation Manager**: View all bookings, complete/cancel actions

## 📄 License

MIT
