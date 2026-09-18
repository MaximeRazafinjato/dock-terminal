# Dock Terminal

Projet de terminal Windows organisé en **workspaces → onglets → panes**, avec une interface Dock verte et un panneau en arborescence.

## État du projet

Les spécifications et le prototype HTML sont disponibles. **Le POC simule les terminaux : il n’exécute pas PowerShell, CMD, Git Bash ou des agents réels.** La pile technique de l’application finale reste à choisir.

## Documents

- [Spécifications complètes](specifications-terminal.md)
- [Spécifications HTML imprimables](specifications-terminal.html)
- [Inspection de l’environnement local](docs/inspection-environnement.md)
- [POC retenu](poc/index.html) : télécharger/cloner le dépôt puis ouvrir ce fichier dans un navigateur.
- [Guide du POC](poc/README.md)
- [Maquettes exploratoires](maquettes/index.html)
- [Backlog fonctionnel](BACKLOG.md)

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
