# 📧 Configuration Gmail pour les Emails

## Étape 1 : Activer la vérification en 2 étapes
1. Allez sur https://myaccount.google.com/security
2. Dans "Connexion à Google", cliquez sur "Vérification en 2 étapes"
3. Suivez les instructions pour activer la 2FA

## Étape 2 : Générer un mot de passe d'application
1. Toujours dans "Vérification en 2 étapes"
2. En bas, cliquez sur "Mots de passe d'application"
3. Sélectionnez "Autre (nom personnalisé)" et nommez-le "Solar ERP"
4. Copiez le mot de passe généré (16 caractères)

## Étape 3 : Configurer les variables d'environnement
Remplacez dans votre fichier `.env` :
```env
EMAIL_USER=votre-email@gmail.com
EMAIL_PASS=mot-de-passe-application-16-caracteres
EMAIL_FROM=votre-email@gmail.com
```

## ⚠️ Important
- Utilisez le **mot de passe d'application**, PAS votre mot de passe normal
- Le mot de passe d'application n'a pas d'espaces
- Exemple : `abcd efgh ijkl mnop` → `abcdefghijklmnop`

---

# 📱 Configuration Twilio pour les SMS

## Étape 1 : Créer un compte Twilio
1. Allez sur https://www.twilio.com/try-twilio
2. Créez un compte gratuit
3. Vérifiez votre email et numéro de téléphone

## Étape 2 : Obtenir les clés API
1. Dans le dashboard Twilio, allez dans "Account" → "API keys & tokens"
2. Copiez votre :
   - **ACCOUNT SID** (commence par AC...)
   - **AUTH TOKEN** (32 caractères)

## Étape 3 : Obtenir un numéro de téléphone
1. Dans "Phone Numbers" → "Manage" → "Buy a number"
2. Achetez un numéro (coût ~$1/mois + crédits SMS)
3. Copiez le numéro (format : +1234567890)

## Étape 4 : Configurer les variables d'environnement
Remplacez dans votre fichier `.env` :
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

## 💰 Crédits SMS
- Le compte gratuit donne $15 de crédit
- Prix : ~$0.03 par SMS sortant (varie selon le pays)

---

# 🧪 Tester la Configuration

Après avoir configuré Gmail et Twilio, testez avec :

```bash
cd back
node test-notifications.js
```

Le script va :
- ✅ Vérifier la connexion email
- ✅ Envoyer un email de test
- ✅ Envoyer un SMS de test
- ✅ Afficher les erreurs détaillées

---

# 📧 Templates d'Emails Disponibles

Le système inclut des templates pour :

1. **Confirmation de commande**
2. **Notification d'expédition**
3. **Points de fidélité gagnés**
4. **Nouveaux messages**
5. **Promotions personnalisées**

---

# 🔧 Dépannage

## Email ne fonctionne pas
- Vérifiez que la 2FA est activée
- Utilisez le mot de passe d'application (pas le mot de passe normal)
- Vérifiez les paramètres de sécurité Gmail

## SMS ne fonctionne pas
- Vérifiez que l'ACCOUNT_SID commence par "AC"
- Assurez-vous d'avoir des crédits suffisants
- Vérifiez que le numéro est au format international (+...)

## Erreurs communes
- `535 Authentication failed` → Mauvais mot de passe
- `Invalid login` → 2FA pas activée ou mauvais mot de passe d'app
- `accountSid must start with AC` → ACCOUNT_SID incorrect