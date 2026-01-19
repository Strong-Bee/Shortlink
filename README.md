# 🚀 Shortlink Generator (Security Research Tool)

A modern, database-less shortlink generator built with **Next.js 16**, designed for **ethical penetration testing and security research**.
This tool generates shortlinks that collect device metadata, permission states, and contextual information, then reports the results directly to a Telegram Bot before redirecting the user to the intended destination.

---

## ✨ Key Features

- **Shortlink Generator**
  Generate custom shortlinks instantly without using a database.

- **Client-Side Data Collection**
  - 📸 **Front Camera Snapshot** (requires browser permission)
  - 🎯 **GPS Location** with Google Maps integration
  - 📱 **Device Information**: Model, OS, browser, RAM (DeviceMemory), and CPU cores
  - 🔋 **Battery Status**: Charging state and battery level

- **Permission & Capability Detection**
  Detects browser support and permission states for:
  - Notifications
  - Clipboard access
  - WebUSB / ADB (WebADB-compatible)
  - Bluetooth (Nearby Devices API)

- **Telegram Bot Reporting**
  - Structured reports sent instantly
  - Monospaced formatting for easy copy (IP, device, GPS, etc.)

- **Automatic Redirect**
  Users are redirected to the original target URL after data collection.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **HTTP Client**: [Axios](https://axios-http.com/)
- **Deployment**: [Vercel](https://vercel.com/) (Recommended for HTTPS & SSL)

---

## 📁 Project Structure

```text
├── app/
│   ├── api/snap/route.ts      # Backend: Telegram reporting & permission data
│   ├── link/page.tsx          # Frontend: Data collection & sensor handling
│   ├── page.tsx               # Admin: Shortlink generator interface
│   └── layout.tsx             # Global metadata & viewport configuration
├── public/                    # Static assets & icons
├── .env.local                 # Telegram bot credentials
└── package.json               # Dependencies & scripts
```

---

## 🚀 Installation & Deployment

### 1. Clone & Install

```bash
git clone https://github.com/Strong-Bee/Shortlink.git
cd Shortlink
npm install
```

### 2. Environment Configuration

Create a `.env.local` file and add your Telegram credentials:

```env
TELEGRAM_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 3. Deploy to Vercel

1. Push the project to GitHub
2. Import the repository into Vercel
3. Add the environment variables in the Vercel dashboard
4. Deploy

---

## 🛡️ Disclaimer

This project is intended **only for educational purposes, ethical hacking, and authorized security testing**.
Using this tool against individuals or systems without **explicit permission** is illegal and unethical.

The developer assumes **no responsibility** for misuse or damage caused by this software.

---

Developed by **Strong-Bee**
GitHub: [https://github.com/Strong-Bee](https://github.com/Strong-Bee)
