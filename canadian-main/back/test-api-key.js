const axios = require('axios');
require('dotenv').config();

async function testBrevoAPI() {
  console.log('🔧 Test de la clé API Brevo...\n');

  const apiKey = process.env.BREVO_API_KEY;
  console.log('🔍 Valeur brute de BREVO_API_KEY:', apiKey ? `"${apiKey}"` : 'undefined');

  if (!apiKey || apiKey === 'votre_cle_api_brevo_ici') {
    console.log('❌ BREVO_API_KEY non configurée ou valeur par défaut');
    return;
  }

  console.log('📧 Clé API détectée:', apiKey.substring(0, 20) + '...');

  try {
    // Test de l'API avec un appel simple pour vérifier la clé
    const response = await axios.get('https://api.brevo.com/v3/account', {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Clé API valide !');
    console.log('📧 Email expéditeur:', response.data.email);
    console.log('🏢 Plan:', response.data.plan || 'Free');
    console.log('📊 Crédits:', response.data.credits || 'N/A');

  } catch (error) {
    console.log('❌ Clé API invalide ou problème de connexion');
    console.log('🔍 Détails:', error.response?.data || error.message);

    if (error.response?.status === 401) {
      console.log('\n🔧 Pour corriger:');
      console.log('1. Vérifiez que votre clé API est correcte sur https://app.brevo.com/settings/keys/api');
      console.log('2. Assurez-vous que le compte Brevo est actif');
      console.log('3. Vérifiez que la clé a les permissions SMTP');
    }
  }
}

testBrevoAPI();