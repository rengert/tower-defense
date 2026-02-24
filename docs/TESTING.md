# Testkonzept (Hello World MVP)

## Ziel
Sicherstellen, dass die App auch in frühen Projektphasen reproduzierbar startet und zentrale Texte/Konstanten korrekt gesetzt sind.

## Testarten
1. **Unit-Tests (headless):**
   - Validieren Kernkonstanten (`AppConstants`) und Basisannahmen.
2. **Smoke-Test (manuell im Editor):**
   - Startszene lädt.
   - Hello-World-Text und Version sind sichtbar.
   - Button ist touch-freundlich groß.

## Ausführung lokal
Voraussetzung: Godot 4.2+ im PATH (Befehl `godot`).

```bash
godot --headless --path . --script res://tests/run_tests.gd
```

## CI-Anforderung
Der gleiche headless-Test wird in der Pipeline ausgeführt und blockiert Deployments bei Fehlschlägen.
