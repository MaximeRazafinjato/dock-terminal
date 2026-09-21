# Tests backend (xUnit)

Projet : `tests/Dock.Core.Tests`. Lancer avec `dotnet test Dock.slnx`.

## Organisation

Un dossier par espace de noms testé (`Session/`, `Shell/`, `Terminal/`), une classe par type testé, suffixe `Tests`.

Nommage des méthodes : `Méthode_QuandCondition_AlorsRésultat` en anglais technique (`Validate_WhenActivePaneUnknown_ThenFails`). Structure Given / When / Then séparée par des lignes vides, une assertion principale par test.

## Catégories

| Catégorie | Exemple | Contrainte |
| --- | --- | --- |
| Unitaires purs | `SessionValidatorTests`, `OscCwdParserTests` | Aucune E/S, exécution instantanée. |
| Persistance | `SessionRepositoryTests` | Dossier temporaire unique par test, supprimé dans `Dispose`. |
| Intégration terminal | `TerminalManagerTests` | Lance un vrai Windows PowerShell 5.1 avec le profil de la machine ; délai maximal de 30 s ; vérifie la variable `DOCK_PANE_ID`, le dossier courant et la mort des processus enfants. |

Les tests d'intégration dépendent de la machine (profil PowerShell, oh-my-posh). Ils restent dans le même projet pour être lancés à chaque `dotnet test`, mais un échec doit être lu à la lumière de l'environnement avant de conclure à une régression.

## Règles

- Messages d'assertion et messages d'erreur attendus en français, comme le code.
- Ne jamais lancer `wtr` / `rmwt` réels dans un test : ils créent des worktrees et des bases de données.
- Aucun test ne doit laisser de processus vivant ; utiliser `TerminalManager.Stop` ou `Dispose`.
