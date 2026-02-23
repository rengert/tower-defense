# AGENT Instructions – Tower Defense (Godot, iOS + Android)

## Ziel
Dieses Repository wird für ein Godot-Spiel genutzt, das im **Apple App Store** und **Google Play Store** veröffentlicht werden soll. 
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
   - Keine unnötigen Echtzeit-Effekte oder ungebremste Prozesse in `_process`/`_physics_process`.
4. **Explizite Konfiguration statt impliziter Defaults**
   - Export-, Build- und Projekteinstellungen bewusst setzen und dokumentieren.
   - Kritische Projektparameter nicht „stillschweigend“ ändern.
5. **Kleine, nachvollziehbare Änderungen**
   - Diffs klein halten, Commit-Nachrichten klar formulieren, Auswirkungen benennen.

## Godot-spezifische Richtlinien

### Projektstruktur
- Szenen nach Feature gruppieren (z. B. `scenes/ui`, `scenes/gameplay`, `scenes/enemies`).
- Wiederverwendbare Logik in klar benannte Skripte auslagern.
- Autoloads sparsam einsetzen, nur für echte globale Zustände/Services.

### GDScript-Qualität
- Typisierung verwenden, wo sinnvoll (`: int`, `: float`, `: Node`, etc.).
- Funktionen kurz halten und auf eine Verantwortung fokussieren.
- Magic Numbers vermeiden; Konstanten zentral definieren.
- Signale bevorzugen statt harter Objektverkettung.

### Gameplay & Laufzeit
- Zeitkritische Logik deterministisch halten (wichtig für Balancing und Reproduzierbarkeit).
- Objekt-Spawning begrenzen und wo möglich pooling-orientiert arbeiten.
- Kollisionen/Layers/Masks konsistent und dokumentiert verwenden.

## Mobile UX (iOS + Android)
- Touch-Ziele ausreichend groß halten; keine UI-Kernelemente am Displayrand ohne Safe-Area-Beachtung.
- Klare visuelle Zustände (pressed/disabled/cooldown) für Buttons und Skills.
- Lesbarkeit priorisieren: Kontrast, Schriftgröße, klare Informationshierarchie.
- Haptik/Audio dezent einsetzen und systemfreundlich konfigurieren.

## Performance-Budget (Mindeststandard)
- Ziel: stabile Framerate auf Mid-Range-Geräten.
- Texturen in passender Auflösung und Kompression importieren.
- Draw Calls, Partikelanzahl und Shader-Komplexität kontrollieren.
- Profiler vor/nach relevanten Änderungen prüfen.

## Store-Compliance Checkliste

### iOS (App Store)
- Erforderliche Usage Descriptions für jede genutzte sensible API.
- App-Icon, Launch/Startup-Verhalten und Orientierungseinstellungen final.
- Keine irreführenden Metadaten oder nicht funktionierende externe Links.

### Android (Google Play)
- Nur notwendige Permissions deklarieren.
- Target/Min SDK mit Store-Anforderungen aktuell halten.
- Play-Console-relevante Anforderungen beachten (z. B. 64-bit, Signierung, Richtlinienupdates).

### Datenschutz & Recht
- Datenflüsse dokumentieren (Analytics, Ads, Crash-Reports, Cloud-Saves).
- Nur SDKs einsetzen, die rechtlich/fachlich freigegeben sind.
- Store-Formulare (Data Safety / Privacy Nutrition Labels) mit Implementierung synchron halten.

## QA & Release-Prozess
1. Änderungen lokal testen (mindestens relevante Kernpfade des Features).
2. Export für Android und iOS ohne neue Warnungen/Fehler validieren.
3. Regressionscheck: Start, Menü, Core Loop, Pause/Resume, Audio, Eingabe.
4. Release-Kandidaten auf echten Geräten prüfen (nicht nur Editor/Emulator).

## Definition of Done (DoD)
Eine Aufgabe ist erst fertig, wenn:
- Funktionalität implementiert und auf Mobilgeräten plausibel getestet wurde.
- Keine offensichtliche Verschlechterung bei Performance, UX oder Stabilität vorliegt.
- Relevante Doku/Kommentare aktualisiert wurden.
- Store- und Datenschutz-Auswirkungen berücksichtigt wurden.

## Commit- und PR-Standards
- Commit-Message: `<type>: <kurze aussagekräftige beschreibung>`
  - Beispiele: `docs: add mobile store best practices`, `fix: prevent ui overlap on safe area`
- PR-Beschreibung enthält:
  - Was geändert wurde
  - Warum es nötig ist
  - Risiken/Seiteneffekte
  - Testschritte und Ergebnis
