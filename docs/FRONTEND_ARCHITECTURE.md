# Architecture frontend (web/)

Application React 19 + TypeScript construite par Vite, stylée avec Tailwind 4, état géré par Zustand. Elle tourne dans la WebView2 unique de l'hôte et porte toute l'interface : arborescence des workspaces, onglets, splits, terminaux xterm.js, Leader et palette.

## Structure

| Dossier | Rôle |
| --- | --- |
| `src/model/` | Modèle de session pur (types, fabriques, helpers d'arbre `panesOf`, `replaceNode`, `pruneNode`, sélecteurs `activeWorkspace`, `activeTab`, `activePane`). Aucune dépendance React ni DOM. |
| `src/store/` | Stores Zustand : `sessionStore` (session et toutes ses mutations), `hostStore` (connexion, shells, message de statut, état Leader), `uiStore` (état d'édition transitoire, comme le workspace ou l'onglet en cours de renommage, jamais persisté). |
| `src/bridge/` | `messages.ts` (types des messages, miroir du contrat C#), `bridge.ts` (envoi et abonnement via `window.chrome.webview`). |
| `src/terminal/` | `terminalRegistry` (une instance xterm.js par pane, conservée hors React pour survivre aux changements d'onglet ; renderer WebGL, repli canvas puis DOM ; acquittements de flux), `TerminalPane` (composant qui attache l'instance à son élément). |
| `src/keyboard/` | `shortcuts.ts` : enum `Command` et une seule fonction `runCommand`, déclenchée soit par le Leader Ctrl + Espace (5 s) puis lettre, soit par un raccourci direct Ctrl + Maj + lettre ou Alt + flèche (tableau en section 9 de la spec). Ctrl + P palette, Ctrl + Maj + C/V copier/coller, Ctrl + Maj + PageUp/PageDown (ou Leader puis PageUp/PageDown) déplace l'onglet actif, Alt + F4. Tout est intercepté dans xterm.js via `attachCustomKeyEventHandler`, jamais par l'hôte. |
| `src/components/` | Un composant par fichier : `AppShell`, `Header`, `WorkspaceTree`, `TabBar`, `SplitView` (récursif), `PaneView`, `InlineNameEditor` (renommage inline des workspaces et des onglets, ce dernier par double-clic dans `TabBar` : Entrée ou perte de focus valide, Échap annule ; le store ignore un nom vide et un onglet renommé passe en `manual`, ce qui fige son nom face aux changements de dossier), `SidebarResizer` (séparateur `role="separator"` : glisser à la souris ou flèches gauche/droite au clavier, largeur bornée par le store), `tabDrag.ts` (glisser-déposer des onglets par événements pointeur et `elementFromPoint` sur les attributs `data-drop-*`, car le drag & drop HTML5 n'est pas relayé par la WebView2 ; état transitoire dans `uiStore` ; `TabBar` et `WorkspaceTree` sont sources et cibles : déposer sur un onglet insère avant lui, sur un workspace ou la barre ajoute en fin ; les instances xterm.js suivent leurs panes sans être recréées), `ShellMenu` (menu `role="menu"` ouvert par clic droit, Maj + F10 ou touche Menu sur le « + » de la barre d’onglets ; liste les shells disponibles annoncés par l’hôte, flèches / Début / Fin, Entrée, Échap, Tab ou clic extérieur). |
| `src/index.css` | Import Tailwind, police de symboles Nerd Font embarquée, tokens de la direction Dock (`--color-dock-*`, `--font-mono`). |

## Flux

1. `App` envoie `app.ready` ; l'hôte répond `app.hello` avec la session persistée (ou initiale) et les shells disponibles.
2. `sessionStore.load` charge la session ; `SplitView` rend l'arbre de l'onglet actif ; chaque `TerminalPane` demande `terminal.create` à son premier attachement.
3. Toute mutation du store produit une nouvelle session (clonage structurel, jamais de mutation en place) ; `App` la sauvegarde après 500 ms de calme via `session.save` et détruit les terminaux dont le pane n'existe plus.
4. `terminal.cwd` met à jour `pane.path` ; `terminal.output` va directement à l'instance xterm.js sans passer par React.

## Règles

- Le modèle et le pont ne connaissent pas React. Les composants ne contiennent pas de logique métier : ils appellent les actions du store.
- Les handlers sont des fonctions nommées (`handleSelect`, `handleClose`), pas de lambdas inline avec logique dans le JSX.
- Enums TypeScript plutôt que types union pour les valeurs fermées (`SplitAxis`, `StatusLevel`, `Renderer`). `erasableSyntaxOnly` est désactivé pour cela.
- Couleurs via les tokens `dock-*` de `index.css`, jamais en dur dans les composants. Le thème xterm.js est centralisé dans `terminalRegistry`.
- Textes visibles en français.
- Fichiers de moins de 400 lignes, un composant exporté par fichier.

## Commandes

```
cd web
pnpm install
pnpm dev        # serveur Vite sur http://localhost:5173, à combiner avec DOCK_WEB_DEV_URL côté hôte
pnpm build      # tsc -b puis vite build vers web/dist
pnpm lint       # oxlint
```

Aucun test web pour l'instant (décision du 21 septembre 2026) ; le modèle est validé côté hôte par `SessionValidator` et ses tests xUnit.
