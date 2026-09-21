# Spike T01 — Pile Windows et pipeline de terminal

Prototype technique qui valide la pile retenue en section 15 de `specifications-terminal.md` : hôte C# .NET 10 avec une fenêtre WinUI 3 (Windows App SDK), une WebView2 unique portant toute l'interface avec xterm.js, ConPTY et Job Objects côté hôte. Issue GitHub : [#23](https://github.com/MaximeRazafinjato/dock-terminal/issues/23).

Ce dossier est un spike : il sert à répondre aux critères d'acceptation, pas à démarrer l'application produit.

## Structure

| Chemin | Rôle |
| --- | --- |
| `src/DockTerminal.Spike.Core` | Bibliothèque sans interface : P/Invoke ConPTY (Windows ou `conpty.dll` embarquée), création de processus avec pseudo-console, Job Object, session de terminal, intégration shell (OSC 7). |
| `src/DockTerminal.Spike.Host` | Application WinUI 3 non empaquetée. Une seule `WebView2`, aucun `KeyboardAccelerator`. Le pont hôte / web passe par `PostWebMessageAsJson`. |
| `src/DockTerminal.Spike.Host/wwwroot` | Interface web : deux panes xterm.js 5.5 (WebGL, repli canvas puis DOM), Leader, palette, journal de frappe, mesures. |
| `tests/DockTerminal.Spike.Harness` | Console qui rejoue les scénarios automatisables sur les deux ConPTY et imprime un tableau Markdown. |
| `installer/DockTerminalSpike.iss` | Script Inno Setup 6 : installeur par utilisateur, remplace la version précédente, détecte ou installe le runtime WebView2 Evergreen. |
| `scripts/build-installer.cmd` | Publication autonome win-x64 puis compilation de l'installeur. |
| `vendor/conpty/` | Emplacement attendu de `conpty.dll` et `OpenConsole.exe` (non versionnés). |

## Prérequis

- Windows 10 1809 ou plus récent, .NET SDK 10.0.4xx, runtime WebView2 Evergreen.
- Aucun modèle Visual Studio n'est nécessaire : les projets se construisent avec `dotnet build` (Windows App SDK 2.5.1, WinUI 2.3.9 en dépendance transitive).
- Pour la comparaison ConPTY : copier `conpty.dll` et `OpenConsole.exe` dans `vendor/conpty/`. Ils proviennent d'une release Windows Terminal ou du dossier `node-pty` de VS Code (`resources\app\node_modules.asar.unpacked\node-pty\build\Release\conpty\`). Version testée : OpenConsole 1.25.2603.03002.
- Pour l'installeur : Inno Setup 6 (`winget install JRSoftware.InnoSetup`).

## Commandes

```
cd spike
dotnet build DockTerminal.Spike.slnx
dotnet run --project tests\DockTerminal.Spike.Harness
dotnet run --project src\DockTerminal.Spike.Host
scripts\build-installer.cmd
```

Dans l'application : Ctrl + Espace puis `←`/`→`/`o` change de pane, `j` affiche le journal de frappe, `c` relance le pane, `x` le ferme, Ctrl + P ouvre la palette (bench, relance en ConPTY embarquée, liste des processus du Job Object), Ctrl + Maj + C/V copie et colle, Ctrl + C va au shell, Alt + F4 ferme la fenêtre.

## Résultats du harnais (18 septembre 2026, Windows 11 26200, PowerShell 5.1.26100.9444)

ConPTY intégrée à Windows :

| Scénario | Résultat | Détail |
| --- | --- | --- |
| Démarrage et première séquence OSC 7 | OK | premier prompt après 471 ms, dossier `C:\Users\<utilisateur>` |
| Profil chargé, oh-my-posh, variables Dock, sans WezTerm | OK | wtr/rmwt présents, oh-my-posh chargé, `DOCK_PANE_ID` transmis, `WEZTERM_EXECUTABLE` absent |
| Dossier courant après cd | OK | reçu après 103 ms |
| Dossier courant après une fonction qui change le dossier | OK | reçu après 86 ms |
| Redimensionnement ConPTY | OK | 100x40 vu par le shell, appel en 0,5 ms |
| Débit ConPTY soutenu | OK | 7,8 Mo lus en 0,73 s (10,7 Mo/s) |
| Job Object : aucun processus survivant | OK | 5 processus (powershell, cmd, 2 ping, conhost enfant) tous terminés après fermeture |

ConPTY embarquée (`conpty.dll` OpenConsole 1.25) :

| Scénario | Résultat | Détail |
| --- | --- | --- |
| Démarrage et première séquence OSC 7 | OK | premier prompt après 516 ms, 1 requête DA1 du terminal à laquelle il faut répondre |
| Profil, oh-my-posh, variables Dock, sans WezTerm | OK | identique |
| Dossier courant après cd / après fonction | OK | 111 ms / 71 ms |
| Redimensionnement ConPTY | OK | 100x40 vu par le shell, appel en 0,1 ms |
| Débit ConPTY soutenu | OK | 7,8 Mo lus en 0,64 s (12,3 Mo/s) |
| Job Object : aucun processus survivant | OK | 5 processus tous terminés |

## Résultats dans l'application

- Bench de 20 Mo lancé simultanément sur les deux panes via `PostWebMessageAsJson` : 22,75 Mo lus par pane, transmis en ~490 messages, rendus par xterm.js à 9,7 Mc/s et 8,8 Mc/s (18 Mc/s cumulés) sans perte ni retard visible ; le shell écrit ses 19,8 Mo en 2,1 s et 2,3 s. Le pont n'est pas le goulot : le débit est borné par ConPTY (10 à 12 Mo/s). Le canal dédié n'est donc pas nécessaire.
- Ctrl + Espace puis `o`/`h` change de pane, Ctrl + P ouvre la palette, Ctrl + C atteint le shell (`\x03` interrompt `ping -t`), Alt + F4 ferme la fenêtre. Après correction, aucune touche de chord ne fuit vers le shell.
- vim (Git for Windows) en plein écran, redimensionnement de la fenêtre de 1480x900 à 1100x700 puis retour : identique sur ConPTY Windows et OpenConsole, ligne d'état repositionnée, sortie normale restaurée après `:q!`.
- Accents, kanji et caractères de dessin oh-my-posh rendus avec le renderer WebGL. Le dossier courant s'affiche dans l'en-tête de chaque pane après chaque prompt.

## Critères d'acceptation

| Critère | Statut |
| --- | --- |
| Spike C# .NET 10 LTS, fenêtre WinUI 3, WebView2 unique, aucun KeyboardAccelerator | Vérifié |
| Deux panes, changement de pane, xterm.js WebGL avec repli canvas | Vérifié (WebGL actif ; repli canvas déclenché sur perte de contexte, non provoqué) |
| PowerShell 5.1 dans ConPTY avec le profil réel, entrée, sortie, redimensionnement, fermeture | Vérifié par le harnais et dans l'application |
| Unicode, couleurs, sélection, copier/coller, IME, clavier français | Unicode et couleurs vérifiés ; sélection, copier/coller, IME, AltGr et touches mortes restent à vérifier à la main (journal de frappe prévu pour cela) |
| Clavier de bout en bout : Leader, Ctrl + P, Ctrl + C, Alt + F4, clic puis frappe | Vérifié par frappe synthétisée ; à confirmer sur clavier physique |
| Dossier courant après cd et après une fonction, oh-my-posh chargé, sans variable WezTerm | Vérifié (`wtr` réel non exécuté : la fonction de test utilise le même mécanisme, le prompt après la commande) |
| Job Object par pane, aucun survivant | Vérifié |
| Pont hôte / WebView2 sur plusieurs Mo avec deux panes | Vérifié, PostWebMessage retenu |
| ConPTY Windows contre conpty.dll embarquée | Comparées : comportement équivalent, OpenConsole plus bavard (plus de trames) et exige une réponse DA1/DSR |
| Installeur autonome, WebView2 Evergreen détecté ou installé, Windows App SDK embarqué | Produit (67,7 Mo, publication autonome de 231 Mo), installé en silencieux par-dessus une version précédente, application lancée depuis l'installation, puis désinstallé ; machine vierge non testée |
| Versions minimales, mesures, limites, confirmation WinUI 3 | Documenté ci-dessous |

## Découvertes et limites

- `CreateProcessW` avec l'attribut pseudo-console doit poser `STARTF_USESTDHANDLES` avec des handles nuls, sinon le shell hérite des handles redirigés du processus hôte (symptôme : PowerShell écrit `#< CLIXML` et le prompt hors de la ConPTY).
- L'hôte retire toutes les variables `WEZTERM_*` de l'environnement transmis au shell : lancé depuis WezTerm, il les hériterait et le wrapper de prompt du profil s'activerait.
- L'intégration shell passe par `-NoExit -EncodedCommand` : le profil est chargé d'abord, puis le wrapper enveloppe le prompt oh-my-posh et émet `OSC 7` avec l'URI `file:///`. Aucun fichier n'est écrit et la politique d'exécution n'intervient pas.
- La `conpty.dll` OpenConsole 1.25 envoie une requête DA1 (`ESC [ c`) au démarrage et des requêtes de position de curseur ; sans réponse elle attend environ 3 s puis ralentit à 0,1 Mo/s. xterm.js répond nativement, un consommateur sans émulateur doit répondre lui-même.
- Dans xterm.js, un raccourci intercepté par `attachCustomKeyEventHandler` doit aussi appeler `preventDefault()`, sinon le caractère entre dans le `textarea` et repart vers le shell par l'événement `input`.
- Comparer `event.key` plutôt que `event.code` : les entrées synthétisées (SendInput sans scan code) n'ont pas de `code`.
- Alt + F4 est traité par la fenêtre WinUI avant d'atteindre la WebView2 ; le message `closeWindow` du web reste comme repli.
- Le focus clavier arrive à xterm.js après un clic ; le focus initial au lancement doit être confirmé au clavier physique.
- xterm.js 6 supprime l'addon canvas (repli DOM uniquement) ; le spike reste en 5.5 pour respecter le critère.
- Windows App SDK 2.5.1 se construit et se publie en autonome avec `WindowsAppSDKSelfContained` depuis la ligne de commande ; aucun repli WPF n'est nécessaire.
- Le dossier de données WebView2 est forcé dans `%LOCALAPPDATA%\DockTerminalSpike\WebView2` (variable `WEBVIEW2_USER_DATA_FOLDER`) : sans cela il est créé à côté de l'exécutable et survit à la désinstallation.
- Les glyphes Nerd Font du prompt oh-my-posh (dossier, branche) n'existent pas dans Cascadia Mono ; WezTerm les obtient par sa police intégrée « Symbols Nerd Font Mono ». Le spike embarque cette police dans `wwwroot/vendor/fonts` en dernier repli de la famille xterm.js, après « CaskaydiaCove Nerd Font Mono » si elle est installée, et attend son chargement avant d'ouvrir les terminaux.
- `dotnet publish` d'une application WinUI 3 non empaquetée omet le fichier `.pri` du projet (XAML compilé) tant que `EnableMsixTooling` n'est pas à `true` ; sans lui l'exécutable publié plante au démarrage dans `Microsoft.UI.Xaml.dll` (code 0xc000027b). Publier avec `-p:Platform=x64`.

## Versions minimales

- ConPTY et `ResizePseudoConsole` : Windows 10 1809 (build 17763). L'installeur impose `MinVersion=10.0.17763`.
- Windows App SDK 2.x et WebView2 Evergreen : Windows 10 1809 ou plus récent.
- Seule configuration testée : Windows 11 build 26200, WebView2 153, .NET 10.0.12. La couverture réelle de Windows 10 reste à vérifier sur une machine dédiée.

## Vérifications manuelles restantes

1. Sélection à la souris, Ctrl + Maj + C puis Ctrl + Maj + V, Ctrl + V, clic droit.
2. Clavier français physique : AltGr (`@`, `{`, `~`), touches mortes (`^` puis `e`, `¨` puis `u`), IME japonais ou emoji.
3. Frappe immédiate après un clic de souris sur l'autre pane, avec le journal de frappe ouvert (Leader + `j`).
4. `wtr` réel dans un dépôt jetable puis `rmwt`, en vérifiant l'en-tête du pane.
5. Installeur sur une machine vierge sans runtime WebView2.
