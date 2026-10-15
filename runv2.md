# 🌐 Quick Web Run Guide (`runv2.md`)

The simplest, fastest way to run this application **directly on your web browser** (`localhost:8081`) without needing Expo Go, mobile emulators, or phone setups.

---

## ⚡ 3-Minute Quickstart

### 1. Requirements (Only 1 thing needed!)
- **Node.js (v18 or v20 LTS)**: Download from [nodejs.org](https://nodejs.org/) if you don't already have it installed.

---

### 2. Step-by-Step Instructions

#### Step 1: Extract the Folder
If you received this project as a `.zip` from Google Drive:
- **Right-click the zip file** → **Extract All...**
- Open the extracted folder so you can see `package.json`.

---

#### Step 2: Open Terminal / Command Prompt
- In the folder's File Explorer address bar at the top, click it, type `cmd`, and press <kbd>Enter</kbd>.
- *(Or right-click inside the folder and choose **Open in Terminal**)*.

---

#### Step 3: Check Your `.env` File
Ensure you have a `.env` file in the project root containing your Supabase credentials:
- If `.env` is already present, you're good to go!
- If `.env` is missing, copy `.env.example` and rename it to `.env`:
  ```ini
  EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
  ```

---

#### Step 4: Install Dependencies (Run once)
In your terminal, run:
```bash
npm install
```
*(If you ever see a peer dependency conflict, run: `npm install --legacy-peer-deps`)*

---

#### Step 5: Start the Web App!
Run:
```bash
npm run web
```
*(or `npx expo start --web`)*

Your browser will automatically open:
### 🔗 **http://localhost:8081**

---

## 📱 Mobile Preview Tip in Browser
To view the app in standard mobile phone dimensions:
1. Open `http://localhost:8081` in **Google Chrome** or **Edge**.
2. Press <kbd>F12</kbd> (or right-click → **Inspect**).
3. Press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>M</kbd> (Mac: <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>M</kbd>) to toggle the **Device Toolbar**.
4. Select **iPhone 14 / Pixel 7** from the top dropdown for the best mobile experience!

---

## 🛠️ Quick Troubleshooting

| Problem | One-Line Fix |
| :--- | :--- |
| **Port 8081 is busy** | Run `npx expo start --web --port 8082` |
| **Blank screen or old cache** | Run `npx expo start -c --web` (clears cache) |
| **PowerShell script error on Windows** | Run `cmd.exe` instead of PowerShell, or run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` |
| **Supabase credentials warning** | Make sure `.env` is in the root folder and not saved as `.env.txt` |
