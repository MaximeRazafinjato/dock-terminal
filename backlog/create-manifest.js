// Generates reviewable issue drafts. Does not contact GitHub.
const fs=require('fs');
const tasks=[
['F01','Interface Dock verte, compacte et sans contours de sélection','4, 16','R26','Retrouver une interface compacte donnant la priorité aux terminaux.',[
'Reprendre Dock vert et le panneau en arborescence du POC retenu.',
'Conserver en-tête compact, barre d’onglets et terminaux occupant la hauteur restante.',
'Identifier les éléments sélectionnés par un fond discret, sans bordure colorée sur onglets, workspaces et résultats.',
'Éviter les aides permanentes et popups pour les actions courantes ; fournir noms accessibles et focus perceptible.',
'Respecter la mise à l’échelle Windows et les noms/chemins longs.'
],[],'Police, zoom et dimensions minimales restent à préciser.'],
['F02','Créer, sélectionner et renommer les workspaces inline','3, 5','R01, R02','Organiser des terminaux dans des groupes libres, sans couche projet.',[
'Disposer d’un workspace par défaut et interdire les terminaux sans workspace.',
'Créer un workspace directement depuis le panneau et éditer son nom inline.',
'Permettre des onglets dans des dossiers sans rapport entre eux.',
'Renommer depuis le titre ou la palette ; Entrée/perte de focus valide, Échap annule, nom vide conserve le précédent.',
'Synchroniser le nom et la sélection entre en-tête et panneau.'
],['F01'],'Nom provisoire, dossier initial et comportement de suppression de workspace à confirmer.'],
['F03','Naviguer dans les workspaces et onglets en arborescence','5','R07','Voir les onglets de chaque workspace et rejoindre une activité directement.',[
'Déplier et replier chaque workspace indépendamment avec un chevron accessible.',
'Cliquer sur un onglet enfant active son workspace, son onglet et son pane mémorisé.',
'Synchroniser noms, ordre et sélection avec la barre supérieure.',
'Conserver les états de dépliage ; replier ne change pas la sélection.',
'Afficher les nombres d’onglets et les attentes sans ajouter de bordures de sélection.'
],['F02'],'Le panneau reste centré sur les workspaces et non sur une liste indépendante d’agents.'],
['F04','Replier et redimensionner le panneau des workspaces','5, 16','R08','Libérer la largeur des terminaux sans perdre le contexte.',[
'Replier/réafficher le panneau depuis un bouton toujours accessible ou la palette.',
'Redimensionner par séparateur et fournir un accès clavier.',
'Conserver la largeur après réouverture et mémoriser la visibilité.',
'Préserver les commandes en cours de saisie, processus et dispositions des panes.',
'Le panneau masqué ne conserve pas d’éléments focusables invisibles.'
],['F03'],'Les états du panneau sont sauvegardés avec la session.'],
['F05','Ouvrir les onglets et choisir le shell au clic droit sur « + »','6','R03, R04','Ouvrir un terminal sans formulaire et choisir un autre shell au besoin.',[
'Clic gauche sur « + » ouvre directement PowerShell.',
'Clic droit sur le même bouton affiche PowerShell, CMD et Git Bash dans un menu contextuel.',
'Le menu accepte flèches, Entrée, Échap, clic extérieur et Maj + F10.',
'Le nouvel onglet reprend le dossier réel du pane actif.',
'Aucun bouton séparé de choix du shell ; garder une action équivalente dans la palette.'
],['F02','F11'],'Les chemins de shells sont configurés, pas codés avec des valeurs de démonstration.'],
['F06','Renommer les onglets inline et préserver les noms manuels','6','R05','Nommer une activité directement dans la barre d’onglets.',[
'Double-clic sur le nom ou commande de palette active un éditeur inline.',
'Entrée/perte de focus valide, Échap annule et un nom vide est refusé sans perdre le nom précédent.',
'Synchroniser immédiatement le nom dans l’arborescence.',
'Ne jamais écraser un nom manuel par une mise à jour automatique.',
'Gérer les noms longs et la composition de texte sans validation prématurée.'
],['F05'],'Règles de nommage automatique et retour au nom automatique à décider.'],
['F07','Réordonner et transférer les onglets entre workspaces','6','R06','Réorganiser une activité sans relancer ses terminaux.',[
'Glisser les onglets depuis la barre supérieure ou l’arborescence.',
'Réordonner dans un workspace ou transférer vers un autre.',
'Conserver processus actifs, dossiers, historique, noms et splits.',
'Synchroniser les deux représentations et sauvegarder le nouvel ordre.',
'Fournir un équivalent clavier pour les déplacements essentiels.'
],['F03','F05'],'Insertion avant la cible et cas du dernier onglet source à trancher ; ne pas imposer silencieusement le remplacement du POC.'],
['F08','Fermer et rouvrir un onglet fermé accidentellement','6, 13','R23','Récupérer un contexte fermé par erreur.',[
'Fermer l’onglet et gérer ses processus selon la politique de fermeture retenue.',
'Proposer la réouverture via les commandes.',
'Restaurer noms, shells, chemins, splits et texte avec de nouveaux processus.',
'Marquer l’ancienne session et ne pas rejouer de commandes.',
'Tester la fermeture du dernier onglet selon la décision documentée.'
],['F05','F17'],'Durée/profondeur de rétention et dernier onglet à décider avant finalisation.'],
['F09','Créer, fermer et redimensionner des splits imbriqués','7','R09','Organiser plusieurs terminaux dans un même onglet.',[
'Créer des splits côte à côte et haut/bas depuis le pane actif.',
'Hériter du dossier réel du pane actif.',
'Supporter des divisions imbriquées avec séparateurs redimensionnables.',
'La fermeture retire un pane et agrandit la zone restante.',
'Sauvegarder orientations et proportions sans relancer les processus.'
],['F05'],'Héritage du shell, ratio initial et fermeture du dernier pane sont des conventions à confirmer.'],
['F10','Naviguer au clavier et gérer le Leader sans perte de saisie','7, 9, 16','R09, R25','Piloter le terminal et ses vues au clavier.',[
'Activer un pane à la souris et naviguer entre panes au clavier.',
'Proposer les actions via une touche Leader et documenter les séquences retenues.',
'Gérer expiration, annulation et collisions avec les applications terminal.',
'Préserver les saisies lors des opérations de présentation.',
'Assurer un focus visible et le fonctionnement avec IME/composition.'
],['F09'],'Mapping exact et navigation spatiale ou séquentielle à confirmer ; reprendre le tableau du POC comme proposition.'],
['F11','Exécuter de vrais shells et charger le profil PowerShell','8','R12, R13, R14','Utiliser l’application comme un terminal Windows complet.',[
 'Lancer Windows PowerShell 5.1 par défaut ; proposer PowerShell 7, CMD et Git Bash lorsque les chemins sont configurés.',
 'Charger le vrai profil avec alias, fonctions, modules et prompt.',
 'Charger notamment wtr et rmwt depuis %USERPROFILE%\\Documents\\WindowsPowerShell\\Microsoft.PowerShell_profile.ps1.',
'Supporter commandes libres, sélection, copier/coller, couleurs, Unicode et outils plein écran.',
'Suivre le dossier courant réel après cd et fonctions du profil.',
'Signaler localement un shell introuvable avec relance ou choix alternatif, sans substitution silencieuse.',
'Valider redimensionnement et touches de contrôle avec les outils réels.'
],[],'VS Code est l’éditeur retenu. Le profil observé est celui de Windows PowerShell 5.1 ; le profil PowerShell 7 n’a pas été trouvé dans Documents\\PowerShell et ne doit pas être supposé identique.'],
['F12','Palette Ctrl + P avec navigation clavier et destinations','9','R10','Trouver une commande ou rejoindre une activité rapidement.',[
'Ouvrir avec Ctrl + P ; conserver Ctrl + Maj + P comme alias proposé.',
'Rechercher les commandes, workspaces, onglets et panes.',
'↑/↓ sélectionne, Entrée valide, Échap ferme ; faire défiler la sélection en vue.',
'Revenir au premier résultat après filtrage et ne rien exécuter sur liste vide.',
'Afficher la sélection par le fond uniquement et déclencher les éditeurs inline appropriés.',
'Restaurer le focus correctement sans perdre la saisie terminal.'
],['F03','F05'],'La navigation directe vers un pane dépasse la liste actuelle du POC et fait partie de la cible.'],
['F14','Ouvrir un workspace depuis le sélecteur de projets','10','R16','Trouver rapidement un dossier dans Projets.',[
 'Lire le vrai dossier C:\\Files\\Projects, pas une liste fictive.',
'Rechercher des dossiers et naviguer avec flèches, Entrée et Échap.',
'Créer un workspace avec son premier terminal dans le dossier choisi.',
'Conserver une interface compacte intégrée et l’accès par Leader/palette.',
'Traiter dossiers absents/inaccessibles sans modifier le contexte courant par erreur.'
],['F02','F11'],'Le sélecteur reprend le premier niveau de C:\\Files\\Projects, exclut worktrees de la liste des projets et crée toujours un nouveau workspace.'],
['F15','Actions de dossier et de branche sur le pane actif','11','R17','Agir sur le contexte réel du terminal sélectionné.',[
'Copier le chemin réel et ouvrir le dossier dans l’éditeur configuré ou l’explorateur.',
'Copier la branche du dépôt/worktree courant lorsqu’elle existe.',
'Ouvrir un terminal supplémentaire dans ce dossier.',
'Indiquer le chemin ciblé ; ne pas supposer un dossier unique de workspace.',
'Gérer hors dépôt, HEAD détachée et chemins avec espaces sans valeur fictive.'
],['F11'],'Éditeur et paramètres d’ouverture à configurer ; aucune commande locale ne doit être composée naïvement avec les chemins.'],
['F16','Préserver wtr/rmwt et synchroniser leur contexte','11','R15','Continuer à utiliser les fonctions worktree existantes depuis le terminal.',[
 'Prendre en compte la lecture du profil et la documentation de wtr/rmwt dans docs/inspection-environnement.md.',
'Pouvoir exécuter wtr et rmwt dans PowerShell.',
'Suivre leurs effets observables sur dossier courant et contexte Git.',
'Documenter puis vérifier le contrat de synchronisation avec l’interface.',
'Ne pas créer de cycle de vie automatique de workspaces non demandé.'
],['F11','F15'],'wtr crée un worktree sous C:\\Files\\Projects\\worktrees, installe les dépendances et peut répliquer une base ; rmwt supprime le worktree, une base répliquée et la branche sauf -KeepBranch. Ne pas reproduire ces opérations dans l’interface sans contrat explicite.'],
['F17','Sauvegarder et restaurer automatiquement les sessions visuelles','13','R19, R21, R22','Retrouver l’environnement de travail à la réouverture.',[
'Sauvegarder automatiquement workspaces, onglets, ordre, noms, shells, chemins et splits.',
'Conserver sélections, largeur/visibilité du panneau et dépliage des groupes.',
'Restaurer le texte avec un séparateur explicite et démarrer des shells neufs.',
'Ne pas réexécuter les anciennes commandes ou rétablir de faux états actifs.',
'Résister à un arrêt inattendu ; signaler échec de sauvegarde et données corrompues sans écrasement silencieux.',
'Gérer dossiers disparus et shells indisponibles avec un état local compréhensible.'
],['F03','F04','F09','F11'],'Quotas, fréquence de sauvegarde du texte et fidélité plein écran à décider ; 500 lignes est une limite de POC.'],
['F18','Arrêter proprement les processus à la fermeture','8, 13','R20','Fermer l’application sans laisser volontairement agents et serveurs en arrière-plan.',[
'Définir le traitement des shells et de leurs processus enfants.',
'Appliquer la politique aux fermetures de pane, onglet et application.',
'Ne pas introduire de service persistant qui reprend les anciens agents.',
'Sauvegarder la disposition avant fermeture lorsque possible.',
'Tester avec serveur et agent actifs ainsi qu’un programme qui ne se termine pas immédiatement.'
],['F11','F17'],'Délais, terminaison forcée et éventuelles confirmations restent à décider.'],
['F19','Sauvegarder, exporter et importer les préférences','14','R24','Versionner la configuration et la réutiliser.',[
'Définir un format versionné pour shells, raccourcis, éditeur, Projets et préférences visuelles.',
'Séparer préférences, disposition et historique terminal.',
'Ne pas inclure implicitement le texte des terminaux dans l’export.',
'Valider l’import intégralement avant toute mutation ; conserver la session si invalide.',
'Définir migrations et politique de fusion/remplacement avec protection des données existantes.'
],['F17'],'Format/emplacement à décider ; l’export actuel du POC est un export de disposition, pas l’ensemble des préférences.'],
['F20','Afficher les états de Claude Code et Codex CLI dans les workspaces','12','R18','Repérer une activité nécessitant une intervention sans quitter la logique de workspaces.',[
'Supporter en cours, attente de réponse/autorisation, terminé, erreur et inconnu.',
'Rattacher les états au pane puis les résumer sur onglet/workspace.',
'Mettre en évidence les attentes et rejoindre le pane correspondant.',
'Ne pas déduire un état fiable de la simple présence d’un processus.',
'Ne pas restaurer des activités anciennes comme vivantes.'
],['F03','F11'],'Les agents retenus sont Claude Code (`claude`) et Codex CLI (`codex`). Identifier leurs événements réels ; le simulateur agent du POC ne satisfait pas cette tâche.'],
['F21','Notifier les demandes d’attention sans interrompre le travail','12','R18','Être prévenu lorsqu’une intervention devient nécessaire.',[
'Émettre une notification discrète et ciblée pour une nouvelle attente.',
'Éviter les doublons et changements automatiques de workspace ou de focus.',
'Permettre de rejoindre précisément le pane concerné.',
'Définir le choix de destination lorsque plusieurs panes attendent.',
'Définir un comportement utile lorsque le panneau est replié.'
],['F20'],'Canal Windows/interne et événements de fin/erreur à confirmer.']
];
const manifest=tasks.map(([id,title,sections,tests,goal,checks,deps,open])=>({id,title:`[${id}] ${title}`,dependencies:deps,body:`## Besoin utilisateur\n\n${goal}\n\n## Critères d’acceptation\n\n${checks.map(c=>'- [ ] '+c).join('\n')}\n\n## Références\n\n- [Spécifications complètes](https://github.com/MaximeRazafinjato/dock-terminal/blob/main/specifications-terminal.md), sections ${sections}.\n- Recette : ${tests}.\n- [POC de référence](https://github.com/MaximeRazafinjato/dock-terminal/blob/main/poc/README.md) : les terminaux sont simulés.\n\n## Dépendances fonctionnelles\n\n${deps.length?deps.join(', '):'Aucune dépendance fonctionnelle imposée.'}\n\n## Points à préciser\n\n${open}\n\nAucune priorité ni échéance attribuée. Cette issue vise l’application finale, pas uniquement la démonstration HTML.\n`}));
manifest.push({id:'D01',title:'[D01] Trancher les comportements fonctionnels encore ouverts',dependencies:[],body:`## Objectif\n\nDocumenter les décisions restantes sans transformer les conventions du POC en exigences validées.\n\n## Décisions à consigner\n\n- [ ] Dernier onglet/pane et fermeture ou suppression des workspaces.\n- [ ] Noms automatiques et retour au nom automatique.\n- [ ] Navigation spatiale/séquentielle et raccourcis Leader.\n- [x] Dossier Projets : C:\\Files\\Projects, premier niveau, sans détection de projet déjà ouvert.\n- [ ] Limites de conservation du texte, sauvegarde et réouverture d’onglets.\n- [ ] Arrêt des processus et éventuelles confirmations.\n- [x] Recherche dans les terminaux retirée du périmètre.\n- [ ] Claude Code/Codex CLI, états et notifications lorsque le panneau est masqué.\n- [ ] Format/emplacement de configuration, imports et éditeur.\n\n## Critère de fin\n\nChaque décision est reportée dans les spécifications et les issues concernées. Les points nécessitant l’inspection du profil et de WezTerm sont documentés.\n\nRéférence : sections 18 et 19 des [spécifications](https://github.com/MaximeRazafinjato/dock-terminal/blob/main/specifications-terminal.md). Aucune priorité fixée.\n`});
fs.writeFileSync('backlog/issues.json',JSON.stringify(manifest,null,2)+'\n');
for(const issue of manifest)fs.writeFileSync(`backlog/${issue.id}.md`,issue.body);
fs.writeFileSync('BACKLOG.md','# Backlog fonctionnel\n\n'+manifest.length+' tâches sans ordre de priorité : 20 fonctionnalités actives, une fonctionnalité retirée du périmètre et une tâche de clarification. Les dépendances expriment des relations fonctionnelles, pas un planning.\n\n| ID | Tâche | Dépendances |\n| --- | --- | --- |\n'+manifest.map(i=>`| ${i.id} | [${i.title}](backlog/${i.id}.md) | ${i.dependencies.join(', ')||'—'} |`).join('\n')+'\n\nLes liens vers les issues GitHub seront ajoutés après publication.\n');
console.log(`${manifest.length} issue drafts generated.`);
