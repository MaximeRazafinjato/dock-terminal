# Architecture backend (hôte C#)

L'hôte est une application C# .NET 10 avec une fenêtre WinUI 3 (Windows App SDK, non empaquetée) qui héberge une seule WebView2. Il ne porte aucune interface métier : il gère la fenêtre, les terminaux, la persistance et les services locaux. L'interface entière est dans `web/`.

## Projets

| Projet | Rôle |
| --- | --- |
| `src/Dock.Core` | Bibliothèque sans interface, testable : pseudo-consoles, Job Objects, intégration shell, modèle et persistance de session. Aucune dépendance WinUI. |
| `src/Dock.Host` | Fenêtre WinUI 3, WebView2, pont hôte / web. Contient le moins de logique possible. |
| `tests/Dock.Core.Tests` | Tests xUnit de `Dock.Core` (voir `docs/TESTING.md`). |

`Directory.Build.props` à la racine fixe `Nullable`, `ImplicitUsings`, la plateforme x64 et `win-x64`.

## Dock.Core

| Dossier | Contenu |
| --- | --- |
| `Native/` | Déclarations P/Invoke uniquement (`PseudoConsoleApi`, `ProcessApi`, `JobObjectApi`). Aucune logique. `PseudoConsoleApi` bascule entre la ConPTY de Windows et une `conpty.dll` OpenConsole posée à côté de l'exécutable. |
| `Terminal/` | `PseudoConsole` (pipes + handle ConPTY), `PtyProcess` (`CreateProcessW` avec l'attribut pseudo-console, `STARTF_USESTDHANDLES` à vide), `JobObject` (kill-on-close), `TerminalSession` (assemble les trois, thread de lecture, événements `OutputReceived`, `CurrentDirectoryChanged`, `Exited`), `TerminalManager` (une session par identifiant de pane). |
| `Shell/` | `ShellCatalog` (profils PowerShell 5.1 par défaut, PowerShell 7, CMD, Git Bash, disponibilité par présence du fichier ; les exécutables sont remplaçables par un `ShellPathsModel`), `ShellPathsRepository` (lit `%LOCALAPPDATA%\Dock\shells.json`, objet `{ id: chemin }` ; écrit un gabarit avec les chemins par défaut si le fichier manque ; fichier illisible ignoré), un shell introuvable échoue avec un message qui cite le chemin et le fichier de configuration, jamais de repli silencieux vers un autre shell, `PowerShellIntegration` (wrapper de prompt encodé en base64 passé par `-EncodedCommand`, émet `OSC 7`), `OscCwdParser` (automate qui extrait le dossier courant du flux de sortie). |
| `Context/` | `GitContext` (résout le contexte Git d'un dossier par lecture de fichiers, sans lancer `git` : remonte jusqu'à `.git`, suit un fichier `.git` de worktree via `gitdir:`, lit `HEAD` → branche, HEAD détachée ou aucun dépôt), `LocalActions` (ouvre un dossier dans l'explorateur ou l'éditeur avec `ProcessStartInfo.ArgumentList`, jamais par concaténation de chaîne ; dossier absent → erreur en français), `EditorSettingsRepository` (`%LOCALAPPDATA%\Dock\editor.json`, `{ "command": "code.cmd" }` par défaut, gabarit écrit si absent), `PathFallback` (ancêtre existant le plus proche d'un chemin disparu, sinon le dossier utilisateur). |
| `Projects/` | `ProjectCatalog` : liste les dossiers de premier niveau de la racine des projets (`C:\Files\Projects` par défaut, hors `worktrees` et dossiers cachés, triés sans casse) ; racine absente ou inaccessible renvoyée avec un message en français et une liste vide, jamais d'exception vers le web. `ProjectsSettingsRepository` (`projects.json`, `{ "root": ... }`, gabarit écrit si absent). |
| `Settings/` | `SettingsModel` (vue d'ensemble des quatre fichiers de réglages : chemins des shells, commande d'éditeur, persistance, racine des projets), `SettingsService` (`Load` agrège les dépôts, `Validate` refuse un shell inconnu, un éditeur vide ou une racine vide / relative, `Save` normalise puis écrit les quatre fichiers, `Snapshot` renvoie pour l'écran d'administration les shells avec chemin par défaut, chemin configuré et disponibilité, les chemins des fichiers et des avertissements non bloquants : shell, éditeur absolu ou racine introuvables). Les fichiers restent éditables à la main : l'écran n'est qu'une autre façon d'écrire les mêmes fichiers. |
| `Session/` | Modèles `SessionModel`, `WorkspaceModel`, `TabModel`, `SplitNodeModel`, `PaneModel`, `ClosedTabModel` (onglet fermé restaurable : workspace d'origine, position, onglet et texte sérialisé par pane) ; `SessionValidator` (limites de profondeur, ratios, identifiants actifs, session sans workspace acceptée si `Active` est vide, liste des onglets fermés tronquée aux cinq plus récents, `Favorites` : identifiants de commandes de la palette, au plus 50, non vides, dédoublonnés) ; `SessionRepository` (lecture / écriture atomique de `%LOCALAPPDATA%\Dock\session.json` via un `.tmp` puis renommage, refus d'une session invalide ; un fichier illisible ou invalide est mis en quarantaine et signalé, jamais écrasé en silence) ; `PaneTextRepository` (`text.json`, texte sérialisé par pane des terminaux vivants, écrit à part de la disposition, écriture atomique, panes ignorés au-delà de la limite globale, fichier illisible mis en quarantaine) ; `PersistenceSettingsRepository` (`persistence.json` : `textIntervalSeconds` 30, `linesPerPane` 10 000, `maxTextMebibytes` 256, gabarit écrit si absent, valeurs bornées) ; `CorruptedFiles` (renomme un fichier fautif en `nom.corrompu-AAAAMMJJ-HHmmss.ext` et renvoie ce chemin) ; `AtomicFile` (écriture via `.tmp` puis renommage, utilisée par tous les dépôts) ; `SessionFactory` (session initiale, identifiants). |

Règles :

- L'hôte est la source de vérité de la session persistée : le web envoie la session complète, l'hôte la valide avant d'écrire. Chaque `session.save` ou `text.save` répond `session.saved`, ou `session.saveFailed {message}` (session refusée, disque ou droits) sans faire tomber la session en cours.
- Au démarrage, `app.hello` porte `recovery` quand `session.json` ou `text.json` a été mis en quarantaine ; la session de secours est alors la session initiale et le fichier fautif reste à côté pour récupération.
- Le texte restauré n'est qu'un affichage : les shells sont toujours relancés neufs, aucune commande n'est rejouée.
- `settings.save` valide, écrit les quatre fichiers puis applique immédiatement : nouveaux chemins de shells pour les prochains `terminal.create` (les shells déjà lancés ne bougent pas), nouvelle commande d'éditeur, nouvelle racine des projets, nouvelle limite d'historique. Un réglage refusé remonte en `error` sans rien écrire.
- Chaque pane est rattaché à un Job Object ; fermer un pane termine tout son arbre de processus.
- L'environnement transmis au shell ajoute `DOCK_TERMINAL=1`, `DOCK_PANE_ID` et `TERM_PROGRAM=DockTerminal`, et retire toute variable `WEZTERM_*`.
- Ne jamais réimplémenter `wtr` / `rmwt` : ils viennent du profil chargé par PowerShell.
- Contrat de synchronisation worktrees : l'hôte n'exécute aucun effet de `wtr` / `rmwt`. Après `wtr`, le prompt du pane émet OSC 7 avec le nouveau dossier (`terminal.cwd`), rien d'autre. Après `rmwt`, à chaque `terminal.cwd` reçu de n'importe quel pane, `TerminalManager.MissingDirectories` vérifie le dossier courant de toutes les sessions vivantes et l'hôte envoie `terminal.pathMissing {pane, path, fallback}` pour celles dont le dossier a disparu ; même message à `terminal.create` si le dossier demandé n'existe plus (le shell démarre alors dans le dossier utilisateur). Aucun pane ni workspace n'est fermé ou créé automatiquement.
- Un échec de `terminal.create` remonte en `error` avec le `pane` concerné ; le web affiche alors un état local au pane (relance, choix d'un autre shell, fermeture).

## Dock.Host

| Fichier | Rôle |
| --- | --- |
| `App.xaml.cs` | Fixe le dossier de données `%LOCALAPPDATA%\Dock` et le dossier utilisateur WebView2. |
| `MainWindow.xaml(.cs)` | Une `WebView2` plein écran, aucun `KeyboardAccelerator`. Désactive les raccourcis navigateur, mappe `https://dock.app/` sur `wwwroot/`, ou navigue vers `DOCK_WEB_DEV_URL` si la variable est définie (serveur Vite). À la fermeture par la fenêtre, annule une première fois (`Handled`) et laisse `HostBridge.RequestClose` envoyer `app.closing` au web ; la fermeture réelle vient de `window.close` renvoyé par le web (après sauvegarde du texte) ou d'un délai de garde de 3 s. |
| `Bridge/HostBridge.cs` | Reçoit les messages JSON du web (`WebMessageReceived`), route par `type`, renvoie par `PostWebMessageAsJson`. Regroupe la sortie des terminaux par pane et la vide sur le thread UI en une seule passe. |
| `Bridge/PaneOutputBuffer.cs` | Tampon par pane avec décodage UTF-8 incrémental et contre-pression (le thread de lecture s'arrête au-delà de 4 Mc non acquittés). |
| `Bridge/BridgeCommandModel.cs` | Forme des messages entrants. |
| `Bridge/PathPicker.cs` | Sélecteur natif de fichier (`.exe`, `.cmd`, `.bat`, tout) ou de dossier (`FileOpenPicker` / `FolderPicker` initialisés avec le handle de la fenêtre). Utilisé par l'écran Paramètres ; annulation = aucun message. |

## Contrat du pont

Web → hôte : `app.ready`, `session.save {session}`, `text.save {text: {paneId: texte}}`, `settings.get`, `settings.save {settings}`, `dialog.pick {field, target: file|folder}`, `terminal.create {pane, shell, cwd, cols, rows}`, `terminal.input {pane, data}`, `terminal.resize {pane, cols, rows}`, `terminal.ack {pane, chars}`, `terminal.close {pane}`, `projects.list`, `context.query {pane, path}`, `context.open {pane, path, target: editor|explorer}`, `window.close`.

Hôte → web : `app.hello {session, shells, home, text, persistence{textIntervalSeconds, linesPerPane}, recovery?}`, `app.closing`, `session.saved`, `session.saveFailed {message}`, `dialog.picked {field, path}`, `settings.result {settings, shellSettings[{id, name, defaultExecutable, configured, available}], files, warnings[], shells, persistence, saved}`, `terminal.created {pane, pid}`, `terminal.output {pane, data}`, `terminal.cwd {pane, path}`, `terminal.exit {pane, code}`, `terminal.pathMissing {pane, path, fallback}`, `projects.listed {root, projects[{name, path}], error?}`, `context.result {pane, path, git{isRepository, branch, detachedHead}}`, `error {pane?, message}`.

Les types TypeScript correspondants sont dans `web/src/bridge/messages.ts` ; toute évolution se fait des deux côtés dans le même commit.

## Construction

- `dotnet build Dock.slnx` construit tout. La cible `BuildWeb` de `Dock.Host.csproj` lance `pnpm install` et `pnpm build` si `web/dist/index.html` est absent ou en configuration Release, puis `CopyWebToOutput` copie `web/dist` dans `wwwroot/` du dossier de sortie.
- Publication autonome : `dotnet publish src/Dock.Host/Dock.Host.csproj -c Release -r win-x64 -p:Platform=x64 --self-contained -o publish`. `EnableMsixTooling` est requis pour que le `.pri` soit publié.
- Développement web à chaud : `pnpm dev` dans `web/`, puis lancer l'hôte avec `DOCK_WEB_DEV_URL=http://localhost:5173`.

## Conventions

- Messages d'erreur en français, suffixe `Model` pour les classes de données, suffixe `Async` pour les méthodes asynchrones, aucun commentaire dans le code, fichiers de moins de 400 lignes.
- Les erreurs attendues du pont remontent en `error` au web ; les exceptions inattendues ne doivent pas faire tomber l'hôte.
