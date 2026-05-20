# Formulaire de Contact - Solar Tech Solutions

## 📋 Description

Ce projet inclut un formulaire de contact complet intégré avec Brevo pour l'envoi d'emails transactionnels. Le système permet aux clients d'envoyer des messages qui sont automatiquement transmis à l'administrateur, avec une confirmation envoyée au client.

## 🚀 Fonctionnalités

- ✅ Formulaire de contact avec validation côté client et serveur
- ✅ Envoi d'email à l'admin (tepitechbuild@gmail.com)
- ✅ Email de confirmation automatique au client
- ✅ Protection contre le spam (rate limiting)
- ✅ Interface responsive et moderne
- ✅ Templates HTML professionnels pour les emails

## 🛠️ Installation et Configuration

### 1. Installation des dépendances

```bash
# Backend
cd back
npm install

# Frontend
cd ../front
npm install
```

### 2. Configuration Brevo

1. Créez un compte sur [Brevo](https://app.brevo.com/)
2. Générez une clé API dans les paramètres
3. Vérifiez votre domaine d'expéditeur
4. Copiez le fichier `.env.example` vers `.env` et configurez :

```env
BREVO_API_KEY=votre_cle_api_brevo_ici
BREVO_SENDER_EMAIL=noreply@solartech.ma
ADMIN_EMAIL=tepitechbuild@gmail.com
```

### 3. Test de la configuration Brevo

```bash
cd back
node test-brevo.js
```

Ce script testera :
- La connexion à l'API Brevo
- L'envoi d'un email de test à l'admin
- L'envoi d'un email de confirmation au client

## 🚀 Démarrage

### Backend
```bash
cd back
npm start
# ou pour le développement
npm run dev
```

### Frontend
```bash
cd front
ng serve
```

Le frontend sera accessible sur `http://localhost:4200`

## 📧 Utilisation du Formulaire

1. Accédez à `/contact` dans votre application Angular
2. Remplissez le formulaire avec :
   - Nom complet
   - Email
   - Sujet
   - Message
3. Cliquez sur "Envoyer le Message"

### Flux automatique :
1. **Validation** : Le formulaire vérifie les données côté client et serveur
2. **Email Admin** : Un email détaillé est envoyé à `tepitechbuild@gmail.com`
3. **Confirmation Client** : Le client reçoit un email de confirmation
4. **Interface** : Un message de succès s'affiche à l'utilisateur

## 📁 Structure des Fichiers

### Backend
```
back/
├── services/
│   └── contactService.js      # Service d'envoi d'emails Brevo
├── routes/
│   └── contactRoutes.js       # Routes API pour le contact
├── test-brevo.js              # Script de test Brevo
└── .env.example               # Exemple de configuration
```

### Frontend
```
front/src/app/
├── services/
│   └── contact.ts             # Service Angular pour l'API
└── pages/contact/
    ├── contact.component.ts   # Logique du composant
    ├── contact.component.html # Template du formulaire
    └── contact.component.css  # Styles responsives
```

## 🔧 API Endpoints

### POST `/api/contact`
Envoie un message de contact.

**Body :**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Demande d'information",
  "message": "Contenu du message..."
}
```

**Réponse de succès :**
```json
{
  "success": true,
  "message": "Message envoyé avec succès"
}
```

**Réponse d'erreur :**
```json
{
  "success": false,
  "message": "Erreur de validation",
  "errors": ["Email requis", "Message trop court"]
}
```

## 🛡️ Sécurité et Validation

- **Rate Limiting** : Maximum 5 messages par heure par IP
- **Validation** : Email, longueur des champs, caractères spéciaux
- **Sanitisation** : Protection XSS et injection
- **CORS** : Configuration pour le frontend

## 🎨 Personnalisation

### Templates Email
Les templates HTML sont dans `back/services/contactService.js`. Vous pouvez les modifier pour :
- Changer le design
- Ajouter des informations supplémentaires
- Personnaliser les couleurs et la mise en page

### Styles Frontend
Le CSS est dans `front/src/app/pages/contact/contact.component.css`. Variables modifiables :
- Couleurs principales
- Espacement et dimensions
- Animations et transitions

## 🔍 Dépannage

### Erreur "API Key invalide"
- Vérifiez que votre clé API Brevo est correcte
- Assurez-vous que le compte Brevo est actif

### Erreur "Domaine non vérifié"
- Vérifiez votre domaine dans les paramètres Brevo
- Ajoutez les enregistrements DNS si nécessaire

### Emails non reçus
- Vérifiez le dossier spam
- Testez avec le script `test-brevo.js`
- Vérifiez vos crédits Brevo (300 emails gratuits/mois)

### Erreur de validation
- Vérifiez que tous les champs sont remplis
- Assurez-vous que l'email est au bon format
- Le message doit faire au moins 10 caractères

## 📞 Support

Pour toute question concernant le formulaire de contact :
- Email : tepitechbuild@gmail.com
- Documentation Brevo : https://developers.brevo.com/

---

**🚀 Solar Tech Solutions - Système de Contact Professionnel**