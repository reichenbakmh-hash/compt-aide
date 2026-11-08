# Compt'Aide

Application d'apprentissage de la comptabilité française : parcours, leçons, cas, atelier pratique (facturation, saisie, balance, bilan, TVA, banque, FEC).

## Structure

- `public/` : le site (un fichier `index.html`)
- `functions/api/[[path]].js` : API Cloudflare Pages Functions (comptes, sessions, sauvegarde)
- `schema.sql` : tables de la base D1 (comptes, sessions, données, tentatives de connexion)
- `public/sw.js`, `manifest.webmanifest`, `_headers` : mode installable, hors ligne, en-têtes de sécurité

## Déploiement sur Cloudflare

1. Poussez ce dossier sur un dépôt GitHub.
2. Cloudflare : Workers & Pages > Create > Pages > Connect to Git. Build command : vide. Build output directory : `public`.
3. Storage & Databases > D1 > Create database, nom `comptaide-db`. Ouvrez sa console et exécutez le contenu de `schema.sql`.
4. Projet Pages > Settings > Bindings > Add > D1 database : variable `DB`, base `comptaide-db`. Faites-le pour Production, puis redéployez.
5. Assistant intelligent (facultatif) : Settings > Bindings > Add > Workers AI, variable `AI`. Sans cette liaison, l'assistant répond avec ses fiches intégrées.
6. Ouvrez le site, créez un compte, puis vérifiez dans la console D1 : `SELECT email, created FROM users;`.

Le fichier `schema.sql` peut être réexécuté sans risque après une mise à jour. L'application est installable (PWA) et se consulte hors ligne.
