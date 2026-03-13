# Deployment-Prozess (iOS + Android)

## Branching
- `main`: produktionsnah, nur über PR.
- Feature-Branches: kleine, nachvollziehbare Änderungen.

## Pipeline-Stufen
1. **Validate**
   - TypeScript-Kompilierung (`npx tsc --noEmit`).
2. **Build-Check**
   - Android-Build via `eas build --platform android`.
   - iOS-Build via `eas build --platform ios`.
3. **Release**
   - Tags (`v*`) triggern Release-Job.
   - Artefakte: APK/AAB (Android) und IPA (iOS) via EAS Build.

## Manuelle Release-Checkliste
1. `npm start` starten und auf Emulator/Gerät prüfen.
2. Touch-Bedienung und Orientierung testen.
3. Performance-Baseline auf Mid-Range-Geräten prüfen.
4. Store-Metadaten, Privacy-Formulare und Berechtigungen abgleichen.
5. Signierten Build in App Store Connect / Play Console hochladen.

## EAS Build Setup

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform all
```

## Hinweise
- Bundle-ID (iOS): `com.rengert.towerdefense`
- Package (Android): `com.rengert.towerdefense`
- Signaturdaten und Store-Credentials ausschließlich über CI-Secrets verwalten.
- Keine zusätzlichen Permissions ohne Produkt- und Privacy-Freigabe einführen.
