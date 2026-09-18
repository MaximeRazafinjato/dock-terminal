# Dock — Spécifications complètes

Version 2.0 · 18 septembre 2026 · Application Windows · Aucune priorité définie

Document de référence pour l’implémentation. Cette version remplace les spécifications initiales et consolide les décisions prises après exploration des maquettes et utilisation du POC Dock vert.

Référence visuelle : [POC Dock](poc/index.html). Les anciennes maquettes et variantes servent uniquement d’archives d’exploration.

## 1. Statut des exigences

- **Retenu** : besoin explicitement demandé ou direction visuelle sélectionnée par l’utilisateur.
- **Convention proposée** : détail nécessaire à l’implémentation, proposé ici lorsque la conversation ne le tranche pas. Il ne constitue pas une validation supplémentaire de l’utilisateur.
- **À décider** : information manquante ou choix technique qui doit être établi avant l’implémentation concernée.
- **Limite du POC** : comportement de démonstration qui ne doit pas être confondu avec la capacité attendue de l’application finale.

L’approbation de la version visuelle actuelle valide la direction Dock vert et les interactions demandées. Elle ne transforme pas les valeurs fictives, les limites du navigateur ou les simulations en exigences du produit final.

## 2. Objectif et périmètre

**Retenu.** Créer un véritable terminal Windows, organisé en workspaces libres, avec une interface légère permettant de naviguer rapidement entre plusieurs activités. L’utilisateur garde la liberté d’exécuter ses commandes, scripts et outils interactifs habituels.

Le panneau de droite présente les workspaces et leurs onglets. Les états d’agents fournissent des indications d’attention dans cette organisation. L’application ne distribue pas de tâches aux agents.

### Hors périmètre actuel

- Couche « Projet » obligatoire au-dessus des workspaces.
- Maintien des agents ou serveurs en arrière-plan après fermeture de l’application ; reprise des processus après réouverture.
- Orchestration de tâches entre agents ou interface de conversation dédiée aux agents.
- Gestion avancée des worktrees et création automatique de workspaces liée à leur cycle de vie.
- Modèles de workspace et mode focus dédié.
- Recherche globale dans le contenu des fichiers du projet.
- Recherche dans la sortie des terminaux : ce besoin a été retiré du périmètre.
- Catalogue permanent de thèmes : la direction retenue est Dock vert avec panneau en arborescence.

## 3. Modèle fonctionnel

Hiérarchie : **Workspace → Onglet → Pane de terminal**.

| Entité | Définition | Invariants |
| --- | --- | --- |
| Workspace | Groupe nommé d’onglets, sans dossier unique imposé. | Chaque onglet appartient à un workspace. Un workspace par défaut est disponible. |
| Onglet | Activité contenant un ou plusieurs panes, avec sa disposition de splits. | Chaque pane appartient à un onglet. L’onglet conserve un pane actif. |
| Pane | Instance de terminal avec shell, dossier courant, sortie et état de processus. | Le dossier réel est suivi pendant la session. |
| Split | Division d’une zone en deux sous-zones, éventuellement subdivisées. | Orientation et proportions sont conservées. |
| Activité d’agent | Information rattachée à un pane lorsqu’une intégration le permet. | Elle ne devient pas une couche de navigation obligatoire. |

Exemple : « Perso » peut contenir un terminal dans Documents, un autre dans un dépôt Git et un troisième dans un dossier de scripts. Aucun projet commun n’est requis.

**Convention proposée.** Utiliser des identifiants stables indépendants des noms. Deux workspaces ou onglets peuvent porter le même nom sans collision. Renommer un élément ne modifie ni son dossier ni sa branche.

## 4. Direction visuelle et disposition

**Retenu.** Dock vert : interface claire, terminaux sombres à dominante verte, en-tête vert compact, panneau droit en arborescence. Maximiser l’espace disponible pour les terminaux.

| Zone | Contenu attendu |
| --- | --- |
| En-tête compact | Identité de l’application, nom du workspace éditable inline, accès à la palette, bouton de visibilité du panneau. |
| Barre d’onglets | Onglets du workspace actif, bouton « + », actions compactes de split et actions du dossier. |
| Zone de travail | Panes et séparateurs, occupant la hauteur restante. |
| En-tête d’un pane | Shell, dossier courant et action de fermeture ; chemin tronqué si nécessaire et consultable intégralement. |
| Panneau droit | Workspaces, chevrons de dépliage, onglets enfants, accès aux projets et indications d’attention. |

### Règles de présentation

- Pas de bordure ou barre colorée pour signaler un onglet sélectionné, un workspace sélectionné ou un résultat de palette sélectionné. Utiliser un fond discret.
- Pas de contour permanent autour du champ de recherche de la palette. Le focus clavier reste perceptible, notamment par le fond.
- Conserver les lignes fines de l’arborescence : elles représentent la hiérarchie, pas une sélection.
- Éviter titres de section redondants, slogan, texte d’aide permanent, chemin global répété, barre d’état sans utilité immédiate et gros blocs de présentation.
- Préférer les infobulles et noms accessibles pour les boutons compacts.
- Réserver les fenêtres modales aux interactions qui en bénéficient réellement, notamment la palette. Les actions courantes sont directes, inline ou contextuelles.
- Les badges « Simulation » et messages de démonstration du POC n’appartiennent pas à l’application finale.

### Repères visuels issus du POC

Ces valeurs sont des références de réalisation, pas des contraintes de taille absolues : en-tête d’environ 42 px, fond de terminal #14251e, en-tête #226b4b, fond de sélection vert clair, interface en Segoe UI et terminal en police monospace. Préserver la lisibilité avec la mise à l’échelle Windows.

**À décider.** Personnalisation de la police terminal, taille du texte, zoom et comportement aux très petites dimensions. La cible principale reste une fenêtre d’application de bureau.

## 5. Workspaces et panneau en arborescence

| ID | Exigence retenue |
| --- | --- |
| WS-01 | Créer plusieurs workspaces et naviguer entre eux sans association obligatoire à un projet. |
| WS-02 | Disposer d’un workspace par défaut ; aucun terminal autonome hors workspace. |
| WS-03 | Renommer le workspace directement dans le titre de l’en-tête, sans popup. |
| WS-04 | Afficher les workspaces à droite et leurs onglets sous forme d’arborescence. |
| WS-05 | Chaque chevron déplie ou replie les onglets de son workspace, indépendamment des autres. |
| WS-06 | Cliquer sur un onglet de l’arborescence active son workspace et cet onglet. |
| WS-07 | Mémoriser les états déplié/replié, la largeur et la visibilité du panneau. |
| WS-08 | Permettre de masquer entièrement le panneau et de le réafficher via le bouton toujours accessible dans l’en-tête ou la palette. |
| WS-09 | Redimensionner le panneau en faisant glisser son séparateur ; conserver sa largeur après masquage. |

### Création et renommage

Le « + » du panneau crée directement un workspace et permet de modifier son nom inline. Le clic sur le titre du workspace actif démarre le renommage. Entrée ou perte de focus enregistre ; Échap annule. Un nom vide ne remplace pas le nom existant.

La commande « Renommer le workspace » dans la palette active le même éditeur inline. Le panneau reflète immédiatement le nouveau nom.

**Convention proposée.** À la création, nom temporaire « Nouveau workspace », premier onglet PowerShell et dossier du pane précédemment actif ; lors du tout premier lancement, dossier utilisateur. Un clic sur un workspace rejoint son dernier onglet et son dernier pane actifs. Replier une branche ne change pas la sélection.

**À décider.** Fermeture/suppression d’un workspace, réorganisation des workspaces et traitement de leurs terminaux actifs. Ces actions n’ont pas encore fait l’objet d’une décision explicite.

## 6. Onglets

| ID | Exigence retenue |
| --- | --- |
| TAB-01 | Ouvrir plusieurs onglets dans un workspace. |
| TAB-02 | Clic gauche sur « + » : créer immédiatement un onglet PowerShell, sans formulaire. |
| TAB-03 | Clic droit sur le même « + » : menu contextuel PowerShell / CMD / Git Bash, placé près du bouton. Supprimer le bouton séparé de choix du shell. |
| TAB-04 | Le nouvel onglet reprend le dossier courant du pane actif au moment de l’action. |
| TAB-05 | Double-clic sur le nom d’un onglet : renommage inline. La palette offre aussi cette action. |
| TAB-06 | Entrée ou clic ailleurs valide le nom ; Échap annule ; le nom manuel prime sur les noms automatiques. |
| TAB-07 | Réordonner les onglets et les déplacer entre workspaces, notamment par glisser-déposer. |
| TAB-08 | Fermer un onglet et pouvoir rouvrir un onglet fermé accidentellement. |
| TAB-09 | La barre d’onglets et l’arborescence reflètent la même sélection, le même ordre et les mêmes noms. |

### Menu des shells

Le menu accepte ↑ / ↓, Entrée et Échap. Un clic à l’extérieur le ferme. Maj + F10 ou la touche de menu contextuel sur le « + » offre un accès clavier. L’action reste accessible via la palette. Le menu ne remplace pas le clic gauche direct.

### Déplacement

Le déplacement conserve le shell, le dossier, l’historique, les processus actifs et la disposition de l’onglet. Il ne recrée pas les terminaux. Le glisser-déposer est possible depuis la barre supérieure ou les onglets de l’arborescence. Déposer sur un workspace transfère l’onglet ; déposer sur un onglet permet de choisir sa position.

**Convention proposée.** Insérer avant l’onglet cible ; déposer sur le workspace ajoute en fin de liste et active l’onglet déplacé. Proposer un équivalent clavier dans les commandes pour les déplacements essentiels.

### Cas de fermeture

**À décider.** Comportement après fermeture ou déplacement du dernier onglet : workspace vide avec action d’ouverture, ou nouvel onglet automatique. Le POC crée automatiquement un onglet de remplacement ; ce choix reste provisoire.

**Convention proposée.** Rouvrir restaure noms, shells, chemins, splits et texte avec de nouveaux processus et un séparateur de restauration. Ne pas réexécuter les anciennes commandes. La durée et la profondeur de l’historique des onglets fermés restent à décider.

## 7. Panes et splits

| ID | Exigence retenue |
| --- | --- |
| PANE-01 | Diviser un pane côte à côte ou haut/bas, rapidement depuis les commandes ou les boutons compacts. |
| PANE-02 | Le nouveau pane reprend le dossier du pane actif. |
| PANE-03 | Redimensionner les sous-zones avec leurs séparateurs. |
| PANE-04 | Naviguer entre panes au clavier et activer un pane en cliquant dedans. |
| PANE-05 | Conserver la disposition et ses proportions entre sessions. |

Les splits imbriqués du POC servent de référence. L’action de fermeture d’un pane retire cette feuille de la disposition et agrandit la zone restante.

**Conventions proposées.** Le split hérite aussi du shell du pane actif, commence à parts égales et active le nouveau pane. La fermeture du dernier pane utilise les règles de fermeture d’un onglet. Préserver les saisies, processus et sélections lorsque le panneau latéral est masqué, lorsqu’un groupe est déplié ou lorsqu’une zone est redimensionnée.

**À décider.** Navigation spatiale avec les flèches ou parcours séquentiel des panes. Le POC utilise un ordre séquentiel ; ne pas l’assimiler à une navigation géométrique validée.

## 8. Terminal réel et shells

**Retenu.** L’application finale héberge de vrais terminaux interactifs. Windows PowerShell 5.1 est le shell par défaut afin de charger le profil existant ; CMD, Git Bash et PowerShell 7 sont disponibles en alternative configurée.

- Charger le profil PowerShell habituel avec ses alias, fonctions, modules et prompt.
- Préserver l’utilisation de wtr et rmwt depuis le profil.
- Permettre sélection de texte, copier/coller, défilement et exécution libre des programmes.
- Prendre en charge les interactions des outils utilisés : couleurs, curseur, touches de contrôle, programmes plein écran et redimensionnement.
- Suivre le dossier courant réel après les commandes de navigation, y compris après une fonction du profil qui change le dossier.
- Ne pas remplacer le shell par un interpréteur limité à quelques commandes reconnues par l’interface.

**Conventions proposées.** Préserver l’historique et le processus lors des changements de workspace. Si un shell est introuvable ou échoue au démarrage, afficher un état local au pane avec actions de relance ou de choix du shell. Ne pas basculer silencieusement vers un autre shell.

**Décision prise.** Le profil contenant `wtr` et `rmwt` est `%USERPROFILE%\\Documents\\WindowsPowerShell\\Microsoft.PowerShell_profile.ps1`. WezTerm utilise actuellement `powershell.exe -NoLogo`. PowerShell 7 est installé mais son profil utilisateur correspondant n’a pas été trouvé dans `Documents\\PowerShell`; il reste une alternative à configurer explicitement. Les chemins de CMD et Git Bash doivent rester configurables.

## 9. Palette et clavier

### Palette de commandes

**Retenu.** Ctrl + P ouvre la palette « Commandes & navigation ». Elle recherche les commandes et les éléments de navigation. ↑ / ↓ déplace la sélection ; Entrée exécute le résultat sélectionné ; Échap ferme la palette.

- Sélection visible uniquement par un fond discret, sans barre latérale colorée.
- Le résultat sélectionné reste visible lorsque la liste défile.
- Modifier la requête remet la sélection au premier résultat disponible.
- Une recherche sans résultat affiche un message neutre et Entrée ne déclenche aucune action.
- La sélection à la souris et au clavier conduit à la même action.
- La palette rejoint les workspaces, onglets et panes ; elle déclenche les éditeurs inline plutôt que des formulaires modaux supplémentaires.

**Convention proposée.** Conserver Ctrl + Maj + P comme alias du POC. Prévoir retour du focus à l’élément d’origine à la fermeture ; lorsqu’une commande ouvre un terminal ou un éditeur inline, son nouveau champ reçoit le focus.

### Touche Leader

Le principe d’une touche Leader est retenu. Le mapping précis ci-dessous provient du POC et reste configurable/à confirmer avant de figer les raccourcis.

| Raccourci du POC | Action |
| --- | --- |
| Ctrl + Espace, puis P | Palette |
| Ctrl + Espace, puis T | Nouvel onglet PowerShell |
| Ctrl + Espace, puis V | Split côte à côte |
| Ctrl + Espace, puis H | Split haut/bas |
| Ctrl + Espace, puis F | Sélecteur de projets |
| Ctrl + Espace, puis W | Nouveau workspace |
| Ctrl + Espace, puis flèche | Navigation entre panes |

**À décider.** Délai d’expiration du Leader, personnalisation et transmission d’un raccourci aux applications terminal lorsque leurs touches entrent en conflit avec celles de l’interface. Ctrl + T a été évoqué initialement ; son maintien direct n’est pas acté.

## 10. Sélecteur de projets

**Retenu.** Chercher rapidement un dossier dans `C:\\Files\\Projects`, puis ouvrir un workspace avec un premier terminal dans ce dossier. Le raccourci WezTerm Leader + F existant sert de référence fonctionnelle.

Ce sélecteur recherche des dossiers, pas du texte dans les fichiers. L’interface doit rester compacte et intégrée, comme l’exploration de projets du POC. La navigation clavier suit le principe ↑ / ↓ / Entrée / Échap.

**Décision prise.** Le chemin est `C:\\Files\\Projects`. Reprendre la profondeur de premier niveau de WezTerm, exclure `worktrees` de la liste des projets puis l’exposer séparément si nécessaire. Le sélecteur ne recherche que des dossiers et ne détecte pas les workspaces déjà ouverts : chaque sélection peut créer un nouveau workspace. Le nom initial est celui du dossier sélectionné.

## 11. Actions contextuelles et worktrees

Les actions utilisent le **dossier du pane actif**, jamais un hypothétique dossier unique du workspace.

| Action retenue | Comportement attendu |
| --- | --- |
| Copier le chemin | Copier le chemin courant réel dans le presse-papiers. |
| Ouvrir dans l’éditeur | Ouvrir le dossier dans l’éditeur configuré. |
| Ouvrir dans l’explorateur | Ouvrir le dossier dans l’explorateur Windows. |
| Copier la branche | Résoudre et copier la branche Git du contexte courant lorsque disponible. |
| Terminal supplémentaire | Ouvrir un terminal dans le même dossier, notamment dans le même worktree. |

**Convention proposée.** Montrer le chemin ciblé dans le menu ou la zone d’actions. Désactiver ou expliquer les actions Git indisponibles hors dépôt ; ne pas afficher une branche fictive.

La gestion actuelle des worktrees reste celle des fonctions wtr et rmwt du profil. L’interface doit suivre les changements observables depuis le shell. Aucun comportement de création/suppression automatique de workspace n’est validé.

**À décider après inspection du profil.** Effets exacts des fonctions, suivi du dossier, des branches et des éventuels terminaux ouverts. Définir ce contrat avant de développer une intégration dédiée.

## 12. Attention, agents et notifications

**Retenu.** Les workspaces restent les éléments principaux. Les activités de **Claude Code** (`claude`) et du **Codex CLI** (`codex`) s’y rattachent pour aider à trouver où une intervention est nécessaire.

| État | Signification |
| --- | --- |
| En cours | Une intégration indique une activité en cours. |
| En attente | Une réponse utilisateur ou une autorisation est nécessaire. |
| Terminé | L’activité suivie est terminée. |
| En erreur | L’activité a rencontré une erreur identifiée. |
| Inconnu | L’état ne peut pas être déterminé de manière fiable. |

- Résumer les besoins d’attention au niveau du workspace et les rendre repérables sur l’onglet concerné.
- Cliquer sur une activité ou une indication d’attention rejoint le workspace, l’onglet et le pane correspondants.
- Fournir des notifications discrètes et ciblées, notamment lors d’une demande d’intervention.
- Ne pas interrompre la saisie ni changer automatiquement de workspace à l’arrivée d’un état.
- Ne pas considérer un processus existant comme une preuve de travail effectif ou d’attente utilisateur.
- À la restauration d’une session, ne pas restaurer comme vivants les états des anciens processus.

**Conventions proposées.** Agréger le nombre d’attentes par workspace, éviter les notifications répétées pour le même événement et offrir l’accès au pane sans prise de focus forcée. Si plusieurs panes attendent, permettre de choisir la destination.

**À décider.** Mécanismes d’intégration Claude Code/Codex CLI, états détectables, notification native Windows ou interne, événements de fin/erreur à notifier et visibilité des attentes lorsque le panneau est masqué.

## 13. Sauvegarde, fermeture et restauration

### Données à retrouver

- Workspaces et onglets, noms et ordre.
- Dispositions de splits, orientations, proportions et panes actifs.
- Dossiers courants et shells utilisés.
- Texte des anciennes sessions avec distinction visuelle à la réouverture.
- Workspace et onglet actifs, largeur du panneau, panneau visible/replié et groupes dépliés/repliés.

**Retenu.** Sauvegarder automatiquement la disposition pendant l’utilisation, sans attendre une fermeture normale. À la réouverture, restaurer l’environnement visuel et créer des shells neufs. Ne pas réexécuter les anciennes commandes et ne pas conserver volontairement les agents ou serveurs en arrière-plan après fermeture.

Le texte restauré est accompagné d’un séparateur explicite, par exemple « Session restaurée — nouvelle session ». Un ancien affichage de serveur ou d’agent ne doit pas être présenté comme une activité encore en cours.

### Robustesse proposée

- Écritures atomiques et format versionné pour éviter une sauvegarde partiellement écrite.
- Sauvegardes différées et regroupées pour les redimensionnements, avec enregistrement final en fin d’interaction.
- Sauvegarde périodique du texte indépendante de la sauvegarde de disposition.
- En cas d’échec d’écriture, garder la session utilisable et signaler que les changements ne sont pas enregistrés.
- Si les données sont corrompues, conserver le fichier fautif pour récupération et ouvrir une session de secours plutôt que l’écraser silencieusement.
- Si un dossier a disparu, conserver le pane et demander ou proposer un dossier de repli avec indication locale.

**À décider.** Limites de lignes/octets, fréquence de sauvegarde du texte, fidélité de restitution des couleurs et applications plein écran, rétention des onglets fermés, politique de terminaison des processus enfants et éventuelle confirmation en cas d’activité en cours.

## 14. Configuration exportable

**Retenu.** La configuration doit être sauvegardable, exportable et versionnable. L’import doit permettre de retrouver les préférences sauvegardées.

**Convention proposée.** Séparer trois ensembles :

| Ensemble | Contenu |
| --- | --- |
| Préférences versionnables | Shells, chemins exécutables, paramètres, raccourcis, police, éditeur, dossier Projets et préférences visuelles. |
| État de session local | Workspaces, onglets, chemins courants, sélection et disposition. |
| Historique local | Texte terminal et éventuelles données nécessaires à la réouverture d’un onglet. |

L’export de préférences ne doit pas embarquer implicitement la sortie des terminaux. Un export volontaire de disposition peut être proposé séparément ; il contient alors des chemins locaux.

**Limite du POC.** Son export JSON contient principalement la disposition et les chemins, sans texte terminal. Il ne constitue pas encore le format complet de préférences de l’application finale.

**À décider.** Format JSON/TOML/autre, emplacement, versionnement du schéma, stratégie de migration et politique de fusion/remplacement à l’import. Une confirmation peut être justifiée avant le remplacement d’une disposition existante ; la réduction des popups ne supprime pas la nécessité de protéger une action destructive.

## 15. Architecture fonctionnelle proposée

Cette section décrit une séparation des responsabilités, sans choisir de framework ni de bibliothèque.

- **Interface** : navigation, édition inline, palette, arborescence et affichage des états.
- **Modèle de session** : identifiants stables, ownership des onglets/panes, arbre de splits et sélection.
- **Moteur de terminal** : rendu, entrées clavier, sélection et historique.
- **Gestionnaire de processus** : lancement des shells, communication avec les terminaux, redimensionnement et fermeture des processus associés.
- **Intégration shell** : obtention fiable du dossier courant et chargement de la configuration habituelle.
- **Services locaux** : dossiers de projets, presse-papiers, éditeur, explorateur et contexte Git.
- **Adaptateurs d’agents** : conversion des événements disponibles vers les états normalisés du produit.
- **Persistance** : préférences, état de session, historique, migrations et récupération.

Les déplacements et changements de présentation agissent sur le modèle et la visibilité, pas sur le cycle de vie des processus. Les identifiants servent à retrouver les éléments ; les noms servent à les présenter.

### Structure conceptuelle des données

| Objet | Champs conceptuels |
| --- | --- |
| Session | Version, liste ordonnée des workspaces, workspace actif, état du panneau. |
| Workspace | Identifiant, nom, onglets ordonnés, onglet actif, état déplié. |
| Onglet | Identifiant, nom affiché, nom manuel ou automatique, arbre de splits, pane actif. |
| Nœud split | Orientation, proportion, deux enfants ; ou référence à un pane pour une feuille. |
| Pane | Identifiant, profil de shell, dossier courant, référence à l’historique, état de session. |
| Activité | Identifiant, pane concerné, état, source, date de changement ; données de session vivante. |

**À décider.** Conteneur d’application Windows, moteur de rendu terminal, mécanisme de pseudo-terminal, distribution et mise à jour. Évaluer les candidats avec les vrais shells et outils avant de choisir la pile.

## 16. Qualité et accessibilité

Ces exigences sont des recommandations d’implémentation pour préserver les interactions retenues.

- Ne pas perdre une saisie lorsqu’on replie le panneau, déplie un workspace, renomme un autre élément ou redimensionne une zone.
- Maintenir une distinction entre sélection de texte dans un terminal, raccourcis de l’application et saisie dans les champs inline.
- Supporter la composition de texte ; Entrée pendant une composition ne doit pas valider prématurément un renommage.
- Exposer noms accessibles, états dépliés, sélection et relation entre menus et boutons.
- Conserver un focus visible et un ordre clavier cohérent ; éviter les pièges de focus.
- Limiter les rendus et écritures pendant les flux de sortie importants. Définir des budgets de performance avec une charge représentative avant validation technique.
- Afficher les noms, chemins et sorties comme des données ; ne pas les interpréter comme du code HTML.
- Valider les données importées avant de modifier la session courante.
- Traiter les chemins comme des arguments structurés lors des appels aux outils locaux, y compris avec espaces et caractères spéciaux.

## 17. Matrice de recette

Ces scénarios définissent les vérifications à effectuer sur l’application finale. Ils ne déclarent pas que le POC les satisfait tous.

| ID | Scénario | Résultat attendu |
| --- | --- | --- |
| R01 | Créer Perso avec trois dossiers différents. | Aucun dossier ou projet commun imposé. |
| R02 | Créer puis renommer un workspace inline ; tester Entrée, clic extérieur, Échap et nom vide. | Nom synchronisé, annulation correcte, aucun formulaire modal. |
| R03 | Clic gauche sur « + ». | PowerShell s’ouvre immédiatement dans le dossier actif. |
| R04 | Clic droit ou Maj + F10 sur « + », puis choix CMD/Git Bash au clavier. | Menu contextuel accessible et shell choisi réellement lancé. |
| R05 | Double-cliquer sur un onglet, saisir un nom, puis changer son contexte. | Nom manuel conservé dans la barre et le panneau. |
| R06 | Réordonner/transférer un onglet avec un processus et plusieurs panes. | Ordre mis à jour sans relancer les processus ni perdre la disposition. |
| R07 | Déplier/replier plusieurs workspaces et cliquer sur un onglet enfant. | Groupes indépendants et navigation vers le bon onglet. |
| R08 | Replier le panneau avec une commande terminal non soumise, puis le rouvrir. | Pleine largeur disponible ; saisie et largeur précédente conservées. |
| R09 | Créer des splits imbriqués, les redimensionner et changer de pane au clavier. | Dossiers hérités et disposition cohérente. |
| R10 | Ctrl + P, filtrage, flèches, Entrée, recherche sans résultat et Échap. | Navigation correcte, sélection visible sans bordure, aucun déclenchement accidentel. |
| R12 | Charger le vrai profil PowerShell et exécuter ses alias/fonctions. | Comportement conforme à la session PowerShell habituelle. |
| R13 | Changer de dossier avec cd puis une fonction ; ouvrir onglet et split. | Dossier courant réel hérité. |
| R14 | Ouvrir un outil interactif plein écran, redimensionner et utiliser les touches de contrôle. | Rendu et interactions corrects avec le moteur terminal. |
| R15 | Exécuter wtr et rmwt. | Fonctions disponibles et interface cohérente selon le contrat défini après inspection. |
| R16 | Sélectionner un dossier réel dans Projets. | Workspace ouvert avec terminal dans le bon dossier. |
| R17 | Actions contextuelles depuis deux panes dans des dossiers différents. | Éditeur, explorateur, chemin et branche ciblent le pane actif. |
| R18 | Déclencher une attente avec une intégration d’agent réelle. | Workspace/onglet signalés et accès au bon pane sans focus forcé. |
| R19 | Fermer puis rouvrir l’application. | Disposition et texte restaurés, séparation explicite, shells neufs, aucune ancienne commande rejouée. |
| R20 | Fermer l’application avec serveur et agent actifs. | Comportement de terminaison conforme à la politique définie, pas de maintien volontaire. |
| R21 | Interrompre l’application après modification de disposition. | Dernière sauvegarde automatique exploitable, fichier non partiellement écrit. |
| R22 | Restaurer avec dossier disparu ou shell indisponible. | État local compréhensible et solution de repli sans perte silencieuse. |
| R23 | Fermer puis rouvrir un onglet. | Données prévues restaurées avec processus neufs. |
| R24 | Export/import et import invalide. | Préférences récupérables ; aucune mutation si validation échoue. |
| R25 | Tester noms longs, espaces, accents, IME, mise à l’échelle Windows. | Interface lisible, saisie fiable, chemins correctement traités. |
| R26 | Inspecter onglets, workspaces et palette. | Pas de bordures de sélection colorées ; fond et focus restent lisibles. |

## 18. État du POC et écarts à combler

| Domaine | POC actuel | Application cible |
| --- | --- | --- |
| UI | Dock vert compact, arborescence, édition inline, menus et palette. | Reprendre la direction et fiabiliser l’ensemble des interactions. |
| Terminal | Commandes simulées dans des champs HTML. | Vrai shell et vrai terminal interactif. |
| Profil / worktrees | Aucun profil réel exécuté. | Charger le profil et vérifier wtr/rmwt. |
| Projets | Liste fictive. | Lecture du dossier configuré. |
| Agents | Attente et fin simulées. | Adaptateurs fiables, état inconnu sinon. |
| Actions locales | Certaines actions affichent un message explicatif. | Intégration éditeur/explorateur/Git réelle. |
| Sauvegarde | Stockage navigateur, 500 lignes par pane. | Persistance robuste avec limites définies. |
| Onglets fermés | Historique limité à la session du navigateur. | Rétention à décider. |
| Navigation palette | Commandes, workspaces et onglets. | Ajouter les panes comme destinations explicites. |
| Variantes du panneau | Styles exploratoires encore accessibles. | Arborescence par défaut ; sélecteur exploratoire non requis. |

Le POC est une référence de conception, pas une implémentation technique prête à servir de terminal réel.

## 19. Décisions restantes avant développement

1. Inspecter le profil PowerShell, wtr/rmwt et la configuration WezTerm Leader + F. **Fait :** voir `docs/inspection-environnement.md`.
2. Identifier les shells installés, l’éditeur, le dossier Projets et les agents utilisés. **Fait :** Windows PowerShell 5.1 par défaut, PowerShell 7/CMD/Git Bash disponibles, VS Code, `C:\\Files\\Projects`, Claude Code et Codex CLI.
3. Choisir et valider la pile Windows avec de vrais programmes terminal.
4. Fixer la fermeture du dernier onglet/pane et le cycle de vie des workspaces.
5. Définir terminaison des processus, sauvegarde du texte et récupération des sessions.
6. Confirmer les raccourcis Leader et leur coexistence avec les outils interactifs.
7. Finaliser schéma de configuration, export/import et séparation de l’historique.
8. Définir noms automatiques et règles de Git sans branche courante.
9. Choisir les intégrations Claude Code/Codex CLI, états et notifications disponibles.
10. Fixer les critères mesurables de performance et les versions de Windows prises en charge.

Ces décisions ne bloquent pas la compréhension du produit ; elles évitent de traiter un comportement accidentel du prototype comme une exigence validée.
