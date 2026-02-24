# Ordnerstruktur (MVP)

```text
.
├── .github/workflows/          # CI/CD-Pipelines
├── docs/                       # Prozess- und Architektur-Dokumentation
├── scenes/
│   └── ui/                     # UI-Szenen (Start, HUD, Menüs)
├── scripts/
│   ├── core/                   # Globale Konstanten und Basislogik
│   └── ui/                     # UI-spezifische Logik
├── tests/
│   ├── run_tests.gd            # Headless Test-Runner
│   └── unit/                   # Unit-Tests
├── project.godot               # Godot-Projektkonfiguration
└── README.md
```

## Strukturprinzipien
- Feature-orientierte Trennung zwischen `scenes` und `scripts`.
- Mobile-relevante UI in `scenes/ui` gebündelt.
- Tests liegen separat unter `tests`, damit sie in CI headless ausführbar sind.
