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

## Turmtypen (MVP)
1. **Pfeilturm (Single Target)**
   - Rolle: günstiger Allrounder gegen Standardgegner
   - Stärken: hohe Verfügbarkeit, solide Reichweite, verlässlicher Einzelziel-Schaden
   - Schwächen: skaliert schlechter gegen stark gepanzerte Ziele
2. **Kanonenturm (Splash/AoE)**
   - Rolle: Flächenschaden gegen Gruppen
   - Stärken: hoher Wert bei dichten Wellen, guter Wave-Clear
   - Schwächen: langsame Schussrate, ineffizient gegen schnelle Einzelziele
3. **Frostturm (Slow/Control)**
   - Rolle: Gegner verlangsamen und Pfadkontrolle erhöhen
   - Stärken: verlängert Time-to-Target, erhöht Effektivität anderer Türme
   - Schwächen: geringer Direktschaden
4. **Blitzturm (Burst/Chain)**
   - Rolle: kurzer Burst mit Ketteneffekt auf nahe Gegner
   - Stärken: stark gegen mittlere Gruppen und agile Ziele
   - Schwächen: hohe Upgrade-Kosten, begrenzte Grundreichweite
5. **Support-Turm (Buff/Debuff)**
   - Rolle: benachbarte Türme verstärken oder Gegner schwächen
   - Stärken: skaliert im Late-Game mit guter Platzierung
   - Schwächen: indirekter Schaden, positionsabhängig

## Upgrade-System je Turm
- Jeder Turm besitzt **3 Upgrade-Stufen (T1 → T3)** plus eine Spezialisierung ab T3.
- Standard-Upgrades erhöhen je nach Turm: Schaden, Reichweite, Schussrate, Effektstärke (z. B. Slow).
- Ab T3 wird pro Turm ein **Pfad gewählt** (ein Pfad pro Run):

### Beispielpfade pro Turm
- **Pfeilturm**
  - Pfad A „Scharfschütze“: mehr Reichweite + hoher Crit auf Einzelziele
  - Pfad B „Schnellfeuer“: deutlich höhere Angriffsgeschwindigkeit, geringerer Treffer-Schaden
- **Kanonenturm**
  - Pfad A „Belagerung“: größerer Explosionsradius, stärker gegen schwere Gegner
  - Pfad B „Splitterladung“: zusätzliche Splittertreffer, stärker gegen große Gruppen
- **Frostturm**
  - Pfad A „Permafrost“: stärkere Verlangsamung und längere Effektzeit
  - Pfad B „Eisscherben“: zusätzlicher periodischer Schaden auf verlangsamte Ziele
- **Blitzturm**
  - Pfad A „Überladung“: höherer Burst und mehr Kettensprünge
  - Pfad B „Leitnetz“: stabile DPS mit Chance auf kurzen Stun
- **Support-Turm**
  - Pfad A „Offensiv-Aura“: Buff für Schaden/Schussrate benachbarter Türme
  - Pfad B „Störfeld“: Debuff auf Gegner (Rüstungsbruch/Resistenzsenkung)

## Upgrade-Balancing (Leitplanken)
- Kosten skalieren nichtlinear, damit frühe Entscheidungen relevant bleiben.
- Utility-Türme (Frost/Support) dürfen DPS-Meta nicht dominieren, sondern Synergien schaffen.
- Jeder Turmtyp soll mindestens eine klare Einsatznische pro Map/Enemy-Set haben.

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
