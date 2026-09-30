# Journal de nuit : vue Agents (#118) et correction #121

Récap HTML : [file:///C:/Users/maxim/AppData/Local/Temp/claude/D--Projects-Perso-Projet-T-dock-terminal/75d23f39-c1a6-4519-b46e-394becf986f7/scratchpad/recap-nuit-vue-agents.html](file:///C:/Users/maxim/AppData/Local/Temp/claude/D--Projects-Perso-Projet-T-dock-terminal/75d23f39-c1a6-4519-b46e-394becf986f7/scratchpad/recap-nuit-vue-agents.html)

Branche `feature/vue-agents`, créée depuis `main` (73c55a9) le 30 septembre 2026 à 22 h 14.

## Plan

- [x] 0. #121 : recouper l’état des hooks avec le registre `~/.claude/sessions/<pid>.json` ; lien pane → `sessionId` → `cwd` → transcript
- [ ] 1. Lot 1, « Voir » (R45)
  - [ ] 1.1 Lecture incrémentale du transcript dans `Tily.Core` (titre, dernier message, action en cours, fichiers modifiés, contexte, PR) et tests
  - [ ] 1.2 Message du pont et store
  - [ ] 1.3 Bascule du panneau et liste groupée par urgence
  - [ ] 1.4 Cartes, « Rejoindre », raccourcis, masquage des cartes d’attention
  - [ ] 1.5 Vérification à l’écran
- [ ] 2. Essai du hook PermissionRequest (protocole du mandat)
- [ ] 3. Lot 2, « Répondre » (R46)
- [ ] 4. Lot 3, « Lancer » (R47)
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

## Écarts à la spec

- Section 12, convention proposée « L’hôte lit le transcript de chaque session suivie, dont les hooks lui donnent le chemin » : le chemin vient du registre des sessions (`sessionId` et `cwd`), pas des hooks. Raison : les hooks de l’utilisateur exécutent le script de la version installée, qui n’écrit pas ce chemin, et le registre ne dépend pas de la version du script.
- Un agent interrompu (#121) est « Terminé » avec le message « Interrompu. » (détail non spécifié).

## Blocages

Aucun pour l’instant.

## Améliorations en cours de route

### Faites

Aucune pour l’instant.

### Notées seulement

- Un Tily lancé depuis une session Claude Code transmet à ses terminaux `CLAUDECODE`, `CLAUDE_CODE_CHILD_SESSION`… : un `claude` lancé dans Tily se croit alors sous-agent, n’enregistre ni transcript ni registre, et la vue Agents ne le voit qu’à moitié. Cas surtout rencontré en développement ; retirer ces marqueurs de l’environnement des panes, comme `WEZTERM_*`, serait simple.

## Reste à faire

Tout le plan à partir du lot 1.

## À vérifier au réveil

- Échap sur un agent Claude Code dans le Tily installé après la mise à jour : l’agent ne doit plus rester « En cours » ni « En attente ».
