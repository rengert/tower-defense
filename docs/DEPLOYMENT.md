# Deployment-Prozess (iOS + Android)

## Branching
- `main`: produktionsnah, nur über PR.
- Feature-Branches: kleine, nachvollziehbare Änderungen.

## Pipeline-Stufen
1. **Validate**
   - Unit-Tests headless laufen.
2. **Build-Check**
   - Android-Export im CI (Debug/Release-Template je nach Secrets).
   - iOS-Export als Projekt-/Xcode-Artefakt zur Weiterverarbeitung.
3. **Release**
   - Tags (`v*`) triggern Release-Job.
   - Artefakte werden bereitgestellt (APK/AAB, iOS Export-Bundle).

## Manuelle Release-Checkliste
1. Start, Menü, Touch-Bedienung prüfen.
2. Performance-Baseline auf Mid-Range-Geräten prüfen.
3. Store-Metadaten, Privacy-Formulare und Berechtigungen abgleichen.
4. Signierte Builds in App Store Connect / Play Console hochladen.

## Hinweise
- Signaturdaten und Store-Credentials ausschließlich über CI-Secrets verwalten.
- Keine zusätzlichen Berechtigungen ohne Produkt- und Privacy-Freigabe einführen.
