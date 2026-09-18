# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Nature du dépôt

Dock Terminal est un **projet de spécification et de prototypage**, pas encore une application. Le dépôt contient des documents Markdown/HTML, un POC HTML statique et des scripts Node de gestion du backlog. Il n'y a ni `package.json`, ni build, ni tests : tout se lit, s'ouvre dans un navigateur ou s'exécute avec `node`.

La cible produit est un terminal Windows organisé en **workspaces → onglets → panes** (splits imbriqués). La pile recommandée pour l'application finale (WinUI 3 + ConPTY + WebView2/xterm.js, C# .NET 10) doit d'abord être validée par le spike T01 ; ne pas commencer l'implémentation native sans ce préalable.

Tout le contenu est rédigé en **français**.

## Commandes

Les scripts s'exécutent depuis la **racine du dépôt** (chemins relatifs `backlog/...` codés en dur).

```bash
node backlog/create-manifest.js        # régénère backlog/issues.json, backlog/Fxx.md et BACKLOG.md (sans GitHub)
node backlog/publish.js                # crée/met à jour les issues GitHub via `gh`, réécrit published.json et BACKLOG.md
node backlog/render-specifications.js  # régénère specifications-terminal.html depuis specifications-terminal.md
start "" poc/index.html                # ouvrir le POC (aucun serveur requis)
```

`publish.js` nécessite le GitHub CLI authentifié sur `MaximeRazafinjato/dock-terminal`. Il est idempotent par préfixe de titre `[Fxx]`/`[Txx]`/`[Dxx]` et **écrase BACKLOG.md** avec les liens GitHub : lancer `create-manifest.js` puis `publish.js` pour rester cohérent, ne pas éditer BACKLOG.md à la main.

## Chaîne de production des documents

Chaque artefact a une **source unique** ; modifier la source, puis régénérer.

| Source de vérité | Généré | Par |
| --- | --- | --- |
| Tableau `tasks` dans `backlog/create-manifest.js` | `backlog/issues.json`, `backlog/F01..F21.md`, `T01.md`, `D01.md`, `BACKLOG.md` | `create-manifest.js` |
| `backlog/issues.json` + GitHub | `backlog/published.json`, `BACKLOG.md` (liens), corps des issues | `publish.js` |
| `specifications-terminal.md` | `specifications-terminal.html` | `render-specifications.js` |

Contraintes des scripts à connaître :

- `render-specifications.js` réutilise le `<head>` de l'ancien HTML et **exige exactement 19 sections `## `** dans le Markdown, sinon il lève une erreur. Ajouter une section implique de mettre à jour cette constante et le compteur affiché dans l'en-tête généré.
- Le Markdown des spécifications est parsé par un convertisseur maison minimal : titres `##`/`###`, tableaux `|`, listes `-`/`1.`, paragraphes, liens, `code` et `**gras**` uniquement. Éviter toute autre syntaxe Markdown.
- Chaque entrée `tasks` référence les **numéros de sections** de la spec et les **identifiants de recette `Rxx`** (section 17). Renuméroter une section de la spec impose de revoir ces références.

## Statut des exigences

La spécification distingue quatre statuts qu'il faut respecter dans toute rédaction : **Retenu** (décision utilisateur), **Convention proposée** (détail d'implémentation non validé), **À décider**, **Limite du POC**. Ne jamais promouvoir une convention du POC en exigence validée ; les décisions restantes sont consignées en sections 18 et 19 de la spec et dans `backlog/D01.md`.

Décisions déjà tranchées à ne pas rouvrir : Leader = Ctrl + Espace (délai 5 s), palette = Ctrl + P, shell par défaut = Windows PowerShell 5.1 (pour retrouver le profil existant, `pwsh` n'est pas supposé équivalent), agents suivis = Claude Code (`claude`) et Codex CLI (`codex`), projets = premier niveau de `C:\Files\Projects` hors `worktrees`, recherche dans les terminaux **hors périmètre**, F13 retirée.

## POC (`poc/`)

Fichier unique `poc/app.js` en vanilla JS, style très dense (une fonction par ligne). Points structurants :

- **Modèle de session** persisté en `localStorage` sous la clé `dock-green-poc-v1` : `{version, workspaces[], active, closed[], sidebar, sidebarCollapsed, panelStyle}`. Un onglet porte `tree`, un arbre binaire de splits `{axis:'x'|'y', ratio, a, b}` dont les feuilles sont `{pane}`. Le helper `panes(tree)` aplatit l'arbre ; `replaceNode`/`prune` le modifient.
- `validate()` vérifie intégralement toute session chargée ou importée avant mutation (limites de profondeur, ratios, tailles). Toute évolution du modèle doit y être répercutée.
- Rendu par `render()` complet à chaque `commit()` (= `render()` + `save()`), pas de framework.
- Les terminaux sont **simulés** (`execute()`), les projets sont fictifs et les actions natives affichent un message. Ne pas présenter une simulation du POC comme une fonctionnalité livrée.
- `panel-variants.css` et le sélecteur de style de panneau sont exploratoires ; la direction retenue est l'**arborescence** (`tree`).

`maquettes/` contient les cinq directions visuelles initiales ; la direction « Dock » (n° 5) a été retenue et développée dans `poc/`.

## Environnement local documenté

`docs/inspection-environnement.md` décrit le profil PowerShell de l'utilisateur, les fonctions worktree `wtr`/`rmwt`, le sélecteur WezTerm et les états d'agents existants. Ces fonctions ne doivent **pas** être réimplémentées dans Dock ; l'application doit les charger via le profil et suivre leurs effets. Ne pas simuler WezTerm avec de fausses variables d'environnement.
