# Tableau de bord administrateur : à appliquer sur Cloudflare

## 1. Variable d'environnement
Pages > Settings > Variables and Secrets : `ADMIN_EMAIL` = e-mail du compte administrateur (production, et preview si utilisée).
`ADMIN_EMAILS` (liste) reste acceptée pour compatibilité.
Créez le compte administrateur dès que la variable est définie (de préférence avec Google) : l'inscription par mot de passe ne vérifie pas l'e-mail.

## 2. Migration D1 (base existante)
```
npx wrangler d1 execute <NOM_BASE> --remote --file=migrations/001_admin_dashboard.sql
```
Ajoute `users.last_seen`, les tables `activity` et `feedback`. À exécuter une seule fois (une seconde exécution échoue sur « duplicate column », sans effet).
Nouvelle base : exécuter `schema.sql` seul.

## 3. Déploiement
Redéployer le projet. Le cache hors ligne passe en `ca-v5` (Chart.js 4.4.1 et `dashboard.js` précachés).

## Notes
- Sans migration, l'application reste fonctionnelle ; seules les statistiques répondent « migration manquante » et les avis sont refusés.
- Utilisateur actif : constante `ACTIVE_DAYS` (30) dans `lib/stats.js`.
- `GET /api/admin/stats?period=7|30|90|365`, `POST /api/feedback`.
