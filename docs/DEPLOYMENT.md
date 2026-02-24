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

## GitHub Pages (Web-Export)
1. Workflow **Deploy GitHub Pages** wird bei Push auf `main` und `develop` oder manuell gestartet.
2. CI exportiert das Godot-Projekt als HTML5-Build nach `pages/game`.
3. Anschließend wird der Inhalt von `pages/` als GitHub-Pages-Artefakt deployed.
4. Landing Page: `pages/index.html`, eingebettete Spielversion: `pages/game/index.html`.

## Hinweise
- Signaturdaten und Store-Credentials ausschließlich über CI-Secrets verwalten.
- Keine zusätzlichen Berechtigungen ohne Produkt- und Privacy-Freigabe einführen.
