# Tower Defense – Hello World (Godot)

Diese Version liefert ein lauffähiges Grundgerüst als mobile-first Hello-World-App in Godot.

## Projekt starten
1. Projekt in Godot 4.6 öffnen.
2. `main_menu.tscn` wird automatisch als Startszene geladen.

## GitHub Pages
- Landing Page liegt unter `pages/index.html`.
- Die eingebettete Browser-Version liegt unter `pages/game/index.html`.
- Deployment läuft automatisch über `.github/workflows/github-pages.yml` bei Push auf `main` und `develop` oder manuell via `workflow_dispatch`.
- Im Workflow wird vor dem Deploy ein frischer Godot-Web-Export erzeugt und nach `pages/game` geschrieben.

## Enthalten
- Basis-Projektkonfiguration für mobile Darstellung
- UI-Startszene mit Safe-Area-Abständen
- Web-Export-Preset (`export_presets.cfg`) für GitHub Pages
- Minimaler Test-Runner für Kernkonstanten

Weiterführende Details:
- `docs/PROJECT_STRUCTURE.md`
- `docs/TESTING.md`
- `docs/DEPLOYMENT.md`
