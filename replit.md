# Napless

A smart alarm clock mobile app that uses facial recognition and activity challenges to ensure you're truly awake before silencing the alarm.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- App: Expo (React Native) with Expo Router
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mobile/` — Expo mobile app
  - `app/(tabs)/index.tsx` — Entry redirect (setup vs home)
  - `app/setup.tsx` — Face registration onboarding
  - `app/home.tsx` — Main alarm management screen
  - `app/configure.tsx` — Alarm time + challenge picker
  - `app/ringing.tsx` — Fullscreen alarm ringing (can't dismiss without challenge)
  - `app/challenge.tsx` — Camera challenge verification screen
  - `app/emergency.tsx` — Emergency bypass with secret code
  - `contexts/FaceContext.tsx` — Face registration state + SecureStore
  - `contexts/AlarmContext.tsx` — Alarm state, scheduling, haptics
- `artifacts/api-server/` — Express backend (not used by mobile yet)
- `lib/api-spec/openapi.yaml` — API contracts source of truth

## Architecture decisions

- All data stays on-device: face token in `expo-secure-store`, alarm config in `AsyncStorage`
- Face "embedding" is a registration token (SecureStore) — production build would use `expo-face-detector` + ML landmark embeddings
- Alarm scheduling uses `expo-notifications` for background firing + `setInterval` for foreground detection
- Haptic pattern (expo-haptics) drives the alarm feedback in Expo Go; `expo-av` audio would be added in a native build
- Kiosk mode / system volume lock requires a native build (custom Android foreground service + `ACTION_MANAGE_OVERLAY_PERMISSION`) — documented as production feature, not in Expo Go prototype

## Product

- User registers their face once on first launch (selfie captured, token stored encrypted)
- User sets an alarm time and picks a wake-up challenge (brush teeth, squats, drink water, etc.)
- When alarm fires: fullscreen red pulsing screen with haptic vibration — cannot be dismissed
- To dismiss: take a selfie, pass face verification, complete challenge photo verification
- Emergency bypass: hidden long secret code for edge cases
- All image processing is in-memory only — nothing saved to gallery or cloud

## User preferences

- Language: Spanish (user requested in Spanish, app UI in English)
- Platform preference: Android native (Kotlin) for production — current build is Expo Go prototype
- ML stack preference: MediaPipe or TFLite for action detection in production

## Gotchas

- `expo-face-detector` requires a development build (not available in Expo Go) — face verification is simulated in prototype
- System volume control and kiosk mode require native Android modules — not in Expo Go
- `expo-notifications` in Expo Go has limited background execution — alarm may not fire if app is fully closed
- Scan QR code in Expo Go app on physical device for full native testing experience

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
