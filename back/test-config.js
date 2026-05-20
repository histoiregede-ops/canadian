require('dotenv').config();

class BrevoTestService {
  constructor() {
    if (!process.env.BREVO_API_KEY || process.env.BREVO_API_KEY === 'votre_cle_api_brevo_ici') {
      console.log('❌ BREVO_API_KEY non configurée ou valeur par défaut détectée');
      console.log('   Veuillez configurer votre clé API Brevo dans le fichier .env');
      console.log('   1. Créez un compte sur https://app.brevo.com/');
      console.log('   2. Générez une clé API dans Paramètres > Clés API');
      console.log('   3. Ajoutez BREVO_API_KEY=votre_clé_dans_le_.env');
      process.exit(1);
    }

    console.log('✅ BREVO_API_KEY configurée');
    console.log('📧 Email admin:', process.env.ADMIN_EMAIL || 'tepitechcorp@gmail.com');
    console.log('📧 Email expéditeur:', process.env.BREVO_SENDER_EMAIL || 'noreply@solartech.ma');
  }

  /**
   * Test basique de configuration
   */
  testConfiguration() {
    console.log('\n🔧 Test de Configuration Brevo...\n');

    console.log('✅ Variables d\'environnement chargées:');
    console.log('   - BREVO_API_KEY: Configurée');
    console.log('   - ADMIN_EMAIL:', process.env.ADMIN_EMAIL || 'tepitechcorp@gmail.com');
    console.log('   - BREVO_SENDER_EMAIL:', process.env.BREVO_SENDER_EMAIL || 'noreply@solartech.ma');

    console.log('\n📋 Instructions pour finaliser la configuration:');
    console.log('1. Remplacez "votre_cle_api_brevo_ici" par votre vraie clé API');
    console.log('2. Vérifiez que votre domaine est validé sur Brevo');
    console.log('3. Testez avec un vrai email: node test-brevo.js --send-test');
    console.log('4. Démarrez le serveur: npm start');
    console.log('5. Testez le formulaire sur http://localhost:4200/contact');

    return true;
  }
}

// Exécution du test de configuration
const testService = new BrevoTestService();
testService.testConfiguration();