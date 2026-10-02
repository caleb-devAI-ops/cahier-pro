# Hors ligne complet, inventaire et fournisseurs

## Résultat attendu
- Les reçus, achats et paiements déjà chargés restent consultables sans connexion.
- Les nouvelles ventes, achats et paiements restent en attente localement puis se synchronisent automatiquement dans l’ordre.
- Une page **Inventaire** permet de compter tous les produits, voir chaque écart et valider les corrections avec une trace complète.
- Chaque fournisseur possède une fiche avec ses coordonnées, ses achats, ses paiements et son reste dû.
- Le parcours reçu est vérifié de bout en bout : ouverture du PDF, impression, lecture du QR et ouverture du même reçu.

## Mise en œuvre
- Ajouter une base locale durable dans le navigateur pour les listes utiles et la file d’attente, avec repli automatique sur les dernières données disponibles lorsque le réseau est absent.
- Ajouter des bilans d’inventaire et leurs lignes dans la base en ligne, protégés par utilisateur, avec une validation unique qui corrige le stock et journalise chaque écart.
- Créer la page Inventaire et son historique, puis l’ajouter dans Plus.
- Créer la fiche fournisseur et relier chaque fournisseur de la liste à sa fiche.
- Ajouter une ouverture directe du PDF dans l’application pour faciliter le contrôle avant impression.

## Contrôles
- Vérifier les pages avec un vrai compte et de vraies données.
- Simuler la coupure réseau et confirmer que reçus, achats et paiements restent visibles.
- Réaliser un inventaire de test sans altérer silencieusement l’historique.
- Ouvrir et imprimer un reçu, décoder son QR, puis confirmer que le numéro et les informations correspondent exactement.
