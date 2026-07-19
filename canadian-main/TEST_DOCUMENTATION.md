# Tests et Documentation - Canadian Solar ERP

## Documentation Swagger

La documentation API Swagger est disponible sur :
```
http://localhost:3000/api-docs
```

### Fichiers de configuration Swagger

- `back/swagger.json` - Définition OpenAPI 3.0 complète de tous les endpoints
- `back/index.js` - Configuration et servir de Swagger UI

### Endpoints documentés

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/login` | Connexion utilisateur |
| POST | `/api/auth/register` | Création utilisateur (admin) |
| GET | `/api/users` | Liste des utilisateurs |
| GET | `/api/products` | Liste des produits |
| POST | `/api/products` | Créer un produit |
| GET | `/api/products/:id` | Récupérer un produit |
| PUT | `/api/products/:id` | Mettre à jour un produit |
| DELETE | `/api/products/:id` | Supprimer un produit |
| GET | `/api/categories` | Liste des catégories |
| POST | `/api/categories` | Créer une catégorie |
| GET | `/api/suppliers` | Liste des fournisseurs |
| POST | `/api/suppliers` | Créer un fournisseur |
| GET | `/api/customers` | Liste des clients |
| GET | `/api/orders` | Liste des commandes |
| POST | `/api/orders` | Créer une commande |
| GET | `/api/repairs` | Liste des réparations |
| POST | `/api/repairs` | Créer une réparation |
| GET | `/api/installations` | Liste des installations |
| GET | `/api/finance/transactions` | Liste des transactions |
| POST | `/api/finance/transactions` | Créer une transaction |
| GET | `/api/stats/dashboard` | Statistiques dashboard |
| GET | `/api/notifications` | Liste des notifications |
| GET | `/api/config/payment-methods` | Méthodes de paiement |

---

## Tests Backend

### Installation des dépendances

```bash
cd back
npm install
```

### Scripts de test disponibles

```bash
# Test de chargement des routes (existant)
npm test

# Tests Jest (unitaires + fonctionnels)
npm run test:jest

# Tous les tests
npm run test:all
```

### Structure des tests backend

```
back/tests/
├── setup.js                    # Configuration Jest
├── global-setup.js             # Setup global (connexion DB)
├── global-teardown.js          # Teardown global (déconnexion DB)
├── routes.test.js              # Test de chargement des routes (existant)
├── health.test.js              # Test de santé de l'API
├── auth.test.js                # Tests authentification
├── users.test.js               # Tests utilisateurs
├── products.test.js            # Tests produits
├── categories.test.js          # Tests catégories
├── suppliers.test.js           # Tests fournisseurs
├── customers.test.js           # Tests clients
├── orders.test.js              # Tests commandes
├── repairs.test.js             # Tests réparations
├── installations.test.js       # Tests installations
├── finance.test.js             # Tests finance
├── stats.test.js               # Tests statistiques
├── notifications.test.js       # Tests notifications
├── config.test.js              # Tests configuration
└── reports.test.js             # Tests rapports
```

### Exécution des tests

```bash
# Lancer tous les tests Jest
npm run test:jest

# Lancer un fichier de test spécifique
npx jest --config jest.config.js tests/auth.test.js

# Avec couverture
npx jest --config jest.config.js --coverage
```

### Tests fonctionnels inclus

Chaque fichier de test couvre :
- **GET** - Récupération de liste et détails
- **POST** - Création avec validation
- **PUT** - Mise à jour
- **DELETE** - Suppression
- **Authentification** - Vérification des tokens
- **Validation** - Tests des cas d'erreur

---

## Tests Frontend

### Installation des dépendances

```bash
cd front
npm install
```

### Scripts de test disponibles

```bash
# Tests unitaires avec Angular CLI/Karma
ng test

# Tests avec Vitest (si configuré)
npx vitest
```

### Structure des tests frontend

```
front/src/app/
├── services/
│   ├── auth.service.spec.ts           # Tests AuthService
│   ├── product.service.spec.ts        # Tests ProductService
│   ├── supplier.service.spec.ts       # Tests SupplierService
│   ├── category.service.spec.ts       # Tests CategoryService
│   ├── customer.service.spec.ts       # Tests CustomerService
│   ├── order.service.spec.ts          # Tests OrderService
│   ├── stats.service.spec.ts          # Tests StatsService
│   └── barcode.service.spec.ts        # Tests BarcodeService
├── components/
│   └── sidebar/
│       └── sidebar.component.spec.ts  # Tests SidebarComponent
└── pages/
    ├── login/
    │   └── login.component.spec.ts    # Tests LoginComponent
    ├── user-management/
    │   └── user-management.component.spec.ts  # Tests UserManagementComponent
    └── shop/
        └── shop.component.spec.ts     # Tests ShopComponent
```

### Exécution des tests frontend

```bash
# Lancer tous les tests
ng test

# Lancer un fichier spécifique
ng test --include='**/auth.service.spec.ts'
```

---

## Configuration Swagger

### Accès à la documentation

1. Démarrer le backend : `npm start`
2. Ouvrir : `http://localhost:3000/api-docs`

### Authentification dans Swagger

1. Cliquer sur le bouton **Authorize** en haut à droite
2. Entrer le token JWT (sans le préfixe `Bearer `)
3. Les endpoints sécurisés seront alors accessibles

### Génération du token de test

```bash
# Login avec curl
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## Schéma des modèles

### User
```json
{
  "id": "uuid",
  "username": "string",
  "fullName": "string",
  "email": "string",
  "role": "admin|seller|cashier|technician|delivery"
}
```

### Product
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "price": "decimal",
  "stockQuantity": "integer",
  "status": "available|out_of_stock|on_order",
  "barcode": "string",
  "categoryId": "uuid",
  "supplierId": "integer",
  "photo": "url"
}
```

### Category
```json
{
  "id": "uuid",
  "name": "string",
  "type": "solar|electronics|accessory|other"
}
```

### Supplier
```json
{
  "id": "integer",
  "name": "string",
  "contactName": "string",
  "email": "string",
  "phone": "string",
  "address": "string",
  "city": "string",
  "country": "string",
  "productTypes": "string",
  "isActive": "boolean"
}
```

### Customer
```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "phone": "string",
  "address": "string",
  "city": "string",
  "country": "string",
  "points": "integer",
  "loyaltyLevel": "bronze|silver|gold|platinum",
  "isActive": "boolean"
}
```

### Order
```json
{
  "id": "uuid",
  "orderNumber": "string",
  "customerId": "uuid",
  "subtotal": "decimal",
  "totalAmount": "decimal",
  "paidAmount": "decimal",
  "status": "pending|paid|partially_paid|cancelled|shipped|delivered",
  "paymentMethod": "string",
  "deliveryAddress": "string"
}
```

---

## Notes importantes

1. **Ne pas exécuter les tests automatiquement** - Les tests sont écrits mais pas lancés
2. **Base de données** - Les tests nécessitent une base de données MySQL ou SQLite configurée
3. **Tokens** - Les tests fonctionnels nécessitent un token JWT valide
4. **Swagger** - La documentation est automatiquement générée depuis les routes

---

## Dépannage

### Erreur de connexion à la base de données
Vérifier le fichier `.env` dans le dossier `back/`

### Erreur de token expiré
Se reconnecter via `/api/auth/login`

### Tests qui échouent
Vérifier que la base de données contient les données de seed :
```bash
npm run db:seed
```
