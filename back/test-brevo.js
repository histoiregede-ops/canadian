const { ApiClient, TransactionalEmailsApi } = require('@getbrevo/brevo');
require('dotenv').config();

class BrevoTestService {
  constructor() {
    if (!process.env.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY non configurée dans le fichier .env');
    }

    this.apiClient = ApiClient.instance;
    this.apiClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
    this.apiInstance = new TransactionalEmailsApi();
  }

  /**
   * Test basique de l'API Brevo
   */
  async testConnection() {
    console.log('🔧 Test de connexion à Brevo...\n');

    try {
      // Test de l'API avec un appel simple
      const account = await this.apiInstance.getAccount();
      console.log('✅ Connexion Brevo réussie !');
      console.log('📧 Email expéditeur:', account.email);
      console.log('🏢 Plan:', account.plan || 'Free');
      console.log('📊 Crédits restants:', account.credits || 'N/A');
      return true;
    } catch (error) {
      console.error('❌ Erreur de connexion Brevo:', error.response?.body || error.message);
      return false;
    }
  }

  /**
   * Test d'envoi d'email à l'admin
   */
  async testAdminEmail() {
    console.log('\n📧 Test d\'envoi d\'email à l\'admin...');

    const sendSmtpEmail = {
      to: [{
        email: process.env.ADMIN_EMAIL || 'tepitechcorp@gmail.com',
        name: 'Admin Solar Tech'
      }],
      sender: {
        email: process.env.BREVO_SENDER_EMAIL || 'noreply@solartech.ma',
        name: 'Solar Tech Solutions'
      },
      subject: '🧪 Test Email - Formulaire de Contact',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #3498db; margin-bottom: 20px;">🧪 Test du Formulaire de Contact</h2>

            <p style="color: #34495e; line-height: 1.6;">
              Cet email est un test automatique du système de formulaire de contact.
            </p>

            <div style="background: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin-top: 0;">✅ Configuration Réussie</h3>
              <ul style="color: #34495e;">
                <li>API Brevo fonctionnelle</li>
                <li>Email expéditeur configuré</li>
                <li>Email admin configuré</li>
                <li>Templates HTML opérationnels</li>
              </ul>
            </div>

            <p style="color: #34495e; line-height: 1.6;">
              Le système de formulaire de contact est maintenant prêt à recevoir des messages !
            </p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ecf0f1;">

            <div style="text-align: center; color: #7f8c8d; font-size: 12px;">
              <p>🚀 Solar Tech Solutions - Test Automatique</p>
              <p>Envoyé le: ${new Date().toLocaleString('fr-FR')}</p>
            </div>
          </div>
        </div>
      `
    };

    try {
      const result = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('✅ Email de test envoyé à l\'admin !');
      console.log('   📧 Destinataire:', process.env.ADMIN_EMAIL || 'tepitechcorp@gmail.com');
      console.log('   🆔 Message ID:', result.messageId);
      return result;
    } catch (error) {
      console.error('❌ Erreur envoi email test:', error.response?.body || error.message);
      throw error;
    }
  }

  /**
   * Test d'envoi d'email de confirmation au client
   */
  async testClientConfirmation() {
    console.log('\n📧 Test d\'envoi d\'email de confirmation au client...');

    const sendSmtpEmail = {
      to: [{
        email: process.env.ADMIN_EMAIL || 'tepitechcorp@gmail.com', // Test avec l'email admin
        name: 'Client Test'
      }],
      sender: {
        email: process.env.BREVO_SENDER_EMAIL || 'noreply@solartech.ma',
        name: 'Solar Tech Solutions'
      },
      subject: '✅ Message Bien Reçu - Solar Tech Solutions',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #27ae60; margin-bottom: 20px;">✅ Message Bien Reçu !</h2>

            <p style="color: #34495e; font-size: 16px; line-height: 1.6;">
              Bonjour <strong>Client Test</strong>,
            </p>

            <p style="color: #34495e; line-height: 1.6;">
              Nous avons bien reçu votre message de test concernant "<strong>Test Formulaire</strong>".
            </p>

            <p style="color: #34495e; line-height: 1.6;">
              Notre équipe va étudier votre demande et vous répondra dans les plus brefs délais,
              généralement sous 24-48 heures ouvrées.
            </p>

            <div style="background: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin-top: 0;">📋 Récapitulatif de votre message</h3>
              <p style="margin: 5px 0;"><strong>Sujet:</strong> Test Formulaire</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> test@client.com</p>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
            </div>

            <p style="color: #34495e; line-height: 1.6;">
              Si vous avez d'autres questions, n'hésitez pas à nous contacter.
            </p>

            <p style="color: #34495e; line-height: 1.6;">
              Cordialement,<br>
              <strong>L'équipe Solar Tech Solutions</strong>
            </p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ecf0f1;">

            <div style="text-align: center; color: #7f8c8d; font-size: 12px;">
              <p>📧 contact@solartech.ma | 📱 +212-XXX-XXX-XXX</p>
              <p>🏢 Solar Tech Solutions - Votre partenaire solaire</p>
            </div>
          </div>
        </div>
      `
    };

    try {
      const result = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('✅ Email de confirmation envoyé au client !');
      console.log('   📧 Destinataire:', process.env.ADMIN_EMAIL || 'tepitechcorp@gmail.com');
      console.log('   🆔 Message ID:', result.messageId);
      return result;
    } catch (error) {
      console.error('❌ Erreur envoi email confirmation:', error.response?.body || error.message);
      throw error;
    }
  }

  /**
   * Test complet du formulaire de contact
   */
  async testFullContactFlow() {
    console.log('🚀 Test Complet du Formulaire de Contact\n');

    try {
      // Test de connexion
      const connectionOk = await this.testConnection();
      if (!connectionOk) {
        throw new Error('Connexion Brevo échouée');
      }

      // Test email admin
      await this.testAdminEmail();

      // Test email client
      await this.testClientConfirmation();

      console.log('\n🎉 Tous les tests sont passés avec succès !');
      console.log('📋 Résumé:');
      console.log('   ✅ Connexion API Brevo');
      console.log('   ✅ Email admin envoyé');
      console.log('   ✅ Email confirmation client envoyé');
      console.log('   ✅ Templates HTML fonctionnels');
      console.log('\n🚀 Le formulaire de contact est prêt !');

    } catch (error) {
      console.error('\n❌ Échec du test complet:', error.message);
      console.log('\n🔧 Pour corriger:');
      console.log('1. Vérifiez votre clé API Brevo sur https://app.brevo.com/settings/keys/api');
      console.log('2. Assurez-vous que votre domaine est vérifié');
      console.log('3. Vérifiez vos crédits email (plan gratuit: 300 emails/mois)');
      process.exit(1);
    }
  }
}

// Exécution des tests
const testService = new BrevoTestService();
testService.testFullContactFlow();