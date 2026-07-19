# CANADA — Solar ERP

ERP complet pour la gestion d'une entreprise de solutions solaires et électroniques.

## Stack

- **Frontend** : Angular 21 (standalone components, Chart.js, jsPDF)
- **Backend** : Node.js / Express + Sequelize + SQLite
- **Temps réel** : WebSocket (messagerie, notifications)
- **Paiement** : PawaPay (Mobile Money), espèces, carte
- **Notifications** : Email (SMTP / Brevo) + SMS (Twilio)

## Modules

- Catalogue & Stock, Catégories, Ventes (POS), Clients, Commandes
- Réparations, Installations, Techniciens
- Caisse & Finance, Rapports
- Messagerie temps réel, Support client
- Boutique en ligne, Panier, Paiement
- Dashboard client (fidélité, historique commandes, suivi)
- Avis produits, Notifications

## Démarrer

### Backend
```
cd back
npm install
cp .env.example .env   # Configurer les variables
npm start               # Port 3000
```

### Frontend
```
cd front
npm install
npm start               # Port 4200
```

## Seeders

```bash
cd back
npx sequelize-cli db:seed:all
npx sequelize-cli db:migrate
```
