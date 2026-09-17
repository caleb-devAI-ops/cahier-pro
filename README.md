# Cahier Pro

CAHIER PRO — APPLICATION DE GESTION COMMERCIALE



Construis une application complète de gestion commerciale appelée Cahier Pro.



Ce n'est pas une simple maquette. Je veux une application réellement fonctionnelle, avec une base de données persistante, des calculs automatiques, une interface responsive et une architecture propre.



L'application doit être conçue principalement pour un entrepreneur individuel qui veut remplacer son cahier de comptes papier par une application moderne et simple.



La devise par défaut est HTG (gourdes haïtiennes).



---



1. OBJECTIF PRINCIPAL



Cahier Pro doit permettre de gérer au même endroit :



- clients

- produits et services

- fournisseurs

- achats

- ventes

- paiements

- dettes clients

- dépenses

- caisse

- stock

- bénéfices

- rapports financiers

- reçus

- historique des opérations



L'utilisateur doit pouvoir comprendre sa situation financière sans avoir besoin de connaissances en comptabilité.



---



2. PRINCIPES DE L'APPLICATION



L'application doit respecter ces principes :



- simplicité

- rapidité

- exactitude des calculs

- données persistantes

- historique complet

- interface mobile-first

- sécurité

- aucune donnée importante ne doit être supprimée accidentellement

- toutes les opérations financières doivent être traçables



Ne jamais modifier silencieusement une ancienne transaction financière.



Lorsqu'une transaction doit être corrigée, utiliser une modification contrôlée, une annulation ou un retour afin de préserver l'historique.



---



3. DESIGN



Créer un design premium inspiré des principes des applications iOS modernes, sans copier directement l'interface propriétaire d'Apple.



Style visuel :



- minimaliste

- moderne

- professionnel

- beaucoup d'espace

- cartes arrondies

- typographie propre

- icônes simples

- hiérarchie visuelle claire

- animations discrètes

- boutons faciles à utiliser

- excellente expérience mobile

- mode clair

- mode sombre



L'application doit ressembler à une vraie application commerciale professionnelle, pas à un dashboard générique généré par IA.



Éviter les interfaces surchargées.



Utiliser une navigation mobile :



Accueil | Ventes | Clients | Produits | Plus



Ajouter un bouton + pour les actions rapides.



Le bouton + doit permettre :



- Nouvelle vente

- Nouveau client

- Nouveau produit

- Nouvelle dépense

- Nouveau paiement

- Nouvel achat



---



4. AUTHENTIFICATION



Créer un système de compte utilisateur.



Prévoir :



- inscription

- connexion

- déconnexion

- récupération du mot de passe

- changement du mot de passe

- profil utilisateur

- nom de l'entreprise



Chaque utilisateur doit uniquement accéder à ses propres données.



Ne jamais exposer les données d'un autre utilisateur.



---



5. TABLEAU DE BORD



L'écran d'accueil doit donner une vision immédiate de l'activité.



Afficher :



Aujourd'hui



- ventes

- argent encaissé

- dépenses

- bénéfice



Ce mois



- chiffre d'affaires

- coût des marchandises vendues

- dépenses

- bénéfice brut

- bénéfice net

- montant restant à recevoir



Afficher également :



- nombre de clients

- nombre de produits

- nombre de ventes

- produits presque épuisés

- clients ayant des dettes



Ajouter une section :



Transactions récentes



Afficher les dernières ventes, dépenses et paiements.



Ajouter des graphiques simples :



- ventes dans le temps

- bénéfice dans le temps

- dépenses par catégorie



Permettre de choisir :



- aujourd'hui

- 7 derniers jours

- ce mois

- mois précédent

- période personnalisée



---



6. CLIENTS



Créer une section complète de gestion des clients.



Informations :



- nom complet

- téléphone

- WhatsApp

- adresse facultative

- identifiant client automatique

- date de création

- note



Chaque client doit avoir une fiche détaillée.



Afficher :



- total des achats

- total payé

- montant restant

- nombre de transactions

- dernière transaction



Afficher son historique :



- ventes

- paiements

- dettes

- remboursements



Ajouter :



Ajouter un paiement



Lorsqu'un paiement est enregistré, le solde du client doit être automatiquement recalculé.



---



7. PRODUITS ET SERVICES



Créer une gestion complète des produits.



Champs :



- nom

- référence/SKU

- catégorie

- description

- prix d'achat

- prix de vente

- stock actuel

- stock minimum

- fournisseur

- unité

- statut



Calcul automatique :



Marge unitaire = prix de vente − prix d'achat



Afficher la marge en montant et éventuellement en pourcentage.



Pour les services qui n'ont pas de stock, permettre de désactiver la gestion du stock.



---



8. FOURNISSEURS



Créer une section fournisseurs.



Informations :



- nom

- téléphone

- WhatsApp

- adresse

- note



Afficher :



- achats effectués

- montant total acheté

- montant payé

- montant restant dû



---



9. ACHATS



Créer une fonction permettant d'enregistrer les achats de marchandises.



Une opération d'achat doit contenir :



- fournisseur

- produit

- quantité

- prix d'achat unitaire

- coût total

- date

- montant payé

- reste à payer

- mode de paiement

- note



Lorsqu'un achat est validé :



- augmenter le stock

- enregistrer le coût

- mettre à jour les dettes envers le fournisseur

- enregistrer la sortie d'argent si l'achat est payé



---



10. VENTES



Créer une interface extrêmement rapide pour créer une vente.



Étapes :



1. sélectionner le client

2. sélectionner le produit/service

3. indiquer la quantité

4. afficher automatiquement le prix

5. permettre une remise

6. calculer le total

7. indiquer le montant payé

8. calculer le reste

9. choisir le mode de paiement

10. confirmer



Permettre plusieurs produits dans une même vente.



Calcul :



Sous-total = somme(prix × quantité)



Total = sous-total − remise



Reste à payer = total − montant payé



Coût des marchandises = somme(prix d'achat × quantité)



Marge brute = total − coût des marchandises



Après validation :



- diminuer le stock

- enregistrer la vente

- enregistrer le paiement

- mettre à jour la dette du client

- mettre à jour la caisse

- calculer le bénéfice



Générer automatiquement un numéro unique de vente.



Exemple :



VTE-2026-000001



---



11. PAIEMENTS



Créer une gestion séparée des paiements.



Un paiement doit contenir :



- numéro unique

- client ou fournisseur

- transaction concernée

- montant

- date

- méthode

- note



Méthodes :



- espèces

- transfert

- paiement mobile

- autre



Un paiement partiel doit être possible.



Le système doit empêcher qu'un paiement dépasse le montant restant sans confirmation explicite.



---



12. DETTES CLIENTS



Créer une page :



À recevoir



Afficher :



- client

- montant total

- montant payé

- solde

- date de vente

- dernier paiement

- statut



Statuts :



- payé

- partiellement payé

- impayé



Permettre d'enregistrer un paiement directement depuis cette page.



---



13. DETTES FOURNISSEURS



Créer une page :



À payer



Afficher :



- fournisseur

- montant total

- montant payé

- solde

- date

- statut



Permettre d'enregistrer les paiements aux fournisseurs.



---



14. DÉPENSES



Créer une gestion complète des dépenses.



Champs :



- numéro

- description

- catégorie

- montant

- date

- méthode de paiement

- note



Catégories :



- transport

- internet

- électricité

- matériel

- marketing

- salaire

- loyer

- emballage

- entretien

- autres



Une dépense doit diminuer la caisse si elle est payée immédiatement.



---



15. CAISSE



Créer une section de caisse.



Formule :



Solde final = solde initial + entrées − sorties



Les entrées peuvent venir de :



- ventes

- paiements de dettes

- autres revenus



Les sorties peuvent venir de :



- achats

- dépenses

- paiements fournisseurs

- retraits



Chaque mouvement doit avoir :



- numéro

- date

- type

- montant

- description

- référence liée



Prévoir une fonction de clôture de caisse quotidienne.



---



16. STOCK



Le stock doit être automatiquement synchronisé avec les achats et ventes.



Formule :



Stock actuel = stock initial + achats − ventes + retours



Afficher :



- stock actuel

- stock minimum

- stock faible

- rupture de stock



Créer des alertes lorsque :



stock actuel ≤ stock minimum



Ne jamais permettre une vente supérieure au stock disponible sans confirmation explicite.



---



17. RETOURS ET ANNULATIONS



Créer une fonction de retour.



Lorsqu'une vente est retournée :



- remettre les produits en stock

- recalculer les chiffres

- recalculer le bénéfice

- enregistrer le remboursement éventuel

- conserver la vente originale dans l'historique



Ne pas supprimer définitivement la transaction originale.



Ajouter un statut :



Annulée / Retournée



---



18. CALCULS FINANCIERS



Utiliser des définitions précises.



Chiffre d'affaires



Somme des ventes validées, hors transactions annulées.



Coût des marchandises vendues



Somme :



prix d'achat × quantité vendue



Marge brute



Chiffre d'affaires − coût des marchandises vendues



Bénéfice net



Marge brute − dépenses professionnelles



Créances clients



total des ventes à crédit − paiements reçus



Dettes fournisseurs



total des achats à crédit − paiements effectués



Solde de caisse



solde initial + entrées − sorties



Ces définitions doivent être utilisées partout dans l'application afin d'éviter des chiffres contradictoires.



---



19. RAPPORTS



Créer une section Rapports.



Filtres :



- aujourd'hui

- cette semaine

- ce mois

- mois précédent

- période personnalisée



Rapports :



- chiffre d'affaires

- bénéfice brut

- bénéfice net

- dépenses

- ventes

- achats

- paiements

- créances

- dettes fournisseurs

- mouvements de caisse

- produits vendus

- produits les plus rentables



Permettre l'export :



- PDF

- CSV

- Excel



---



20. REÇUS



Après chaque vente, proposer :



Voir le reçu



Le reçu doit contenir :



- nom de l'entreprise

- numéro de vente

- date

- client

- produits

- quantités

- prix

- total

- montant payé

- reste

- mode de paiement



Ajouter des boutons :



- imprimer

- télécharger

- partager



Le reçu doit être propre et adapté à un téléphone.



---



21. RECHERCHE



Créer une recherche globale.



Rechercher :



- clients

- produits

- ventes

- paiements

- dépenses

- achats



Ajouter filtres et tri.



---



22. HISTORIQUE



Créer un historique complet.



Chaque opération doit enregistrer :



- type

- date

- heure

- montant

- utilisateur

- référence

- statut



Préserver l'historique des opérations financières.



Si une opération est corrigée, conserver une trace de la modification.



---



23. NOTIFICATIONS



Créer des alertes pour :



- stock faible

- stock épuisé

- dette client

- paiement en retard

- dette fournisseur

- activité inhabituelle ou erreur de saisie



Les notifications doivent rester discrètes et ne pas surcharger l'utilisateur.



---



24. SAUVEGARDE



Prévoir :



- sauvegarde automatique

- restauration

- export complet des données

- import CSV



L'utilisateur doit pouvoir récupérer ses données s'il change d'appareil.



---



25. HORS LIGNE



Si l'architecture choisie le permet, prévoir un mode hors ligne permettant au minimum :



- consulter les données déjà chargées

- enregistrer des transactions

- synchroniser automatiquement lorsque la connexion revient



Si le véritable mode hors ligne complet n'est pas possible dans la première version, construire l'architecture pour pouvoir l'ajouter ultérieurement.



---



26. PARAMÈTRES



Créer :



Profil



- nom

- entreprise

- téléphone

- logo



Préférences



- devise

- format de date

- thème

- notifications



Données



- exporter

- importer

- sauvegarder

- restaurer



Sécurité



- mot de passe

- déconnexion

- gestion de session



---



27. BASE DE DONNÉES



Créer une structure de données relationnelle propre avec au minimum :



- Users

- Customers

- Products

- Suppliers

- Sales

- SaleItems

- Payments

- Purchases

- PurchaseItems

- Expenses

- CashTransactions

- StockMovements

- Returns

- ReturnItems



Chaque table doit avoir des identifiants uniques et des relations cohérentes.



Ne pas stocker inutilement les mêmes informations à plusieurs endroits.



---



28. RÈGLES IMPORTANTES



Les calculs financiers doivent être effectués de manière fiable.



Utiliser des valeurs numériques adaptées aux montants monétaires et éviter les erreurs classiques d'arrondi.



Toujours afficher les montants avec deux décimales lorsque nécessaire.



Utiliser HTG comme devise par défaut.



Les dates doivent être enregistrées correctement et affichées selon le fuseau horaire de l'utilisateur.



Toutes les transactions doivent avoir un identifiant unique.



Ne jamais perdre les données après un rafraîchissement de la page.



---



29. ÉTATS DE L'INTERFACE



Prévoir des interfaces pour :



- chargement

- aucune donnée

- erreur

- succès

- confirmation

- formulaire incomplet

- recherche sans résultat



Exemple :



Si aucun client n'existe :



Afficher une interface claire avec :



Aucun client pour le moment



et un bouton :



Ajouter mon premier client



---



30. RESPONSIVE DESIGN



L'application doit être conçue en priorité pour smartphone.



Elle doit également fonctionner correctement sur :



- smartphone

- tablette

- ordinateur



Sur mobile, privilégier :



- navigation inférieure

- boutons facilement accessibles au pouce

- formulaires courts

- grandes zones tactiles

- informations essentielles visibles immédiatement



---



31. TESTS



Avant de considérer l'application comme terminée, créer et tester plusieurs scénarios.



Test 1



Produit acheté 100 HTG.



Vendu 150 HTG.



Quantité : 2.



Vérifier :



- chiffre d'affaires = 300 HTG

- coût = 200 HTG

- marge brute = 100 HTG



Test 2



Vente de 500 HTG.



Client paie 300 HTG.



Vérifier :



- payé = 300

- restant = 200

- créance client = 200



Test 3



Dépense de 100 HTG.



Vérifier la diminution de la caisse et du bénéfice net.



Test 4



Achat de 10 unités.



Vérifier que le stock augmente de 10.



Test 5



Vente de 3 unités.



Vérifier que le stock diminue de 3.



Test 6



Retour d'une unité.



Vérifier :



- stock +1

- chiffres financiers recalculés

- historique conservé



Test 7



Plusieurs produits dans une même vente.



Vérifier tous les totaux.



Test 8



Paiement partiel puis paiement final.



Vérifier que la dette passe progressivement à zéro.



---



32. ARCHITECTURE



Utiliser une architecture moderne adaptée à une application web.



Séparer clairement :



- interface utilisateur

- logique métier

- base de données

- authentification

- stockage

- calculs financiers



Ne pas mélanger les calculs financiers directement dans plusieurs composants de l'interface.



Créer une logique centralisée pour les calculs afin que le tableau de bord, les rapports et les fiches clients utilisent les mêmes données.



---



33. PRIORITÉ DE DÉVELOPPEMENT



Construire l'application par étapes.



Phase 1 — Fondations



- authentification

- base de données

- design

- navigation

- tableau de bord



Phase 2 — Commerce



- clients

- produits

- ventes

- paiements



Phase 3 — Finance



- dépenses

- caisse

- dettes

- bénéfices



Phase 4 — Stock



- achats

- fournisseurs

- mouvements de stock

- alertes



Phase 5 — Professionnalisation



- rapports

- reçus

- exports

- retours

- historique avancé

- sauvegarde



Phase 6 — Optimisation



- mode sombre

- responsive

- performance

- accessibilité

- mode hors ligne si possible

- tests complets



---



34. RÈGLE FINALE



Ne pas essayer de tout construire dans un seul composant ou une seule page.



Construire une véritable application modulaire.



Après chaque phase, vérifier que les fonctionnalités précédentes continuent de fonctionner.



Ne jamais remplacer une fonctionnalité fonctionnelle par une fausse maquette.



Si une fonctionnalité n'est pas encore implémentée, afficher clairement son état plutôt que de simuler un résultat.



Avant de terminer, effectuer un contrôle général de :



- sécurité

- calculs

- base de données

- responsive design

- navigation

- performances

- persistance des données

- cohérence des rapports

- gestion des erreurs



Le résultat final doit être une application de gestion commerciale simple à utiliser, professionnelle et suffisamment solide pour gérer une véritable petite activité. Si tu ne peux pas le faire complètement et fonctionnel sans bug glitch et autres problèmes du premier coup fais le étapes par étapes.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b4539bad-23e7-4aed-8286-b8e83e246055).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
