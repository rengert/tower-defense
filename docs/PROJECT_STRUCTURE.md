# Ordnerstruktur (MVP)

```text
.
├── .github/workflows/          # CI/CD-Pipelines
├── docs/                       # Prozess- und Architektur-Dokumentation
├── assets/                     # Icons, Splash-Screen, Bilder
├── App.tsx                     # Haupt-App-Komponente (Startbildschirm)
├── index.ts                    # Einstiegspunkt (registerRootComponent)
├── app.json                    # Expo-Konfiguration (iOS, Android, Web)
├── tsconfig.json               # TypeScript-Konfiguration
├── package.json                # Abhängigkeiten und Scripts
└── README.md
```

## Strukturprinzipien
- Expo-Standard-Layout für React Native mit TypeScript.
- Mobile-relevante UI wird zentral in `App.tsx` gestartet.
- Assets (Icons, Splash) liegen unter `assets/` und werden von Expo automatisch verarbeitet.
