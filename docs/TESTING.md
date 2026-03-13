# Testkonzept (Hello World MVP)

## Ziel
Sicherstellen, dass die App auch in frühen Projektphasen reproduzierbar startet und zentrale Konfigurationen korrekt gesetzt sind.

## Testarten
1. **Typ-Prüfung (TypeScript):**
   - `npx tsc --noEmit` validiert alle Typen zur Compile-Zeit.
2. **Smoke-Test (manuell auf Gerät/Emulator):**
   - App startet ohne Fehler.
   - Titel „Tower Defense" und Untertitel „Defend your base!" sind sichtbar.
   - Hintergrund erscheint dunkel (`#0a0a1a`).

## Ausführung lokal

```bash
npm install
npx tsc --noEmit   # TypeScript-Typen prüfen
npm start          # Expo Dev Server (Scan QR-Code mit Expo Go)
npm run android    # Android-Emulator
npm run ios        # iOS-Simulator (nur macOS)
```

## CI-Anforderung
Der TypeScript-Check (`npx tsc --noEmit`) wird in der Pipeline ausgeführt und blockiert Merges bei Fehlschlägen.
