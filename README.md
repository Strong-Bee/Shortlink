# 🚀 Shortlink

Database-less shortlink generator built with Next.js, TypeScript, browser APIs, Telegram reporting, and Playwright testing.

## Features

- Shortlink generation without a database.
- Encoded destination and automatic redirect.
- Permission-controlled geolocation and camera access.
- GPS coordinates plus device-reported accuracy, altitude, heading, speed and timestamp when available.
- Browser-reported device, screen, viewport, CPU, RAM, GPU, language and timezone information.
- Battery and Network Information API when supported.
- Server-side client IP and Geo-IP enrichment.
- Zod validation for incoming telemetry.
- Telegram Bot API reporting.
- Sharp available for server-side image processing.
- Security dependencies available for Express-based deployments: Helmet, CORS and express-rate-limit.
- Pino logging dependencies available for server/Express deployments.
- Playwright-based Chromium testing.
- No cookie, localStorage, clipboard, credential or authentication-token collection.

## Stack

- Next.js 16 / React 19
- TypeScript
- Tailwind CSS
- Axios
- Zod
- Sharp
- Express
- Helmet
- CORS
- express-rate-limit
- Pino / pino-http
- Playwright

## Installation

```bash
git clone https://github.com/Strong-Bee/Shortlink.git
cd Shortlink
npm install
npx playwright install chromium
```

If dependencies were changed and the lockfile is stale, run `npm install` to regenerate `package-lock.json`.

## Environment

Create `.env.local`:

```env
TELEGRAM_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

Never commit bot tokens or other secrets.

## Testing

```bash
npm test
npm run test:headed
npm run test:ui
npm run test:debug
```

Playwright is used for automated local testing. Its geolocation and permission controls are test fixtures; production browsers continue to enforce their normal permission model.

## Data accuracy

GPS is sourced from the browser Geolocation API and includes the accuracy reported by the device. Geo-IP is a separate network-level estimate and must not be represented as GPS.

RAM, GPU, connection information and some platform details are browser-exposed values and may be reduced or unavailable because of browser privacy controls. The application reports unavailable values rather than inventing them.

Camera information is taken from MediaStream track settings after permission is granted.

## Security and privacy

- Telegram credentials stay server-side.
- Incoming telemetry is validated with Zod.
- Use HTTPS in production for browser permission APIs.
- Do not collect cookies, localStorage, clipboard contents, credentials or authentication tokens.
- Use this project only with authorization and informed permission for requested browser capabilities.

Developed by Strong-Bee.
