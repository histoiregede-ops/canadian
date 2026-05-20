const nodemailer = require('nodemailer');
const twilio = require('twilio');

class NotificationService {
  constructor() {
    // Email configuration
    this.emailTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // SMS configuration (Twilio)
    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
  }

  // Send order confirmation email
  async sendOrderConfirmation(customer, order) {
    try {
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: customer.email,
        subject: 'Confirmation de commande - Solar Tech Solutions',
        html: this.generateOrderConfirmationHTML(customer, order)
      };

      await this.emailTransporter.sendMail(mailOptions);
      console.log(`Order confirmation email sent to ${customer.email}`);
    } catch (error) {
      console.error('Error sending order confirmation email:', error);
    }
  }

  // Send order confirmation SMS
  async sendOrderConfirmationSMS(customer, order) {
    try {
      if (!customer.phone) return;

      const message = `Bonjour ${customer.name}, votre commande #${order.id} a été confirmée. Total: ${order.total}€. Merci pour votre confiance!`;

      await this.twilioClient.messages.create({
        body: message,
        from: this.twilioPhoneNumber,
        to: customer.phone
      });

      console.log(`Order confirmation SMS sent to ${customer.phone}`);
    } catch (error) {
      console.error('Error sending order confirmation SMS:', error);
    }
  }

  // Send shipping notification
  async sendShippingNotification(customer, order) {
    try {
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: customer.email,
        subject: 'Votre commande est en cours de livraison',
        html: this.generateShippingNotificationHTML(customer, order)
      };

      await this.emailTransporter.sendMail(mailOptions);

      // SMS notification
      if (customer.phone) {
        const message = `Votre commande #${order.id} est en cours de livraison. Suivez-la sur votre dashboard client.`;
        await this.twilioClient.messages.create({
          body: message,
          from: this.twilioPhoneNumber,
          to: customer.phone
        });
      }

      console.log(`Shipping notification sent to ${customer.email}`);
    } catch (error) {
      console.error('Error sending shipping notification:', error);
    }
  }

  // Send loyalty points notification
  async sendLoyaltyPointsNotification(customer, points, reason) {
    try {
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: customer.email,
        subject: 'Points de fidélité gagnés !',
        html: this.generateLoyaltyPointsHTML(customer, points, reason)
      };

      await this.emailTransporter.sendMail(mailOptions);

      // SMS notification
      if (customer.phone) {
        const message = `Félicitations ! Vous avez gagné ${points} points de fidélité. Total: ${customer.points} points.`;
        await this.twilioClient.messages.create({
          body: message,
          from: this.twilioPhoneNumber,
          to: customer.phone
        });
      }

      console.log(`Loyalty points notification sent to ${customer.email}`);
    } catch (error) {
      console.error('Error sending loyalty points notification:', error);
    }
  }

  // Send promotional email
  async sendPromotionalEmail(customer, promotion) {
    try {
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: customer.email,
        subject: promotion.title,
        html: this.generatePromotionHTML(customer, promotion)
      };

      await this.emailTransporter.sendMail(mailOptions);
      console.log(`Promotional email sent to ${customer.email}`);
    } catch (error) {
      console.error('Error sending promotional email:', error);
    }
  }

  // Send new message notification
  async sendNewMessageNotification(customer, message) {
    try {
      // SMS notification for new messages
      if (customer.phone) {
        const sender = message.senderRole === 'admin' ? 'Support' : message.senderName;
        const notificationMessage = `Nouveau message de ${sender}: ${message.content.substring(0, 50)}...`;

        await this.twilioClient.messages.create({
          body: notificationMessage,
          from: this.twilioPhoneNumber,
          to: customer.phone
        });
      }

      console.log(`New message notification sent to ${customer.phone || customer.email}`);
    } catch (error) {
      console.error('Error sending new message notification:', error);
    }
  }

  // Generate HTML templates
  generateOrderConfirmationHTML(customer, order) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2c3e50;">Confirmation de commande</h1>
        <p>Bonjour ${customer.name},</p>
        <p>Votre commande a été confirmée avec succès !</p>

        <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h3>Détails de la commande #${order.id}</h3>
          <p><strong>Total:</strong> ${order.total}€</p>
          <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString('fr-FR')}</p>
          <p><strong>Statut:</strong> ${order.status}</p>
        </div>

        <p>Vous pouvez suivre votre commande depuis votre <a href="${process.env.FRONTEND_URL}/dashboard">dashboard client</a>.</p>

        <p>Merci pour votre confiance !</p>
        <p>L'équipe Solar Tech Solutions</p>
      </div>
    `;
  }

  generateShippingNotificationHTML(customer, order) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2c3e50;">Votre commande est en route !</h1>
        <p>Bonjour ${customer.name},</p>
        <p>Bonne nouvelle ! Votre commande #${order.id} est en cours de livraison.</p>

        <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h3>Informations de livraison</h3>
          <p><strong>Transporteur:</strong> ${order.shipping?.carrier || 'À définir'}</p>
          <p><strong>Numéro de suivi:</strong> ${order.shipping?.trackingNumber || 'À venir'}</p>
        </div>

        <p>Suivez votre colis en temps réel depuis votre <a href="${process.env.FRONTEND_URL}/dashboard">dashboard client</a>.</p>

        <p>Cordialement,</p>
        <p>L'équipe Solar Tech Solutions</p>
      </div>
    `;
  }

  generateLoyaltyPointsHTML(customer, points, reason) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2c3e50;">🎉 Félicitations !</h1>
        <p>Bonjour ${customer.name},</p>
        <p>Vous avez gagné <strong>${points} points de fidélité</strong> !</p>

        <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h3>Vos points de fidélité</h3>
          <p><strong>Points gagnés:</strong> ${points}</p>
          <p><strong>Total actuel:</strong> ${customer.points} points</p>
          <p><strong>Niveau:</strong> ${customer.loyaltyLevel}</p>
          <p><strong>Raison:</strong> ${reason}</p>
        </div>

        <p>Continuez vos achats pour monter en niveau et bénéficier d'avantages exclusifs !</p>

        <p>À bientôt,</p>
        <p>L'équipe Solar Tech Solutions</p>
      </div>
    `;
  }

  generatePromotionHTML(customer, promotion) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2c3e50;">${promotion.title}</h1>
        <p>Bonjour ${customer.name},</p>

        <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px;">
          ${promotion.content}
        </div>

        <p>Découvrez nos offres spéciales sur <a href="${process.env.FRONTEND_URL}/shop">notre boutique</a>.</p>

        <p>Cordialement,</p>
        <p>L'équipe Solar Tech Solutions</p>
      </div>
    `;
  }
}

module.exports = new NotificationService();