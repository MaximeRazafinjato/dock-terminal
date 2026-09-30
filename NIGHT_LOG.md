# Journal de nuit : vue Agents (#118) et correction #121

Récap HTML : [file:///C:/Users/maxim/AppData/Local/Temp/claude/D--Projects-Perso-Projet-T-dock-terminal/75d23f39-c1a6-4519-b46e-394becf986f7/scratchpad/recap-nuit-vue-agents.html](file:///C:/Users/maxim/AppData/Local/Temp/claude/D--Projects-Perso-Projet-T-dock-terminal/75d23f39-c1a6-4519-b46e-394becf986f7/scratchpad/recap-nuit-vue-agents.html)

Branche `feature/vue-agents`, créée depuis `main` (73c55a9) le 30 septembre 2026 à 22 h 14.

## Plan

- [x] 0. #121 : recouper l’état des hooks avec le registre `~/.claude/sessions/<pid>.json` ; lien pane → `sessionId` → `cwd` → transcript
- [x] 1. Lot 1, « Voir » (R45)
  - [x] 1.1 Lecture incrémentale du transcript dans `Tily.Core` (titre, dernier message, action en cours, fichiers modifiés, contexte, PR) et tests
  - [x] 1.2 Message du pont et store
  - [x] 1.3 Bascule du panneau et liste groupée par urgence
  - [x] 1.4 Cartes, « Rejoindre », raccourcis, masquage des cartes d’attention
  - [x] 1.5 Vérification à l’écran (recette R45 déroulée)
- [x] 2. Essai du hook PermissionRequest (protocole du mandat) : concluant, le lot 2 répond par le hook
- [x] 3. Lot 2, « Répondre » (R46)
- [x] 4. Lot 3, « Lancer » (R47)
- [ ] 5. Lot 4, « Historique et reprise » (R48)
- [ ] 6. Finition : recettes R45 à R48, revue `code-review`, documentation, section 18 de la spec

## Itérations

### 30/09 22 h 14 à 22 h 40 : correction #121

- Lectures obligatoires faites (CLAUDE.md, architecture, tests, règles Git, spec sections 2, 4, 9, 12, 13, 17 et 18, issues #118 et #121, mémoire du projet).
- Registre vérifié sur Claude Code 2.1.286 : `~/.claude/sessions/<pid>.json` porte `pid`, `sessionId`, `cwd`, `procStart` (FILETIME du lancement du processus), `status` (`busy`, `shell`, `idle`, `waiting` d’après le binaire), `waitingFor` (`"permission prompt"` pendant un dialogue de permission), `updatedAt` et `statusUpdatedAt` (millisecondes Unix). Le PID est celui de `claude.exe`, présent dans le Job Object du pane.
- Dossier du transcript vérifié dans le binaire : `projects/<cwd dont tout caractère hors [a-zA-Z0-9] devient ->/<sessionId>.jsonl`, tronqué à 200 caractères suivis d’un hachage au-delà (Tily cherche alors le dossier par son préfixe).
- `Tily.Core` : `ClaudeSessionRegistry` (lecture tolérante, `pid` et `procStart` comparés au processus pour écarter un fichier périmé dont le PID aurait été réattribué, chemin du transcript), `ClaudeSessionModel`, `ActiveProcessModel` ; `TerminalSession.ActiveProcesses` et `PaneProbeModel.ProcessIds` ; `AgentStateModel.UpdatedAtUtc` (date d’écriture du fichier des hooks) ; `ClaudeCodeAdapter` recoupe : registre `idle` plus récent que l’état `working` ou `waiting` des hooks → « Terminé », message « Interrompu. », `interrupted: true`, sans détail. `PaneAgentModel` porte `sessionId` (envoyé au web) et, côté hôte seulement, le dossier de la session et le chemin du transcript.
- Web : `interrupted` dans `PaneAgent` ; `attentionNotifier` n’envoie pas de notification de fin pour un agent interrompu.
- Tests : `ClaudeSessionRegistryTests` (10), `ClaudeCodeAdapterTests` (8), un test de bout en bout dans `AgentMonitorTests`.
- Vérifié en réel sur l’instance de dev (`TILY_DATA_DIR` du scratchpad, `claude --model haiku --permission-mode default` dans un dossier jetable) : Échap sur un dialogue de permission, puis Échap pendant une réponse → l’agent passe à « Terminé » (« Interrompu. ») en moins de 2 s, alors que le fichier des hooks dit toujours `waiting` puis `working`.
- Vérifications : `pnpm lint`, `pnpm build`, `dotnet build`, `dotnet test` (489 tests verts).
- Commit `8f6e5f1`, poussé ; PR brouillon https://github.com/MaximeRazafinjato/tily/pull/123 (`Closes #121`).

### 30/09 22 h 40 à 23 h 10 : lot 1, « Voir »

- À la demande de l’utilisateur (réveil toutes les 5 s), les étapes s’enchaînent désormais dans le même tour ; le réveil de la boucle ne peut pas descendre sous 60 s et ne sert plus que de secours.
- Transcript analysé sur 2.1.286 : les métadonnées (`custom-title`, `agent-name`, `ai-title`, `last-prompt`, `pr-link`) sont réécrites régulièrement ; un résultat d’Edit ou de Write porte `structuredPatch`, un Write de création `type: "create"` et `content`, un résultat de Bash peut porter `bashEditDiff` (fichiers modifiés par la commande) ; un refus donne un `tool_result` puis `[Request interrupted by user for tool use]` ; les commandes (`/clear`, `/exit`) sont des messages utilisateur balisés `<command-name>`.
- Fenêtres de contexte vérifiées avec le skill `claude-api` : 1 M pour Fable 5, Opus 4.6 et suivants, Sonnet 4.6 et suivants ; 200 000 pour Haiku 4.5 ; les autres modèles restent sans pourcentage.
- `Tily.Core` : `TranscriptReader` (lecture complète au premier passage, 64 derniers Mo au plus, puis ajouts seuls), `TranscriptAccumulator`, `TranscriptSummaryModel`, `ModelContextWindows`, `AgentBoard` (cartes groupées et triées, `since`, ligne de résumé), `AgentCardModel`. Hôte : `agent.board` envoyé par `AgentStateFeed` quand il change, ordre du panneau tiré de la session (`UseLayout`), renvoi à `app.ready` (`Resend`). Session : `sidebarView` (`agents` ou absente), validée par `SessionValidator`.
- Web : `LeftPanel` (onglets Workspaces / Agents avec le nombre d’attentes), `AgentsView`, `AgentCardView`, `AgentCardDetails`, `AgentMarkdown` chargé à la demande (rendu `marked` + DOMPurify de l’aperçu, en version compacte) ; `agentsView.ts` ; commande `ToggleAgents` (Leader puis I, Ctrl + Maj + I, palette « Afficher les agents ») ; « Aller au panneau des workspaces » et le glisser d’un onglet sur le panneau affichent d’abord la vue Workspaces ; cartes d’attention masquées tant que la vue Agents est affichée.
- Tests : `TranscriptReaderTests` (14), `AgentBoardTests` (10), deux tests de `SessionValidatorTests`.
- Recette R45 déroulée sur l’instance de dev : trois `claude --model haiku` dans deux workspaces, une permission Bash, une question AskUserQuestion, un long poème. Vue Agents : « En attente » (la permission, la plus ancienne, puis la question), « En cours » (le poème, pane actif, carte dépliée) ; Entrée sur une carte rejoint le bon pane, y compris dans l’autre workspace, sans quitter la vue ; Ctrl + Maj + I revient à la vue Workspaces ; cartes d’attention masquées dans la vue Agents ; Échap sur le poème → « Terminé », « Interrompu. ». Une session précédente a aussi montré le dernier message rendu en Markdown, `notes.md +3 −0` et « Contexte : 19 % (38 967 jetons) », identique au `Ctx: 39.0k` de Claude Code.
- Constat pour le lot 2 : sur 2.1.286, le hook PermissionRequest se déclenche aussi pour AskUserQuestion (le script installé écrit alors « Autorisation demandée : AskUserQuestion »).
- Vérifications : `pnpm lint`, `pnpm build`, `dotnet build`, `dotnet test` (515 tests verts).
- Commits `190f970` (transcript et pont), `4a533e6` (vue), poussés.

### 30/09 23 h 05 à 23 h 15 : essai du hook PermissionRequest

Protocole du mandat : un hook d’essai du scratchpad copie son entrée dans un journal puis attend au plus 120 s un fichier `decision.json` ; `claude --model haiku --permission-mode default --settings essai-settings.json` (`timeout` 180) dans un pane de l’instance de dev, dossier jetable. Claude Code 2.1.286.

| Cas | Résultat |
| --- | --- |
| A. Réponse « 1 » dans le terminal pendant que le hook attend | Le dialogue répond, la commande s’exécute, Claude termine son tour. Le hook n’est pas arrêté : il continue d’attendre jusqu’à son délai. Une décision `deny` rendue ensuite est ignorée, sans effet visible. |
| B. `decision.json` en `allow` | Le dialogue disparaît, la commande s’exécute. |
| C. `deny` avec `message` | La commande n’est pas exécutée ; Claude reçoit « Error: <message> » et « Denied by PermissionRequest hook », poursuit son tour en tenant compte de la raison (il écrit dans le fichier proposé). Accents abîmés : la sortie de `[Console]::Out` de PowerShell 5.1 n’est pas en UTF-8, il faut écrire des octets UTF-8 ou un JSON échappé. |
| D. `updatedPermissions` tiré de `permission_suggestions` | Appliqué selon la destination : `session` en mémoire (rien sur disque), `localSettings` dans `.claude/settings.local.json` du projet (`permissions.allow: ["Bash(ping -n 1 127.0.0.1)"]` pour `addRules`, `additionalDirectories` pour `addDirectories`) ; la même commande passe ensuite sans demande. Les suggestions diffèrent du dialogue : « ping * » dans le dialogue, commande exacte dans la suggestion ; pour une écriture par redirection, la suggestion est `addDirectories` en `session`, qui n’évite pas la demande suivante. |
| E. AskUserQuestion avec `updatedInput` `{questions, answers}` et `allow` | Le hook se déclenche pour la question (dialogue affiché) ; la réponse est prise (« → Vert », « Allowed by PermissionRequest hook »). |

Conséquences pour le lot 2 : réponses par le hook (le dialogue reste utilisable, la première réponse l’emporte) ; le hook doit s’arrêter de lui-même quand la demande est réglée dans le terminal (sinon il traîne jusqu’à son délai) ; sortie en JSON échappé ; « Toujours » envoie la suggestion telle quelle, dont la destination décide où la règle est gardée. Point 16 de la section 18 de la spec et mémoire `claude-code-integration-facts.md` mis à jour.

### 30/09 23 h 15 à 23 h 35 : lot 2, « Répondre »

- Script des hooks (`tily-agent-state.ps1`) : pour PermissionRequest, écrit la demande (`<pane>.request.json`, entrée brute du hook et identifiant), attend la réponse de Tily (`<pane>.answer.json`, identifiant puis sortie du hook), la recopie en octets UTF-8, ou s’arrête sans rien rendre dès que la demande est retirée ou remplacée ; message « Question posée. » pour AskUserQuestion. Installeur : délai de 1 800 s pour PermissionRequest (5 s pour les autres), `Outdated` quand l’installation existante n’a pas ce délai ; Paramètres : « Hooks à mettre à jour » et « Mettre à jour les hooks ».
- `Tily.Core` : `AgentRequestModel`, `AgentRequestRepository` (règle lisible avec sa destination, question répondable), `PermissionDecisions` (JSON ASCII), `AgentResponder` (vérifie que l’agent attend toujours la même demande avant d’écrire, refuse un message de suivi pendant une attente), `JsonFields` (lecture JSON partagée) ; `ClaudeCodeAdapter` : registre `busy` plus récent qu’une attente → « En cours » (réponse donnée dans le terminal), demande rattachée à l’agent en attente et retirée dès qu’il ne l’est plus, avec une date pour ne jamais retirer une demande plus récente que l’indice. Hôte : `agent.respond`, `agent.message` (file `context.query`), `agent.responded`, `agent.send`, `TerminalManager.Probe`.
- Web : `AgentRequestActions` (Autoriser, Refuser… avec raison, Toujours · règle, options d’une question), `AgentFollowUp` (message de suivi), `agentResponses.ts` (collage du message accepté puis Entrée).
- Tests : `AgentRequestRepositoryTests` (10), `AgentResponderTests` (11), `ClaudeCodeAdapterTests` (+5), `ClaudeHooksInstallerTests` (+3), `AgentStateHookScriptTests` (+3, script lancé dans un vrai PowerShell 5.1 : demande écrite, réponse recopiée, retrait).
- Recette R46 déroulée sur l’instance de dev, le script de la branche ajouté par `claude --settings` (les hooks globaux lancent encore le script installé) : Autoriser → commande exécutée ; Refuser… avec « Refusé depuis la vue Agents : écris plutôt dans r46-b-bis.txt » → Claude reçoit la raison, accents intacts, et poursuit son tour ; Toujours · accès au dossier (cette session) puis Toujours · `Bash(ping -n 1 127.0.0.1)` · ce projet → règle écrite dans `.claude/settings.local.json` du projet jetable ; question à choix unique → « Vert » pris ; message de suivi pendant un long poème → « Press up to edit queued messages », puis traité à la fin du tour (`enqueue` / `dequeue` dans le transcript) ; permission affichée dans la vue puis réglée par « 1 » dans le terminal → carte sans demande, fichier de demande retiré, aucun processus de hook restant.
- Vérifications : `pnpm lint`, `pnpm build`, `dotnet build`, `dotnet test` (546 tests verts).
- Commit `a781139`, poussé.

### 30/09 23 h 35 au 1/10 0 h 00 : lot 3, « Lancer »

- `Tily.Core` : `ClaudeLaunchCommand.Prepare(mode, commande préalable, shell)` rend un `ClaudeLaunchModel(SessionId, Command)` : `claude --session-id <uuid>`, `--permission-mode plan` ou `acceptEdits` (Défaut ne passe rien : le mode des réglages de Claude Code s’applique, comme le modèle), précédé de `pnpm install; ` (`& ` sous CMD) dans un nouveau worktree ; mode inconnu refusé en français. Session : `agentLaunch {mode, target}` (mode et emplacement retenus), validé par `SessionValidator`. Hôte : `agent.prepareLaunch` → `agent.launchPrepared {request, sessionId, command}` ; `worktrees.create` accepte `launchMode`, `worktrees.created` porte alors `launch {sessionId, command}`.
- Web : formulaire `AgentLaunchDialog` (« Nouvel agent » dans l’en-tête de la vue Agents, bouton de la vue vide, « Lancer un agent… » dans la palette) : dossier du pane actif, projets et worktrees de la racine des projets, nouveau worktree du dépôt du pane actif ; tâche, mode de départ (`AgentLaunchModes`, partagé), nouvel onglet / nouveau workspace / split ; Ctrl + Entrée lance. Le formulaire de création de worktree propose « Lancer Claude Code avec une tâche ». `launchTasks.ts` colle la tâche quand `agent.states` montre la session attendue et que le collage délimité est actif, puis vérifie la prise en compte (nouvelle Entrée précédée d’un signal de focus sinon) ; `pasteAndSubmit` sert aussi au message de suivi.
- Tests : `ClaudeLaunchCommandTests` (6), `SessionValidatorTests` (+2).
- Recette R47 déroulée (racine des projets de l’instance de dev redirigée vers un dossier du scratchpad avec un dépôt Git jetable, `ANTHROPIC_MODEL=haiku` pour les agents lancés) : tâche de trois lignes avec guillemets doubles et simples, `$env:PATH`, accents graves et antislash, lancée dans le dossier du pane actif → prompt du transcript identique à la tâche ; nouveau worktree en mode Plan → `pnpm install; claude --session-id … --permission-mode plan` dans le terminal du workspace créé, confiance du dossier acceptée, tâche collée, plan rédigé, carte présente dès le démarrage.
- Constat : au premier essai, la tâche collée n’avait pas été validée (formulaire fermé sans rendre le focus au nouveau terminal ; même une Entrée envoyée ensuite restait sans effet, jusqu’à ce que le terminal reprenne le focus). Correctif : focus rendu au nouveau pane, et seconde Entrée précédée d’un signal de focus (`ESC [ I`) si l’agent ne passe pas « En cours ».
- Amélioration en cours de route (commit `c156f44`) : pour ExitPlanMode, le détail de la demande est le plan (plus le JSON brut) ; les fichiers de `.claude\plans` ne comptent plus parmi les fichiers modifiés.
- Vérifications : `pnpm lint`, `pnpm build`, `dotnet build`, `dotnet test` (556 tests verts).
- Commit `cf9b666`, poussé.

## Écarts à la spec

- Section 12, convention proposée « L’hôte lit le transcript de chaque session suivie, dont les hooks lui donnent le chemin » : le chemin vient du registre des sessions (`sessionId` et `cwd`), pas des hooks. Raison : les hooks de l’utilisateur exécutent le script de la version installée, qui n’écrit pas ce chemin, et le registre ne dépend pas de la version du script.
- Un agent interrompu (#121) est « Terminé » avec le message « Interrompu. » (détail non spécifié).
- Section 12, convention proposée « lit le transcript par la fin » : le premier passage lit tout le fichier (les 64 derniers Mo au plus), pour que les fichiers modifiés et leurs lignes couvrent toute la session ; seuls les ajouts sont lus ensuite.
- Titre : entre `/rename` (`custom-title`) et le titre généré (`ai-title`), Tily prend aussi `agent-name` (nom donné à la session par l’utilisateur), absent de la spec.
- Ordre à l’intérieur des groupes (non spécifié hors attentes) : En erreur comme En attente, du plus ancien au plus récent ; En cours, Terminé et État inconnu, du changement le plus récent au plus ancien.
- Le pourcentage de contexte n’est affiché que pour les modèles dont la fenêtre est connue de Tily (liste fixe dans `ModelContextWindows`).
- Lot 2 : une question à plusieurs réponses ou à plusieurs questions ne se règle que dans le terminal (la spec ne demande que le choix unique) ; Tily ne tape jamais les touches du dialogue, le hook se déclenchant pour les questions. « Toujours » envoie les suggestions de Claude Code telles quelles : la règle peut différer de celle du dialogue (commande exacte au lieu de « ping * »). Message de suivi : Entrée envoie, Maj + Entrée va à la ligne (non spécifié). Refus sans raison : « Refusé depuis Tily. ».
- Le hook PermissionRequest attend au plus 30 minutes : au-delà, la demande disparaît de la vue et se règle dans le terminal.
- Lot 3 : « Défaut » ne passe pas `--permission-mode` (le mode par défaut des réglages de Claude Code s’applique, par exemple `auto`) ; le nouveau worktree n’est proposé que pour le dépôt du pane actif et s’ouvre toujours dans un nouveau workspace (comportement de la création de worktree) ; la tâche est collée quand le registre montre la session (après l’éventuelle confirmation de confiance du dossier) plutôt que sur le seul collage délimité, que PowerShell peut aussi activer.

## Blocages

Aucun pour l’instant.

## Améliorations en cours de route

### Faites

- `app.ready` fait renvoyer `agent.states` (et `agent.board`) : après un rechargement de la page (développement), les indications d’agents restaient vides jusqu’au prochain changement (inclus dans `190f970`, car `agent.board` en a besoin).
- `c156f44` : plan affiché pour une demande ExitPlanMode, fichiers de plan de Claude Code ignorés dans les fichiers modifiés.

### Notées seulement

- Un Tily lancé depuis une session Claude Code transmet à ses terminaux `CLAUDECODE`, `CLAUDE_CODE_CHILD_SESSION`… : un `claude` lancé dans Tily se croit alors sous-agent, n’enregistre ni transcript ni registre, et la vue Agents ne le voit qu’à moitié. Cas surtout rencontré en développement ; retirer ces marqueurs de l’environnement des panes, comme `WEZTERM_*`, serait simple.

## Reste à faire

Lot 4, finition.

## À vérifier au réveil

- Échap sur un agent Claude Code dans le Tily installé après la mise à jour : l’agent ne doit plus rester « En cours » ni « En attente ».
- Vue Agents (Ctrl + Maj + I) avec de vraies sessions longues : titre, dernier message, fichiers modifiés et contexte ; durée du premier affichage sur un gros transcript.
- **Réinstaller les hooks** après la mise à jour (Paramètres → Agents → « Mettre à jour les hooks ») : sans cela, le hook PermissionRequest garde son délai de 5 s et la vue ne peut pas répondre (elle l’indique : « Cette demande se règle dans le terminal »).
- Répondre depuis la vue à une vraie permission (Autoriser, Refuser… avec une raison, Toujours) et à une question ; vérifier la règle ajoutée par « Toujours » dans `.claude/settings.local.json` du projet.
- « Lancer un agent… » depuis un vrai projet (Défaut garde votre mode `auto`) et depuis un nouveau worktree : la tâche doit être collée puis envoyée seule.
