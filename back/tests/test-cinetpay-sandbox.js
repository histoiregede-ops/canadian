require('dotenv').config();
const cinetpay = require('../services/cinetpayProvider');

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    failed++;
  }
}

async function assertRejects(fn, label) {
  try {
    await fn();
    console.log(`  ❌ ${label} (devait lever une erreur)`);
    failed++;
  } catch (e) {
    console.log(`  ✅ ${label} → ${e.message}`);
    passed++;
  }
}

async function run() {
  console.log('\n═══════════════════════════════════════════');
  console.log('   TEST CINETPAY SANDBOX');
  console.log('═══════════════════════════════════════════\n');

  // ── 1. Configuration ──
  console.log('1️⃣  Configuration');
  assert(cinetpay.isConfigured(), 'API key et password configurés');
  assert(cinetpay.isSandboxMode(), 'Mode sandbox activé');

  const txId = cinetpay.generateTransactionId();
  assert(txId.startsWith('CT'), 'Transaction ID commence par CT');
  assert(txId.length <= 30, `Transaction ID ≤ 30 caractères (${txId.length})`);

  // ── 2. Test phone numbers ──
  console.log('\n2️⃣  Numéros de test');
  assert(cinetpay.isTestPhone('0100000001'), '0100000001 = SUCCESS');
  assert(cinetpay.isTestPhone('0100000004'), '0100000004 = FAILED');
  assert(cinetpay.isTestPhone('0100000005'), '0100000005 = PENDING');
  assert(cinetpay.isTestPhone('+2250707000000'), '+2250707000000 = SUCCESS');
  assert(!cinetpay.isTestPhone('99999999'), '99999999 ≠ test phone');
  assert(cinetpay.getTestPhone('SUCCESS') === '0100000001', 'getTestPhone(SUCCESS)');
  assert(cinetpay.getTestPhone('FAILED') === '0100000004', 'getTestPhone(FAILED)');
  assert(cinetpay.getTestPhone('PENDING') === '0100000005', 'getTestPhone(PENDING)');

  // ── 3. OAuth Token ──
  console.log('\n3️⃣  Authentification OAuth');
  try {
    const token = await cinetpay._getAccessToken();
    assert(typeof token === 'string' && token.length > 10, `Token obtenu (${token.substring(0, 20)}...)`);

    const token2 = await cinetpay._getAccessToken();
    assert(token2 === token, 'Token mis en cache (même token)');
  } catch (e) {
    console.log(`  ❌ Échec OAuth: ${e.message}`);
    console.log(`  💡 Vérifie CINETPAY_API_KEY et CINETPAY_API_PASSWORD dans back/.env`);
    failed += 2;
  }

  // ── 4. Initier un paiement (sans directPay ──
  console.log('\n4️⃣  Initiation de paiement (sans directPay)');
  const directPayTestId = `TEST-${Date.now()}`;
  try {
    const payment = await cinetpay.initiatePayment({
      amount: 100,
      currency: 'XOF',
      phoneNumber: '0100000001',
      paymentMethod: 'OM',
      orderId: directPayTestId,
      customerFirstName: 'Test',
      customerLastName: 'Sandbox',
      customerPhone: '0100000001',
      directPay: false
    });

    assert(payment.success === true, `success = true`);
    assert(payment.transactionId.startsWith('CT'), `transactionId = ${payment.transactionId}`);
    assert(payment.status === 'INITIATED', `status = ${payment.status}`);

    console.log(`     └─ Transaction: ${payment.transactionId}`);
    console.log(`     └─ Payment Token: ${payment.paymentToken || '(non fourni)'}`);
    console.log(`     └─ Notify Token: ${payment.notifyToken || '(non fourni)'}`);

    // ── 5. Vérifier le statut ──
    console.log('\n5️⃣  Vérification du statut (sans directPay)');
    try {
      const status = await cinetpay.checkTransactionStatus(payment.transactionId);
      assert(status.success === true, `checkStatus success = ${status.success}`);
      assert(status.transactionId === payment.transactionId, `même transactionId`);
      console.log(`     └─ Status: ${status.status}`);
      console.log(`     └─ isPending: ${status.isPending}`);
    } catch (e) {
      console.log(`  ❌ checkTransactionStatus: ${e.message}`);
      failed++;
    }
  } catch (e) {
    console.log(`  ❌ initiatePayment: ${e.message}`);
    if (e.response) {
      console.log(`     └─ Status: ${e.response.status}`);
      console.log(`     └─ Body: ${JSON.stringify(e.response.data)}`);
    }
    failed += 2;
  }

  // ── 6. Paiement avec directPay:true ──
  console.log('\n6️⃣  Paiement avec directPay:true');
  try {
    const direct = await cinetpay.initiatePayment({
      amount: 250,
      currency: 'XOF',
      phoneNumber: '0100000001',
      paymentMethod: 'OM',
      orderId: `TEST-DIRECT-${Date.now()}`,
      customerFirstName: 'Direct',
      customerLastName: 'Pay',
      customerPhone: '0100000001',
      directPay: true
    });

    assert(direct.success === true, `directPay success = ${direct.success}`);
    assert(direct.transactionId.startsWith('CT'), `transactionId = ${direct.transactionId}`);
    console.log(`     └─ Transaction: ${direct.transactionId}`);
    console.log(`     └─ Status: ${direct.status}`);
    console.log(`     └─ Payment Token: ${direct.paymentToken || '(non fourni)'}`);

    // Vérifier statut après directPay
    console.log('\n7️⃣  Statut après directPay');
    try {
      const ds = await cinetpay.checkTransactionStatus(direct.transactionId);
      console.log(`     └─ Status: ${ds.status}`);
      console.log(`     └─ isCompleted: ${ds.isCompleted}`);
      console.log(`     └─ isFailed: ${ds.isFailed}`);
      console.log(`     └─ isPending: ${ds.isPending}`);
      if (ds.isCompleted) {
        console.log(`     └─ ✅ PAIEMENT RÉUSSI !`);
      }
    } catch (e) {
      console.log(`  ❌ checkStatus: ${e.message}`);
      failed++;
    }
  } catch (e) {
    console.log(`  ❌ directPay: ${e.message}`);
    if (e.response) {
      console.log(`     └─ Status: ${e.response.status}`);
      console.log(`     └─ Body: ${JSON.stringify(e.response.data)}`);
    }
    failed++;
  }

  // ── 8. Initier avec WAVE ──
  console.log('\n8️⃣  Paiement WAVE');
  try {
    const wavePayment = await cinetpay.initiatePayment({
      amount: 500,
      currency: 'XOF',
      phoneNumber: '0100000002',
      paymentMethod: 'WAVE',
      orderId: `TEST-WAVE-${Date.now()}`,
      customerFirstName: 'Wave',
      customerLastName: 'Test',
      customerPhone: '0100000002'
    });
    assert(wavePayment.success === true, `WAVE success = ${wavePayment.success}`);
    console.log(`     └─ Transaction: ${wavePayment.transactionId}`);
    console.log(`     └─ Status: ${wavePayment.status}`);
  } catch (e) {
    console.log(`  ❌ WAVE: ${e.message}`);
    if (e.response) {
      console.log(`     └─ Status: ${e.response.status}`);
      console.log(`     └─ Body: ${JSON.stringify(e.response.data)}`);
    }
    failed++;
  }

  // ── 9. Vérifier transaction inexistante ──
  console.log('\n9️⃣  Transaction inexistante');
  try {
    const badStatus = await cinetpay.checkTransactionStatus('CTNONEXISTENT123456');
    assert(badStatus.success === false, `success = false (${badStatus.success})`);
    console.log(`     └─ Status: ${badStatus.status}`);
  } catch (e) {
    console.log(`  ✅ Transaction inexistante rejetée: ${e.message}`);
    passed++;
  }

  // ── 10. IPN ──
  console.log('\n🔟  Traitement IPN');
  const ipn = cinetpay.processIPN({
    notify_token: 'test_token',
    merchant_transaction_id: 'CTTEST123456',
    transaction_id: 'CINET_TX_001',
    cpm_amount: '1500',
    cpm_currency: 'XOF',
    cpm_custom: JSON.stringify({ orderId: 'ORD-001' })
  });
  assert(ipn.notifyToken === 'test_token', 'notifyToken');
  assert(ipn.merchantTransactionId === 'CTTEST123456', 'merchantTransactionId');
  assert(ipn.transactionId === 'CINET_TX_001', 'transactionId');
  assert(ipn.amount === 1500, 'amount = 1500');
  assert(ipn.currency === 'XOF', 'currency = XOF');
  assert(ipn.orderId === 'ORD-001', 'orderId = ORD-001');

  try {
    cinetpay.processIPN({ notify_token: 'test' });
    console.log('  ❌ IPN sans ID devait lever une erreur');
    failed++;
  } catch (e) {
    console.log(`  ✅ IPN sans ID: ${e.message}`);
    passed++;
  }

  // ── Résumé ──
  console.log('\n═══════════════════════════════════════════');
  console.log(`   RÉSULTAT : ${passed} ✅ / ${failed} ❌`);
  console.log('═══════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => {
  console.error('\n💥 ERREUR FATALE:', e.message);
  process.exit(1);
});
