# Refonte Produits, Unités, Stock et Production (par phases)

Le travail est trop large pour une seule passe fiable. Il sera livré en 4 phases ; chaque phase est testée de bout en bout avant la suivante. Aucune donnée ni fonctionnalité existante n'est supprimée (ventes, reçus, caisse, clôtures, retours, sauvegardes continuent de fonctionner).

## Phase 1 — Fondations : unités, conversions, coûts, nouveau formulaire
- Unités par défaut + unités personnalisées par utilisateur.
- Conversions définies par l'utilisateur (ex. 1 gallon = 128 oz), aucune valeur codée en dur ; message « Conversion inconnue… » si la relation manque.
- Produit enrichi : type (acheté, fabriqué, composé, matière première, service, autre), marque, sous-catégorie, code-barres, unité de référence, stock max, emplacement, stock réservé, prix gros/promo/minimum, coûts détaillés (transport, emballage, taxes, commission, main-d'œuvre, autres).
- Nouveau formulaire « Nouveau produit » en sections repliables, champs selon le type (service = pas de stock), résumé en temps réel : coût unitaire, prix, bénéfice, marge %, markup %, stock.
- Module de calcul central (conversions, coût de revient, marge vs markup) partagé par produit, vente, stock, production, tableau de bord.
- Tests : unités (1 gallon = 2 demi-gallons = 6 bidons + 8 oz), marge (120/200 → 80 HTG, 40 %, 66,67 %), service.

## Phase 2 — Formats, variantes et stock intelligent
- Variantes et formats (ex. Citron 20 oz / 64 oz / 128 oz) avec SKU, prix, coût hérité ou remplacé, marge et markup par format.
- Stock tenu dans l'unité de référence ; une vente de 2 demi-gallons retire 128 oz ; blocage si stock disponible insuffisant (option stock négatif conservée).
- Mouvements typés : achat, vente, production, transformation, retour, perte, casse, consommation personnelle, ajustement, transfert — avec quantité saisie, unité, quantité convertie, motif, lot.
- Transformation du stock (1 gallon → 6 bidons + reste) avec choix obligatoire du sort du reste ; consommation personnelle valorisée au coût.
- Tests : transformation + 8 oz consommés, suite achat/vente/perte/retour cohérente, stock insuffisant.

## Phase 3 — Production, recettes et rendement réel
- Recettes (matières premières, quantités, unités, coûts, fournisseur).
- Assistant de production en étapes : recette → coûts → lot → quantité réellement obtenue → formats → conditionnement → restes → résumé → validation.
- Équation obligatoire : produit = conditionné + reste + pertes + consommation + autres ; validation bloquée si écart.
- Lot : numéro, quantités théorique/réelle, coût total, coût par unité et par format, expiration ; diminue les matières, augmente le produit fini.
- Tests : recette multi-matières, 12 gallons théoriques vs réel différent, 62 bidons + 3 gallons + reste.

## Phase 4 — Inventaire physique, fournisseurs multiples, alertes, tableau de bord
- Inventaire physique (comptage, écart par produit, motif, ajustement tracé) — reprend le plan précédent.
- Plusieurs fournisseurs par produit avec prix comparés et fournisseur principal ; fiche fournisseur complète.
- Emplacements (boutique, dépôt…), alertes (faible, rupture, négatif, expiration, matière insuffisante).
- Tableau de bord : valeur du stock, pertes, consommations, productions, faibles marges.
- Le mode hors ligne amélioré et le parcours PDF → QR du plan précédent restent prévus après ces phases.

## Détails techniques
- Nouvelles tables : units, unit_conversions, product_variants, product_formats, supplier_products, recipes, recipe_items, production_batches, production_items, stock_transformations, locations ; colonnes ajoutées à products, sale_items et stock_movements (unit, quantity_ref, variant/format, lot). Toutes avec RLS par utilisateur.
- Opérations de stock via fonctions atomiques côté base (transform_stock, record_stock_movement, create_production_batch, finalize_inventory) ; create_sale étendue pour les formats sans casser l'existant.
- Logique métier dans src/lib (units.ts, costing.ts, inventory.ts, production.ts), jamais dans les écrans.
- Quantités en numeric sans arrondi interne ; arrondi seulement à l'affichage.
