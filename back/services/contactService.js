const axios = require('axios');

class ContactService {
  constructor() {
    this.apiKey = process.env.BREVO_API_KEY;
    this.baseUrl = 'https://api.brevo.com/v3';
  }

  /**
   * Envoie un email de contact à l'admin
   */
  async sendContactEmail(contactData) {
    const { name, email, subject, message, phone } = contactData;

    const emailData = {
      to: [
        { email: process.env.ADMIN_EMAIL || 'tepitechcorp@gmail.com', name: 'Admin Solar Tech' },
        { email: process.env.ADDITIONAL_ADMIN_EMAIL || 'tepitechbuild@gmail.com', name: 'Admin Solar Tech Copy' }
      ],
      sender: {
        email: process.env.BREVO_SENDER_EMAIL || 'noreply@solartech.ma',
        name: 'Solar Tech Solutions'
      },
      subject: `Nouveau message de contact: ${subject}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #2c3e50; margin-bottom: 20px;">📬 Nouveau Message de Contact</h2>

            <div style="margin-bottom: 20px;">
              <strong style="color: #34495e;">De:</strong> ${name} &lt;${email}&gt;
            </div>

            ${phone ? `<div style="margin-bottom: 20px;">
              <strong style="color: #34495e;">Téléphone:</strong> ${phone}
            </div>` : ''}

            <div style="margin-bottom: 20px;">
              <strong style="color: #34495e;">Sujet:</strong> ${subject}
            </div>

            <div style="margin-bottom: 20px;">
              <strong style="color: #34495e;">Message:</strong>
            </div>

            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #3498db;">
              ${message.replace(/\n/g, '<br>')}
            </div>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ecf0f1;">

            <div style="color: #7f8c8d; font-size: 12px;">
              <p>📅 Reçu le: ${new Date().toLocaleString('fr-FR')}</p>
              <p>🏢 Solar Tech Solutions ERP</p>
            </div>
          </div>
        </div>
      `,
      replyTo: {
        email: email,
        name: name
      }
    };

    try {
      const response = await axios.post(`${this.baseUrl}/smtp/email`, emailData, {
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Email de contact envoyé à l\'admin:', response.data);
      return { success: true, messageId: response.data.messageId };
    } catch (error) {
      console.error('❌ Erreur envoi email contact:', error.response?.data || error.message);
      throw new Error('Erreur lors de l\'envoi du message');
    }
  }

  /**
   * Envoie un email de confirmation au client
   */
  async sendConfirmationEmail(contactData) {
    const { name, email, subject } = contactData;

    const emailData = {
      to: [{
        email: email,
        name: name
      }],
      sender: {
        email: process.env.BREVO_SENDER_EMAIL || 'noreply@solartech.ma',
        name: 'Solar Tech Solutions'
      },
      subject: '✅ Message reçu - Solar Tech Solutions',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #27ae60; margin-bottom: 20px;">✅ Message Bien Reçu !</h2>

            <p style="color: #34495e; font-size: 16px; line-height: 1.6;">
              Bonjour <strong>${name}</strong>,
            </p>

            <p style="color: #34495e; line-height: 1.6;">
              Nous avons bien reçu votre message concernant "<strong>${subject}</strong>".
            </p>

            <p style="color: #34495e; line-height: 1.6;">
              Notre équipe va étudier votre demande et vous répondra dans les plus brefs délais,
              généralement sous 24-48 heures ouvrées.
            </p>

            <div style="background: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin-top: 0;">📋 Récapitulatif de votre message</h3>
              <p style="margin: 5px 0;"><strong>Sujet:</strong> ${subject}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
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
              <p>📧 support@solartech.ma | 📱 +212-XXX-XXX-XXX</p>
              <p>🏢 Solar Tech Solutions - Votre partenaire solaire</p>
            </div>
          </div>
        </div>
      `
    };

    try {
      const response = await axios.post(`${this.baseUrl}/smtp/email`, emailData, {
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Email de confirmation envoyé au client:', response.data);
      return { success: true, messageId: response.data.messageId };
    } catch (error) {
      console.error('❌ Erreur envoi email confirmation:', error.response?.data || error.message);
      throw new Error('Erreur lors de l\'envoi de la confirmation');
    }
  }

  /**
   * Traite un message de contact complet
   */
  async processContactForm(contactData) {
    try {
      // Validation des données
      this.validateContactData(contactData);

      // Envoi à l'admin
      const adminResult = await this.sendContactEmail(contactData);

      // Envoi de confirmation au client
      const clientResult = await this.sendConfirmationEmail(contactData);

      return {
        success: true,
        message: 'Message envoyé avec succès',
        adminMessageId: adminResult.messageId,
        clientMessageId: clientResult.messageId
      };

    } catch (error) {
      console.error('❌ Erreur traitement formulaire contact:', error);
      throw error;
    }
  }

  /**
   * Validation des données du formulaire
   */
  validateContactData(data) {
    const { name, email, subject, message } = data;

    if (!name || name.trim().length < 2) {
      throw new Error('Le nom doit contenir au moins 2 caractères');
    }

    if (!email || !this.isValidEmail(email)) {
      throw new Error('Adresse email invalide');
    }

    if (!subject || subject.trim().length < 5) {
      throw new Error('Le sujet doit contenir au moins 5 caractères');
    }

    if (!message || message.trim().length < 10) {
      throw new Error('Le message doit contenir au moins 10 caractères');
    }

    // Validation téléphone optionnelle
    if (data.phone && !this.isValidPhone(data.phone)) {
      throw new Error('Numéro de téléphone invalide');
    }
  }

  /**
   * Validation email
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validation téléphone (format international simple)
   */
  isValidPhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }
}

module.exports = new ContactService();