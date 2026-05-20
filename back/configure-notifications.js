const fs = require('fs');
const path = require('path');

// Configuration helper
function updateEnvConfig() {
  const envPath = path.join(__dirname, '.env');

  console.log('🔧 Configuration Email & SMS pour Solar Tech ERP\n');

  // Read current .env
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Email configuration
  console.log('📧 Configuration Gmail :');
  console.log('1. Votre adresse Gmail :');
  const emailUser = 'votre-email@gmail.com'; // Replace with actual input

  console.log('2. Mot de passe d\'application (16 caractères) :');
  const emailPass = 'votre-mot-de-passe-app'; // Replace with actual input

  // SMS configuration
  console.log('\n📱 Configuration Twilio :');
  console.log('3. ACCOUNT SID (commence par AC...) :');
  const twilioSid = 'votre-account-sid'; // Replace with actual input

  console.log('4. AUTH TOKEN (32 caractères) :');
  const twilioToken = 'votre-auth-token'; // Replace with actual input

  console.log('5. Numéro de téléphone Twilio (+1234567890) :');
  const twilioPhone = '+1234567890'; // Replace with actual input

  // Update .env content
  const updatedEnv = envContent
    .replace(/EMAIL_USER=.*/, `EMAIL_USER=${emailUser}`)
    .replace(/EMAIL_PASS=.*/, `EMAIL_PASS=${emailPass}`)
    .replace(/TWILIO_ACCOUNT_SID=.*/, `TWILIO_ACCOUNT_SID=${twilioSid}`)
    .replace(/TWILIO_AUTH_TOKEN=.*/, `TWILIO_AUTH_TOKEN=${twilioToken}`)
    .replace(/TWILIO_PHONE_NUMBER=.*/, `TWILIO_PHONE_NUMBER=${twilioPhone}`);

  fs.writeFileSync(envPath, updatedEnv);

  console.log('\n✅ Configuration mise à jour !');
  console.log('🧪 Lancez "node test-notifications.js" pour tester.');
}

// Interactive setup (simplified version)
console.log('🚀 Configuration Interactive Email & SMS\n');
console.log('📖 Lisez d\'abord le guide dans CONFIGURATION_EMAIL_SMS.md\n');
console.log('💡 Puis exécutez ce script pour configurer :\n');

console.log('node configure-notifications.js');

module.exports = { updateEnvConfig };