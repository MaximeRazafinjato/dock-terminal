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
| `Session/` | Modèles `SessionModel`, `WorkspaceModel`, `TabModel`, `SplitNodeModel`, `PaneModel`, `ClosedTabModel` (onglet fermé restaurable : workspace d'origine, position, onglet et texte sérialisé par pane) ; `SessionValidator` (limites de profondeur, ratios, identifiants actifs, session sans workspace acceptée si `Active` est vide, liste des onglets fermés tronquée aux cinq plus récents, `Favorites` : identifiants de commandes de la palette, au plus 50, non vides, dédoublonnés) ; `SessionRepository` (lecture / écriture atomique de `%LOCALAPPDATA%\Dock\session.json`, refus d'une session invalide) ; `SessionFactory` (session initiale, identifiants). |

Règles :

- L'hôte est la source de vérité de la session persistée : le web envoie la session complète, l'hôte la valide avant d'écrire. Une session refusée renvoie une erreur en français au web.
- Chaque pane est rattaché à un Job Object ; fermer un pane termine tout son arbre de processus.
- L'environnement transmis au shell ajoute `DOCK_TERMINAL=1`, `DOCK_PANE_ID` et `TERM_PROGRAM=DockTerminal`, et retire toute variable `WEZTERM_*`.
- Ne jamais réimplémenter `wtr` / `rmwt` : ils viennent du profil chargé par PowerShell.
- Un échec de `terminal.create` remonte en `error` avec le `pane` concerné ; le web affiche alors un état local au pane (relance, choix d'un autre shell, fermeture).

## Dock.Host

| Fichier | Rôle |
| --- | --- |
| `App.xaml.cs` | Fixe le dossier de données `%LOCALAPPDATA%\Dock` et le dossier utilisateur WebView2. |
| `MainWindow.xaml(.cs)` | Une `WebView2` plein écran, aucun `KeyboardAccelerator`. Désactive les raccourcis navigateur, mappe `https://dock.app/` sur `wwwroot/`, ou navigue vers `DOCK_WEB_DEV_URL` si la variable est définie (serveur Vite). |
| `Bridge/HostBridge.cs` | Reçoit les messages JSON du web (`WebMessageReceived`), route par `type`, renvoie par `PostWebMessageAsJson`. Regroupe la sortie des terminaux par pane et la vide sur le thread UI en une seule passe. |
| `Bridge/PaneOutputBuffer.cs` | Tampon par pane avec décodage UTF-8 incrémental et contre-pression (le thread de lecture s'arrête au-delà de 4 Mc non acquittés). |
| `Bridge/BridgeCommandModel.cs` | Forme des messages entrants. |

## Contrat du pont

Web → hôte : `app.ready`, `session.save {session}`, `terminal.create {pane, shell, cwd, cols, rows}`, `terminal.input {pane, data}`, `terminal.resize {pane, cols, rows}`, `terminal.ack {pane, chars}`, `terminal.close {pane}`, `window.close`.

Hôte → web : `app.hello {session, shells, home}`, `terminal.created {pane, pid}`, `terminal.output {pane, data}`, `terminal.cwd {pane, path}`, `terminal.exit {pane, code}`, `error {pane?, message}`.

Les types TypeScript correspondants sont dans `web/src/bridge/messages.ts` ; toute évolution se fait des deux côtés dans le même commit.

## Construction

- `dotnet build Dock.slnx` construit tout. La cible `BuildWeb` de `Dock.Host.csproj` lance `pnpm install` et `pnpm build` si `web/dist/index.html` est absent ou en configuration Release, puis `CopyWebToOutput` copie `web/dist` dans `wwwroot/` du dossier de sortie.
- Publication autonome : `dotnet publish src/Dock.Host/Dock.Host.csproj -c Release -r win-x64 -p:Platform=x64 --self-contained -o publish`. `EnableMsixTooling` est requis pour que le `.pri` soit publié.
- Développement web à chaud : `pnpm dev` dans `web/`, puis lancer l'hôte avec `DOCK_WEB_DEV_URL=http://localhost:5173`.

## Conventions

- Messages d'erreur en français, suffixe `Model` pour les classes de données, suffixe `Async` pour les méthodes asynchrones, aucun commentaire dans le code, fichiers de moins de 400 lignes.
- Les erreurs attendues du pont remontent en `error` au web ; les exceptions inattendues ne doivent pas faire tomber l'hôte.
