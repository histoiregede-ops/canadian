const nodemailer = require('nodemailer');
const twilio = require('twilio');
require('dotenv').config();

// Test Email Configuration
async function testEmail() {
  console.log('📧 Testing Email Configuration...');

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Verify connection
    await transporter.verify();
    console.log('✅ Email configuration is valid!');

    // Send test email
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_USER, // Send to yourself for testing
      subject: 'Test Email - Solar Tech ERP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">🧪 Test Email Réussi !</h2>
          <p>Votre configuration email fonctionne parfaitement.</p>
          <p><strong>Solar Tech Solutions ERP</strong></p>
          <p style="color: #7f8c8d; font-size: 12px;">Email envoyé le ${new Date().toLocaleString('fr-FR')}</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully!');
    console.log('   Message ID:', info.messageId);

  } catch (error) {
    console.error('❌ Email configuration failed:', error.message);
    console.log('\n🔧 Pour corriger:');
    console.log('1. Vérifiez vos identifiants Gmail');
    console.log('2. Assurez-vous d\'avoir activé la vérification en 2 étapes');
    console.log('3. Générez un "mot de passe d\'application"');
    console.log('4. Utilisez le mot de passe d\'application dans EMAIL_PASS');
  }
}

// Test SMS Configuration
async function testSMS() {
  console.log('\n📱 Testing SMS Configuration...');

  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    // Send test SMS
    const message = await client.messages.create({
      body: '🧪 Test SMS - Solar Tech ERP\nVotre configuration SMS fonctionne !\nEnvoyé le ' + new Date().toLocaleString('fr-FR'),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: process.env.TWILIO_PHONE_NUMBER // Send to yourself for testing
    });

    console.log('✅ Test SMS sent successfully!');
    console.log('   Message SID:', message.sid);
    console.log('   Status:', message.status);

  } catch (error) {
    console.error('❌ SMS configuration failed:', error.message);
    console.log('\n🔧 Pour corriger:');
    console.log('1. Vérifiez votre ACCOUNT_SID et AUTH_TOKEN Twilio');
    console.log('2. Assurez-vous que votre numéro Twilio est vérifié');
    console.log('3. Vérifiez que vous avez des crédits SMS suffisants');
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Email & SMS Configuration Tests\n');

  await testEmail();
  await testSMS();

  console.log('\n✨ Tests terminés !');
  console.log('📝 N\'oubliez pas de mettre à jour les vraies adresses email/téléphone dans vos services.');
}

runTests();