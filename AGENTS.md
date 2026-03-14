# AGENT Instructions – Tower Defense (React Native + Expo + PixiJS, iOS + Android)

## Ziel
Dieses Repository wird für ein Mobile-Spiel mit **React Native (Expo)** und **PixiJS** genutzt, das im **Apple App Store** und **Google Play Store** veröffentlicht werden soll.
Alle Änderungen sollen auf stabile Builds, Store-Compliance, Performance und Wartbarkeit einzahlen.

## Arbeitsprinzipien (Best Practices)
1. **Mobile-First denken**
   - Features immer unter Touch-Bedienung und kleinen Displays bewerten.
   - UI für unterschiedliche Aspect Ratios und Notches/Safe Areas auslegen.
2. **Store-Ready by Default**
   - Keine temporären Platzhalter in produktionsnahen Branches (Icons, Screenshots, Texte, Berechtigungen).
   - Änderungen sollen keine neuen Store-Risiken erzeugen (z. B. unnötige Permissions, unstabile Startsequenzen, unklare Datenschutzflüsse).
3. **Performance vor Komplexität**
   - Auf mobilen Geräten CPU/GPU/Battery schonen.
   - Keine unnötigen Re-Renders, ungebremsten Animation-Loops oder teuren Berechnungen im UI-Thread.
4. **Explizite Konfiguration statt impliziter Defaults**
   - Expo-, EAS-, Build- und Projekteinstellungen bewusst setzen und dokumentieren.
   - Kritische Projektparameter nicht „stillschweigend“ ändern.
5. **Kleine, nachvollziehbare Änderungen**
   - Diffs klein halten, Commit-Nachrichten klar formulieren, Auswirkungen benennen.

## React-Native-/Expo-/PixiJS-spezifische Richtlinien

### Projektstruktur
- Komponenten, Gameplay-Logik und Dokumentation klar nach Verantwortung trennen (z. B. `components/`, `assets/`, `docs/`).
- React-Native-UI und PixiJS-Gameplay-Schicht sauber entkoppeln; Menüs, HUD und Overlays nicht in die Renderlogik mischen.
- Globale Zustände sparsam halten; gemeinsame Services nur für echte App-weite Verantwortung einführen.

### TypeScript- und Komponenten-Qualität
- TypeScript-Typisierung konsequent nutzen (`type`, `interface`, Rückgabetypen, getypte Props/State-Werte).
- Funktionen kurz halten und auf eine Verantwortung fokussieren.
- Magic Numbers vermeiden; Konstanten zentral definieren.
- Props, Callbacks und klar definierte State-Übergänge gegenüber harter Objektverkettung bevorzugen.
- Hooks bewusst einsetzen; Seiteneffekte kapseln und Cleanup für Listener, Timer und Animationen sicherstellen.

### Gameplay & Laufzeit
- Zeitkritische Logik deterministisch halten (wichtig für Balancing und Reproduzierbarkeit).
- Objekt-Spawning begrenzen und wo möglich pooling-orientiert arbeiten.
- Kollisionen, Update-Ticks und Entity-Zustände in der PixiJS-Gameplay-Schicht konsistent und dokumentiert halten.
- React Native für Menüs, Navigation, HUD und native Plattformintegration nutzen; PixiJS für die eigentliche Gameplay-Darstellung schlank halten.
- `requestAnimationFrame`/Ticker nur gezielt einsetzen und bei pausierten oder nicht sichtbaren Screens stoppen.

## Mobile UX (iOS + Android)
- Touch-Ziele ausreichend groß halten; keine UI-Kernelemente am Displayrand ohne Safe-Area-Beachtung.
- Klare visuelle Zustände (pressed/disabled/cooldown) für Buttons und Skills.
- Lesbarkeit priorisieren: Kontrast, Schriftgröße, klare Informationshierarchie.
- Haptik/Audio dezent einsetzen und systemfreundlich konfigurieren.
- Portrait-Layout, Pause-Menü und Core-Loop mit Expo/React Native unter realistischen kleinen Displays mitdenken.

## Performance-Budget (Mindeststandard)
- Ziel: stabile Framerate auf Mid-Range-Geräten.
- Texturen/Sprites in passender Auflösung und speicherschonend bereitstellen.
- Draw Calls, Partikelanzahl, Overdraw und JavaScript-Arbeit pro Frame kontrollieren.
- Re-Renders minimieren; unnötige State-Änderungen und große Objektallokationen im Game-Loop vermeiden.
- Expo-Profiler, React DevTools und Performance-Messungen vor/nach relevanten Änderungen prüfen.

## Store-Compliance Checkliste

### iOS (App Store)
- Erforderliche Usage Descriptions für jede genutzte sensible API.
- App-Icon, Splash/Startup-Verhalten und Orientierungseinstellungen in Expo final halten.
- Keine irreführenden Metadaten oder nicht funktionierende externe Links.

### Android (Google Play)
- Nur notwendige Permissions deklarieren.
- Target/Min SDK sowie Expo-/React-Native-Versionen mit Store-Anforderungen aktuell halten.
- Play-Console-relevante Anforderungen beachten (z. B. 64-bit, Signierung, Richtlinienupdates).

### Datenschutz & Recht
- Datenflüsse dokumentieren (Analytics, Ads, Crash-Reports, Cloud-Saves).
- Nur SDKs einsetzen, die rechtlich/fachlich freigegeben sind.
- Store-Formulare (Data Safety / Privacy Nutrition Labels) mit Implementierung und Expo-Config synchron halten.

## QA & Release-Prozess
1. Änderungen lokal testen (mindestens relevante Kernpfade des Features).
2. Expo-/EAS-Builds für Android und iOS ohne neue Warnungen/Fehler validieren.
3. Regressionscheck: Start, Menü, Core Loop, Pause/Resume, Audio, Eingabe.
4. Release-Kandidaten auf echten Geräten prüfen (nicht nur Expo Go, Simulator oder Emulator).

## Definition of Done (DoD)
Eine Aufgabe ist erst fertig, wenn:
- Funktionalität implementiert und auf Mobilgeräten plausibel getestet wurde.
- Keine offensichtliche Verschlechterung bei Performance, UX oder Stabilität vorliegt.
- Relevante Doku/Kommentare aktualisiert wurden.
- Store-, Build- und Datenschutz-Auswirkungen berücksichtigt wurden.

## Commit- und PR-Standards
- Commit-Message: `<type>: <kurze aussagekräftige beschreibung>`
  - Beispiele: `docs: add mobile store best practices`, `fix: prevent ui overlap on safe area`
- PR-Beschreibung enthält:
  - Was geändert wurde
  - Warum es nötig ist
  - Risiken/Seiteneffekte
  - Testschritte und Ergebnis
