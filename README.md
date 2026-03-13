# Tower Defense – Expo TypeScript (iOS & Android)

Ein mobil-optimiertes Tower-Defense-Spiel, entwickelt mit **Expo (React Native)** und **TypeScript** für iOS und Android.

## Voraussetzungen

- [Node.js](https://nodejs.org/) (LTS)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

```bash
npm install -g expo-cli
```

## Projekt starten

```bash
npm install
npm start        # Expo Dev Server starten
npm run android  # Android (Emulator oder Gerät)
npm run ios      # iOS (nur macOS mit Xcode)
npm run web      # Web-Vorschau im Browser
```

## Projektstruktur

```text
.
├── App.tsx              # Haupt-App-Komponente
├── index.ts             # Einstiegspunkt (registerRootComponent)
├── app.json             # Expo-Konfiguration (iOS, Android, Splash)
├── tsconfig.json        # TypeScript-Konfiguration
├── assets/              # Icons, Splash-Screen, Bilder
├── docs/                # Prozess- und Architektur-Dokumentation
└── package.json
```

## Plattform-Unterstützung

| Plattform | Status  |
|-----------|---------|
| iOS       | ✅      |
| Android   | ✅      |
| Web       | ✅      |

## Weiterführende Dokumentation

- `docs/PROJECT_STRUCTURE.md`
- `docs/TESTING.md`
- `docs/DEPLOYMENT.md`
