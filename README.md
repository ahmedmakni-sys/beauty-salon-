# Beauty Salon — gestion de la fidélité

Application web (React + Vite + Tailwind + Supabase) pour un seul administrateur de salon : clients, visites, cartes de fidélité, récompenses.

## Démarrer

```bash
npm install
npm run dev
```

Puis ouvrez http://localhost:5173.

Tant que Supabase n'est pas configuré, l'application affiche un écran « Base de données non configurée ». C'est normal.

## Configurer Supabase

1. Créez un projet sur https://supabase.com.
2. **Exécutez les migrations**, dans l'ordre, dans *SQL Editor* :
   - `supabase/migrations/20261120000001_schema.sql`
   - `supabase/migrations/20261120000002_security_and_loyalty.sql`
   (Ou avec la CLI : `supabase link` puis `supabase db push`.)
3. **Désactivez les inscriptions publiques** : *Authentication > Sign In / Providers* : décochez « Allow new users to sign up ».
4. **Copiez `.env.example` en `.env.local`** et remplissez :
   - `VITE_SUPABASE_URL` : *Project Settings > API > Project URL*
   - `VITE_SUPABASE_ANON_KEY` : clé **anon / publishable** (jamais la clé `service_role`)
5. Redémarrez `npm run dev`.

## Créer le compte administrateur

1. *Authentication > Users > Add user > Create new user* : e-mail + mot de passe, cochez « Auto Confirm User ».
2. Ouvrez `supabase/create_admin.sql`, remplacez `admin@exemple.tn` par cet e-mail, exécutez-le dans *SQL Editor*.
3. Connectez-vous dans l'application.

Un compte sans le rôle `admin` peut se connecter mais ne voit aucune donnée (bloqué par la base, pas seulement par l'interface).

## Règles de fidélité

Un cycle = 17 coupes :

| Coupe du cycle | Résultat |
|---|---|
| 1 à 5 | payée |
| 6 | remise de 10 DT |
| 7 à 16 | payée (10 coupes) |
| 17 | offerte, puis la carte repart à zéro (nouveau cycle) |

Le calcul est fait **dans PostgreSQL** par la fonction `register_visit()` :
- la ligne du client est verrouillée pendant l'enregistrement (deux clics simultanés sont traités l'un après l'autre) ;
- chaque confirmation porte une clé unique : renvoyer la même requête ne crée rien de plus ;
- contraintes uniques : une seule remise et une seule coupe offerte par cycle ;
- l'application ne peut ni insérer de visite/récompense directement, ni modifier les compteurs d'un client.

`src/lib/loyalty.js` reprend les mêmes règles uniquement pour l'affichage (aperçu avant confirmation).

## Tests

```bash
npm test          # règles de fidélité côté interface (Vitest)
```

Tests de la base (nécessite un PostgreSQL local et `psql`) :

```bash
createdb beauty_test
psql -d beauty_test -f supabase/tests/supabase_stub.sql
psql -d beauty_test -f supabase/migrations/20261120000001_schema.sql
psql -d beauty_test -f supabase/migrations/20261120000002_security_and_loyalty.sql
psql -d beauty_test -f supabase/tests/loyalty_test.sql
bash supabase/tests/concurrency_test.sh "dbname=beauty_test"
```

Couverts : 5 coupes sans récompense, 6e à exactement 10 DT, 10 coupes payées, 11e de l'étape 2 offerte une seule fois, remise à zéro, nouveau cycle, téléphones en double refusés (même écrit différemment), doubles soumissions et requêtes simultanées sans doublon, accès refusé aux non-admins et aux anonymes.

**Test manuel dans l'application** : créez un client, enregistrez 5 visites (payées), la 6e affiche « Remise de 10 DT appliquée », continuez jusqu'à la 17e (« Coupe offerte ») : la carte revient à zéro, cycle 2.

## Structure

```
public/images/barbershop-interior.png   photo du salon (connexion + accueil)
supabase/migrations/                    tables, RLS, fonctions
supabase/create_admin.sql               donner le rôle admin
supabase/tests/                         tests SQL
src/lib/        supabase.js, api.js, loyalty.js, format.js, csv.js
src/context/    AuthContext (session persistante), ToastContext
src/components/ AppLayout, LoyaltyCard, ConfirmDialog, ClientForm…
src/pages/      Login, Dashboard, Customers, CustomerNew, CustomerEdit,
                CustomerDetails, RegisterVisit, Visits, Rewards, Settings, NotFound
```

## Avant la mise en ligne

- Héberger le site (Vercel, Netlify…) avec les deux variables `VITE_…` et une règle de réécriture vers `index.html` (routes React).
- Ajouter l'URL du site dans *Authentication > URL Configuration*.
- Choisir un mot de passe admin fort ; activer la sauvegarde de la base.
- Prévoir une procédure pour annuler une visite saisie par erreur (non incluse : à faire en SQL par l'administrateur pour l'instant).
- Optionnel : convertir la photo en WebP pour un chargement plus rapide.

## Carte client (lien secret et QR code)

Chaque client a une carte en lecture seule à l'adresse `/carte/<code>`, où le code est aléatoire et impossible à deviner.

- **Installation :** exécutez aussi `supabase/migrations/20261120000003_client_card.sql` dans le SQL Editor. Les clients existants reçoivent automatiquement leur lien.
- **Côté admin :** fiche client, bouton « Carte du client ». Il affiche le QR code, permet de copier le lien, de l'envoyer sur WhatsApp, d'imprimer une carte au format carte de visite, ou de créer un nouveau lien (l'ancien cesse alors de fonctionner).
- **Côté client :** prénom, statut (Nouveau client, Habitué après 1 cycle, Membre or après 3 cycles), tampons, rappel après 21 jours sans visite, bouton « Réserver sur WhatsApp » (si le téléphone du salon est renseigné dans les Paramètres).
- **Rien de privé n'est exposé :** pas de nom de famille, de téléphone, de notes, ni d'autres clients.
- **En local**, le QR code pointe vers `localhost` : il ne s'ouvre sur un téléphone qu'une fois le site en ligne.

Test SQL : `psql -d beauty_test -f supabase/tests/client_card_test.sql` (après les autres tests).
