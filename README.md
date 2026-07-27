# PerFin OS

PerFin OS is a location-aware personal finance application for reviewing financial activity, understanding reports and insights, creating a plan, and confirming financial actions.

## Product workflow

`Activity → Reports → Insights → Plan → Confirmed actions`

## Technology

- Expo and React Native
- TypeScript
- Firebase
- Cloudflare Workers and R2
- Gemini-related functionality

## Prerequisites

- Node.js
- npm
- Expo tooling
- Xcode and CocoaPods for local iOS native builds
- Android Studio and an emulator or connected device for local Android native builds

## Install

```sh
npm ci
npm ci --prefix workers/perfin-api
```

## Run

```sh
npm start
npm run ios
npm run android
npm run web
```

## Verify

```sh
npm run typecheck:strict
npm --prefix workers/perfin-api run typecheck
npm run build
```

## Environment

Copy `.env.example` to a local `.env` file and provide the values required for the environment you are running. Do not commit secrets, signing material, Firebase service files, or production credentials.

The public template includes Firebase client configuration, the PerFin API URL, Google Maps configuration, optional native application identifiers and build versions, and server-side Cloudflare, R2, and Gemini variable names.

Native development, preview, and production builds use the profiles in `eas.json`. Firebase service files can be supplied through `GOOGLE_SERVICES_PLIST` and `GOOGLE_SERVICESES_JSON` file environment variables.

## Repository structure

- `src/`: application source
- `assets/`: application assets
- `workers/perfin-api/`: Cloudflare Worker source
- `firebase/`: Firebase configuration and rules
- `app.json` and `app.config.js`: Expo application configuration
- `eas.json`: EAS build and submission profiles

## Release status

This repository contains application and native build configuration. It does not claim that signed App Store or Google Play releases have been completed.
