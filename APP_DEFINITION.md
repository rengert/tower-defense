# App-Definition – Tower Defense (iOS & Android)

## Arbeitstitel
**Tower Defense**

## Kurzbeschreibung
Ein mobil-optimiertes Tower-Defense-Spiel, in dem Spieler:innen durch taktisches Platzieren und Aufrüsten von Türmen gegnerische Wellen stoppen. Ziel ist es, strategische Tiefe mit kurzen, motivierenden Sessions für iOS- und Android-Geräte zu kombinieren.

## Grundkonzept
- **Core Loop:**
  1. Vorbereitung: Türme auswählen und platzieren
  2. Kampfphase: Gegnerwellen laufen definierte Pfade entlang
  3. Reaktion: Skills aktivieren, Upgrades ausführen, Ressourcen managen
  4. Abschluss: Belohnungen erhalten, nächste Welle/Map freischalten
- **Spielziel:** Basis verteidigen und möglichst viele Wellen überstehen.
- **Fail-State:** Gegner erreichen zu oft das Ziel bzw. Lebenspunkte der Basis fallen auf 0.

## Zielplattformen
- **Primär:** iOS (App Store), Android (Google Play)
- **Engine:** Godot
- **Steuerung:** Vollständig Touch-basiert

## Zielgruppe
- Spieler:innen, die strategische Spiele mit klarer Progression mögen
- Mobile-first Nutzer:innen mit Fokus auf Sessions zwischen 3 und 15 Minuten

## Gameplay-Säulen
1. **Taktische Platzierung**
   - Unterschiedliche Turmrollen (Single Target, Splash, Slow, Support)
2. **Sinnvolle Upgrades**
   - Entscheidungen zwischen kurzfristiger Stärke und langfristiger Skalierung
3. **Gegner-Vielfalt**
   - Gegner mit unterschiedlichen Resistenzen, Geschwindigkeiten und Fähigkeiten
4. **Skill-Einsatz im richtigen Moment**
   - Aktive Fähigkeiten mit Cooldowns für kritische Spielsituationen

## Progression
- Kartenfortschritt mit steigender Komplexität
- Freischaltbare Türme/Verbesserungen
- Meta-Fortschritt über wiederholte Runs (z. B. permanente Boni)

## UX- und Mobile-Anforderungen
- Große, gut erreichbare Touch-Ziele
- Saubere Lesbarkeit auf kleinen Displays
- Safe-Area-konforme UI für Notches und unterschiedliche Aspect Ratios
- Kurze Ladezeiten und stabile Performance auf Mid-Range-Geräten

## Nicht-Ziele (vorerst)
- Kein PvP im ersten Release
- Kein plattformübergreifender Multiplayer zum Start
- Keine übermäßige Komplexität in der ersten spielbaren Version
