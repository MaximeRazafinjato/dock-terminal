# Architecture frontend (web/)

Application React 19 + TypeScript construite par Vite, stylée avec Tailwind 4, état géré par Zustand. Elle tourne dans la WebView2 unique de l'hôte et porte toute l'interface : arborescence des workspaces, onglets, splits, terminaux xterm.js, Leader et palette.

## Structure

| Dossier | Rôle |
| --- | --- |
| `src/model/` | Modèle de session pur (types, fabriques, helpers d'arbre `panesOf`, `replaceNode`, `pruneNode`, sélecteurs `activeWorkspace`, `activeTab`, `activePane`). Aucune dépendance React ni DOM. |
| `src/store/` | Stores Zustand : `sessionStore` (session et toutes ses mutations), `hostStore` (connexion, shells, message de statut, état Leader). |
| `src/bridge/` | `messages.ts` (types des messages, miroir du contrat C#), `bridge.ts` (envoi et abonnement via `window.chrome.webview`). |
| `src/terminal/` | `terminalRegistry` (une instance xterm.js par pane, conservée hors React pour survivre aux changements d'onglet ; renderer WebGL, repli canvas puis DOM ; acquittements de flux), `TerminalPane` (composant qui attache l'instance à son élément). |
| `src/keyboard/` | `shortcuts.ts` : Leader Ctrl + Espace (5 s), Ctrl + P, Ctrl + Maj + C/V, Alt + F4. Tout est intercepté dans xterm.js via `attachCustomKeyEventHandler`, jamais par l'hôte. |
| `src/components/` | Un composant par fichier : `AppShell`, `Header`, `WorkspaceTree`, `TabBar`, `SplitView` (récursif), `PaneView`. |
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
