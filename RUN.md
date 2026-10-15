# 🚀 GymReserve AI (BrownHouse Fitness) — Setup & Run Guide

This guide walks you through setting up and running this project on a **new computer** after downloading or transferring the project folder via **Google Drive**.

---

## 📋 Table of Contents
1. [Prerequisites & System Requirements](#1-prerequisites--system-requirements)
2. [Step-by-Step Installation Tutorial](#2-step-by-step-installation-tutorial)
   - [Step 1: Extract the Downloaded Folder](#step-1-extract-the-downloaded-folder)
   - [Step 2: Open Terminal / Command Prompt](#step-2-open-terminal--command-prompt)
   - [Step 3: Verify Node.js and npm](#step-3-verify-nodejs-and-npm)
   - [Step 4: Configure Environment Variables (.env)](#step-4-configure-environment-variables-env)
   - [Step 5: Install Project Dependencies](#step-5-install-project-dependencies)
   - [Step 6: Start the Development Server](#step-6-start-the-development-server)
3. [How to View and Test the App](#3-how-to-view-and-test-the-app)
   - [Option A: Web Browser (Fastest & Easiest)](#option-a-web-browser-fastest--easiest)
   - [Option B: Physical Mobile Device (Expo Go)](#option-b-physical-mobile-device-expo-go)
   - [Option C: Android Emulator](#option-c-android-emulator)
4. [Database Setup (Supabase)](#4-database-setup-supabase)
5. [Troubleshooting & Common Issues](#5-troubleshooting--common-issues)
6. [Quick Command Cheatsheet](#6-quick-command-cheatsheet)

---

## 1. Prerequisites & System Requirements

Before running the project on the new computer, ensure the following software is installed:

### 1.1 Required Software
| Software | Recommended Version | Download Link | Notes |
| :--- | :--- | :--- | :--- |
| **Node.js** | **v20 LTS** (or v18+) | [nodejs.org](https://nodejs.org/) | Includes `npm`. Do **not** use very old versions (<18). |
| **Git** *(Optional but recommended)* | Latest | [git-scm.com](https://git-scm.com/) | Useful for terminal tooling and version control. |
| **Code Editor** | VS Code (Recommended) | [code.visualstudio.com](https://code.visualstudio.com/) | Recommended extensions: *Expo Tools*, *ESLint*, *Prettier*. |

### 1.2 Mobile Testing App (For testing on a real phone)
- **Android**: Install **[Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent)** from the Google Play Store.
- **iOS**: Install **[Expo Go](https://apps.apple.com/app/expo-go/id982107779)** from the Apple App Store.

---

## 2. Step-by-Step Installation Tutorial

### Step 1: Extract the Downloaded Folder

> [!WARNING]
> **Do not run the project directly inside a `.zip` archive!**

1. If downloaded from Google Drive as a `.zip` file:
   - **Windows**: Right-click the `.zip` file → Click **"Extract All..."** → Choose a clean destination path (e.g., `C:\Projects\balneg` or your Desktop).
   - **Mac**: Double-click the `.zip` file to extract.
2. Ensure the extracted folder name has **no spaces or special characters** in its directory path if possible.

---

### Step 2: Open Terminal / Command Prompt

Navigate inside the extracted project root (the folder containing `package.json`):

- **Windows**:
  - Open the folder in File Explorer.
  - Click on the address bar at the top, type `cmd` or `powershell`, and press <kbd>Enter</kbd>.
  - *Or:* Right-click empty space inside the folder → **"Open in Terminal"**.
- **Mac / Linux**:
  - Open Terminal and run:
    ```bash
    cd /path/to/extracted/folder
    ```

---

### Step 3: Verify Node.js and npm

In your terminal, verify that Node.js and npm are properly installed and recognized:

```bash
node -v
npm -v
```

- Expected output:
  - `node -v` should show `v18.x.x`, `v20.x.x`, or higher.
  - `npm -v` should show `v9.x.x` or `v10.x.x`.

*(If you get `'node' is not recognized`, install Node.js from [nodejs.org](https://nodejs.org/) and restart your terminal).*

---

### Step 4: Configure Environment Variables (`.env`)

Google Drive downloads frequently omit or hide dotfiles like `.env`. The project needs a `.env` file in the root directory to connect to Supabase.

1. **Check if `.env` exists:**
   - Look in the project folder for a file named `.env`.
   - On Windows, make sure **"Hidden items"** and **"File name extensions"** are enabled in File Explorer (View → Show → Hidden items).

2. **If `.env` is missing:**
   - Locate the `.env.example` file in the project folder.
   - Make a copy of `.env.example` and rename it to `.env` (ensure it is not named `.env.txt`).
   - Open `.env` in a text editor (VS Code, Notepad) and enter your credentials:

```ini
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Optional: AI Engine Configuration (for AI Recommendations Edge Function)
AI_API_KEY=your-api-key
AI_API_URL=https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
AI_MODEL=gemini-2.5-flash
```

> [!NOTE]
> If you already have the credentials from the original author/team, copy the exact values into `.env`. Without valid `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`, the app cannot log in or fetch gym data.

---

### Step 5: Install Project Dependencies

If the folder transferred from Google Drive included a `node_modules` folder, it is recommended to remove it first because binary modules compiled on another OS/architecture will cause errors.

1. **Delete any old `node_modules` (if present):**
   - **Windows (PowerShell):**
     ```powershell
     Remove-Item -Recurse -Force node_modules
     ```
   - **Mac / Linux:**
     ```bash
     rm -rf node_modules
     ```
   *(Or simply delete the `node_modules` folder in File Explorer).*

2. **Install fresh packages:**
   ```bash
   npm install
   ```
   *(If you encounter dependency conflict warnings, run: `npm install --legacy-peer-deps`)*

---

### Step 6: Start the Development Server

Start the Expo Metro bundler:

```bash
npx expo start
```
*(or `npm start`)*

Once Metro bundler starts, you will see a QR code and an interactive menu in your terminal:

```text
› Metro waiting on exp://192.168.x.x:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web
› Press j │ open debugger
› Press r │ reload app
```

---

## 3. How to View and Test the App

### Option A: Web Browser (Fastest & Easiest)
You do not need a phone or an emulator to test the application!

1. In the terminal where Expo is running, press <kbd>w</kbd>.
2. Your default web browser will open `http://localhost:8081`.
3. Press <kbd>F12</kbd> (Developer Tools) and toggle **Device Toolbar** (<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>M</kbd>) to preview in mobile screen dimensions.

---

### Option B: Physical Mobile Device (Expo Go)

1. Make sure your **computer and phone are connected to the same Wi-Fi network**.
2. Open the **Expo Go** app on your phone:
   - **Android**: Tap **"Scan QR code"** inside Expo Go and scan the terminal QR code.
   - **iOS**: Open the native **Camera** app, point at the terminal QR code, and tap the yellow banner to open in Expo Go.
3. The JavaScript bundle will download to your phone (progress bar shown in terminal).

#### 🌐 What if phone and PC are on different Wi-Fi or cannot connect?
If you are on campus/public Wi-Fi or a mobile hotspot where devices cannot talk to each other directly, use **Tunnel Mode**:
```bash
npx expo start --tunnel
```
*(This routes traffic through ngrok so your phone can connect from any network).*

---

### Option C: Android Emulator

1. Install **Android Studio** and set up an Android Virtual Device (AVD).
2. Start your Android Emulator.
3. In the Expo terminal, press <kbd>a</kbd>. Expo will install Expo Go onto the emulator and open the app.

---

## 4. Database Setup (Supabase)

If the Supabase project is already hosted in the cloud and active:
- **No extra database setup is required.** Just make sure your `.env` has the correct `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

If you are setting up a **brand-new Supabase project**:
1. Log in to [Supabase](https://supabase.com) and create a new project.
2. Go to **Project Settings** → **API** to copy the **Project URL** and **anon public key** into your `.env` file.
3. Go to **SQL Editor** in the Supabase Dashboard.
4. Execute the migration scripts located in `supabase/migrations/` sequentially:
   - `00001_initial_schema.sql` (Creates core tables, auth trigger, and RLS)
   - `00002_add_experience_level.sql`
   - `00003_add_measurement_history.sql`
   - `00004_add_delete_policy.sql`
   - `00005_update_difficulty_constraint.sql`
   - `00006_add_reservation_arrival.sql`
   - `00007_add_cashier_memberships_payments.sql`
   - `00008_add_app_settings.sql`
   - `00009_add_products.sql`
   - `00010_add_login_image_settings.sql`
   - `00011_add_apk_download_url.sql`
   - `00012_allow_admin_create_reservations.sql`
   - `00013_staff_reservations_checkin.sql`
   - `00014_prevent_reservation_conflicts.sql`
   - `00015_clean_legacy_cashier_role.sql`

---

## 5. Troubleshooting & Common Issues

### 1. `running scripts is disabled on this system` (PowerShell error)
- **Cause**: Windows PowerShell security policy blocks local npm scripts.
- **Fix**: Run PowerShell as Administrator and run:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  ```
  Or use standard Command Prompt (`cmd.exe`).

### 2. `⚠️ Supabase credentials not found`
- **Cause**: The `.env` file does not exist, is in the wrong directory, or is named `.env.txt`.
- **Fix**: Check that the file is in the root directory and named exactly `.env`. Restart the dev server with `npx expo start -c`.

### 3. "Could not connect to development server" / Timeout on phone
- **Cause**: PC and phone are on different Wi-Fi bands (e.g., 2.4GHz vs 5GHz) or router blocks peer-to-peer traffic.
- **Fix**:
  1. Ensure both devices are on the exact same Wi-Fi.
  2. Check Windows Firewall: allow Node.js through private networks.
  3. Run with tunnel mode:
     ```bash
     npx expo start --tunnel
     ```

### 4. Cache or Bundling Issues (White screen / stale assets)
- **Fix**: Clear Metro bundler cache by starting with the `-c` flag:
  ```bash
  npx expo start -c
  ```

### 5. Port 8081 already in use
- **Fix**: Run on a different port:
  ```bash
  npx expo start --port 8082
  ```

---

## 6. Quick Command Cheatsheet

| Task | Command |
| :--- | :--- |
| **Install packages** | `npm install` |
| **Start Expo server** | `npx expo start` |
| **Start with cache cleared** | `npx expo start -c` |
| **Start in tunnel mode (for remote/hotspot)** | `npx expo start --tunnel` |
| **Open directly in web browser** | `npm run web` |
| **Build web distribution** | `npm run build` |
