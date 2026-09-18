# Dock vert — POC HTML

Le panneau des workspaces utilise l’arborescence, direction retenue. Les sessions déjà sauvegardées adoptent ce style à leur prochaine ouverture, sans modifier les workspaces ou onglets.

Ouvrir `index.html` dans un navigateur récent. Aucun serveur ni installation requis. Les fichiers doivent rester ensemble.

Ce prototype valide l’interface et la gestion de disposition, pas un moteur de terminal. PowerShell, CMD, Git Bash, les fichiers, Git et les agents sont simulés. Aucune commande système n’est exécutée.

## Interactions

- Créer et renommer les workspaces ; créer et renommer les onglets (double-clic ou palette).
- Clic gauche sur le « + » des onglets : PowerShell. Clic droit : menu PowerShell / CMD / Git Bash. Le menu accepte les flèches, Entrée et Échap ; Maj + F10 sur le bouton l’ouvre aussi.
- Glisser un onglet sur un autre pour le réordonner, ou sur un workspace pour le transférer.
- Créer des splits imbriqués, les redimensionner avec leurs séparateurs, fermer des panes.
- Redimensionner le panneau droit ; les séparateurs fonctionnent aussi au clavier.
- Replier / afficher le panneau des workspaces avec le bouton en haut à droite ou la palette. Le choix est sauvegardé, la largeur conservée et les saisies en cours préservées.
- Déplier / replier chaque workspace avec sa flèche pour afficher ses onglets. Cliquer sur un onglet rejoint celui-ci ; les onglets peuvent aussi être glissés depuis cette liste. L’état déplié est mémorisé après modification.
- Réouvrir un onglet fermé pendant la session.
- Rechercher dans le texte ; Échap efface les résultats.
- Utiliser la palette via Ctrl + P (Ctrl + Maj + P fonctionne aussi), ou Ctrl + Espace puis P. Naviguer avec ↑ / ↓, valider avec Entrée et fermer avec Échap. La sélection revient au premier résultat après chaque modification de la recherche.
- Leader proposé : Ctrl + Espace, puis T (onglet), V/H (split), F (projets), W (workspace), flèches (pane précédent/suivant dans l’ordre de la disposition).
- Saisir `help` pour les commandes simulées. `agent` crée une attente ; une réponse termine l’activité fictive.
- Sauvegarde automatique dans le stockage local du navigateur, restauration du texte avec séparateur, export/import JSON sans historique terminal.

## Choix provisoires et limites

Le dernier onglet fermé est remplacé par un onglet vide pour garder le workspace utilisable. Le nouveau split hérite du shell actif. Ces choix restent à valider et ne modifient pas les spécifications.

La liste des projets est fictive. Le dossier par défaut est illustratif. L’ouverture d’un éditeur/explorateur et la détection de branche nécessitent une intégration native. Les notifications restent dans la page. Les onglets fermés ne sont restaurables que pendant la session. L’historique conservé est limité à 500 lignes par pane.

La persistance sous `file://` dépend du navigateur et de ses réglages. En cas d’échec, l’interface signale que la sauvegarde est indisponible. Copier le chemin utilise le presse-papiers du navigateur avec repli vers un champ sélectionnable. Les réglages exportés contiennent les chemins de dossiers et la disposition, mais pas le texte des terminaux.

Pour passer à une application utilisable : choisir un conteneur Windows et un moteur de terminal/PTY, connecter les shells et le profil réel, puis intégrer la détection du dossier courant et les états des agents.
