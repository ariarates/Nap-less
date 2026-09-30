# Napless

A smart alarm clock mobile app that makes sure you're truly awake before letting you silence the alarm. It uses facial recognition and activity-based photo challenges — no dismissing with a half-asleep finger tap.

---

## How it works

1. **Register your face** — on first launch you take a selfie. Your face token is encrypted and stored only on your device. Nothing ever leaves it.
2. **Set an alarm** — pick a time, a wake-up challenge, and an alarm sound.
3. **Alarm fires** — a fullscreen red pulsing screen with haptic vibration locks the UI. You cannot swipe it away.
4. **To dismiss** — take a selfie to verify it's really you, then complete your chosen challenge photo (brush teeth, drink water, do squats, etc.).
5. **Emergency bypass** — a long secret code is available for genuine edge cases.

---

## Features

- Fullscreen alarm that cannot be dismissed without completing the challenge
- Face verification on every dismissal (simulated in Expo Go prototype; real ML in production build)
- 6 built-in wake-up challenges + custom challenge option
- Alarm sound picker — 4 built-in presets or any audio file from your device library
- Audio preview: tap a ringtone to hear it before selecting
- Haptic vibration pattern while alarm is ringing
- Dark navy UI, fully on-device — no accounts, no cloud

---

## Stack

| Layer | Technology |
|---|---|
| App | Expo (React Native) + Expo Router |
| Language | TypeScript |
| API | Express 5 |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod v4, drizzle-zod |
| Storage | `expo-secure-store` (face token), `AsyncStorage` (alarm config) |
| Audio | `expo-av` |
| Notifications | `expo-notifications` |
| Camera | `expo-camera` |
| Build tool | esbuild (API), Metro (app) |
| Monorepo | pnpm workspaces |

---

## Project structure

```
artifacts/
  mobile/               # Expo app
    app/
      (tabs)/index.tsx  # Entry — redirects to setup or home
      setup.tsx         # Face registration onboarding
      home.tsx          # Main screen: clock + alarm toggle
      configure.tsx     # Alarm time, sound, and challenge picker
      ringing.tsx       # Fullscreen alarm (cannot dismiss without challenge)
      challenge.tsx     # Camera challenge verification
      emergency.tsx     # Emergency bypass with secret code
    contexts/
      FaceContext.tsx   # Face registration state + SecureStore
      AlarmContext.tsx  # Alarm state, scheduling, sound, haptics
    components/
      RingtonePicker.tsx  # Modal for selecting alarm sound
    constants/
      colors.ts         # Design tokens (dark navy theme)

  api-server/           # Express backend (not yet used by the app)

lib/
  api-spec/             # OpenAPI contract + codegen config
  db/                   # Drizzle schema + migrations
```

---

## Running locally

**Requirements:** Node.js 24, pnpm, Expo Go app on an Android device.

```bash
# Install dependencies
pnpm install

# Start the mobile app
pnpm --filter @workspace/mobile run dev

# Start the API server
pnpm --filter @workspace/api-server run dev

# Typecheck everything
pnpm run typecheck
```

Scan the QR code shown in the terminal with **Expo Go** on your Android phone.

> The web preview (browser) only shows the visual layout. Audio playback, haptics, and camera require a real device running Expo Go.

---

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (required for API server) |
| `SESSION_SECRET` | Secret used for session signing |

---

## Android / Play Store

- Package name: `com.napless.app`
- Version code: `1`
- Target SDK: 35
- EAS build profiles configured in `eas.json` (development, preview, production)

To build a production APK/AAB:
```bash
eas build --platform android --profile production
```

---

## Known limitations (Expo Go prototype)

| Feature | Prototype | Production build |
|---|---|---|
| Face verification | Simulated (always passes) | `expo-face-detector` + ML landmarks |
| Alarm sound | Plays via `expo-av` | `expo-av` or native audio |
| Kiosk / can't exit | Not enforced | Android foreground service |
| System volume lock | Not enforced | Native Android module |
| Background alarm | Limited | `expo-notifications` + foreground service |
| Action detection | Not implemented | MediaPipe / TFLite |

---

## Architecture decisions

- **All data on-device** — face token in `expo-secure-store`, alarm config in `AsyncStorage`. No user accounts required.
- **Alarm scheduling** — `expo-notifications` fires the alarm when the app is in the background; a `setInterval` handles the foreground case.
- **Image processing in-memory only** — no photos are saved to the gallery or uploaded anywhere.
- **ML stack for production** — MediaPipe or TFLite for action detection on Android (user preference).
