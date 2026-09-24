# Dock Terminal

Projet de terminal Windows organisé en **workspaces → onglets → panes**, avec une interface Dock verte et un panneau en arborescence.

## État du projet

Les spécifications et le prototype HTML sont disponibles. **Le POC simule les terminaux.** La pile technique a été validée par le spike T01 (`spike/`). Le socle de l’application est en place : hôte C# .NET 10 (WinUI 3 + WebView2 unique) dans `src/`, interface React + TypeScript dans `web/`, tests dans `tests/`. Il ouvre de vrais terminaux PowerShell 5.1 avec le profil, persiste la session et gère les splits ; les fonctionnalités du backlog restent à implémenter.

```
dotnet build Dock.slnx
dotnet test Dock.slnx
dotnet run --project src/Dock.Host
scripts/build-installer.cmd          # installeur Windows (Inno Setup 6 requis) dans installer/output/
```

## Documents

- [Spécifications complètes](specifications-terminal.md)
- [Spécifications HTML imprimables](specifications-terminal.html)
- [Inspection de l’environnement local](docs/inspection-environnement.md)
- [POC retenu](poc/index.html) : télécharger/cloner le dépôt puis ouvrir ce fichier dans un navigateur.
- [Guide du POC](poc/README.md)
- [Maquettes exploratoires](maquettes/index.html)
- [Backlog fonctionnel](BACKLOG.md)
- [Spike T01 : pile Windows et pipeline de terminal](spike/README.md)
- [Architecture backend](docs/BACKEND_ARCHITECTURE.md), [architecture frontend](docs/FRONTEND_ARCHITECTURE.md), [tests](docs/TESTING.md)

## Direction retenue

- Interface compacte, terminaux sombres, accents verts et sélections par le fond.
- Workspaces libres, onglets déplaçables et splits redimensionnables.
- Édition inline, peu de popups, palette navigable au clavier via Ctrl + P.
- Clic gauche sur le « + » : PowerShell ; clic droit : choix du shell.
- Panneau repliable avec onglets dépliables par workspace.
- Restauration de la disposition et du texte, avec de nouveaux processus.
- Agents suivis : Claude Code (`claude`) et Codex CLI (`codex`).
- Sélecteur de projets basé sur `C:\Files\Projects` ; éditeur configuré : VS Code.

Les issues fonctionnelles décrivent l’application cible et leurs critères d’acceptation. La présence d’une simulation dans le POC ne signifie pas que la fonctionnalité native est terminée. Aucune priorité ni échéance n’est fixée pour l’instant.
