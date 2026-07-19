require('dotenv').config();
const http = require('http');

const BASE_URL = 'http://localhost:3000';

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) options.headers['Authorization'] = 'Bearer ' + token;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          parsed._status = res.statusCode;
          resolve(parsed);
        } catch (e) {
          resolve({ _status: res.statusCode, _raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let authToken, productId, createdOrderId;

async function run() {
  try {
    console.log('\n=== TEST FLUX COMPLET DE VENTE ===\n');

    // 1. Login
    console.log('--- 1. Authentification ---');
    const loginRes = await request('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
    if (!loginRes.token) { console.error('Échec login:', loginRes); process.exit(1); }
    authToken = loginRes.token;
    console.log('Token OK\n');

    // 2. Créer un produit
    console.log('--- 2. Création produit ---');
    const prodRes = await request('POST', '/api/products', {
      name: 'Test Vente ' + Date.now(),
      price: 15000,
      stockQuantity: 50,
      status: 'available'
    }, authToken);
    if (prodRes._status !== 201) { console.error('Échec création produit:', prodRes); process.exit(1); }
    productId = prodRes.id;
    console.log('Produit créé ID:', productId, '| Stock initial: 50\n');

    // 3. Créer la commande (vente cash)
    console.log('--- 3. Création commande cash ---');
    const ordRes = await request('POST', '/api/orders', {
      items: [{ productId, quantity: 3, unitPrice: 15000 }],
      paymentMethod: 'cash',
      discount: 0,
      tax: 0,
      subtotal: 45000,
      totalAmount: 45000,
      paidAmount: 45000
    }, authToken);
    if (ordRes._status !== 201) { console.error('Échec création commande:', ordRes); process.exit(1); }
    createdOrderId = ordRes.id;
    console.log('ID:', createdOrderId);
    console.log('Référence:', ordRes.orderNumber);
    console.log('Statut:', ordRes.status);
    console.log('Montant:', ordRes.totalAmount, 'FCFA');
    console.log('Payé:', ordRes.paidAmount, 'FCFA');
    if (ordRes.status !== 'paid') { console.error('Statut devrait être "paid"'); process.exit(1); }
    console.log('✓ Statut = "paid" comme attendu\n');

    // 4. Vérifier le stock du produit
    console.log('--- 4. Vérification stock ---');
    const stockRes = await request('GET', '/api/products/' + productId, null, authToken);
    console.log('Stock restant:', stockRes.stockQuantity, '(attendu: 47)');
    if (stockRes.stockQuantity !== 47) {
      console.error('✗ Stock incorrect');
      process.exit(1);
    }
    console.log('✓ Stock correct\n');

    // 5. Vérifier la commande finale
    console.log('--- 5. Vérification commande finale ---');
    const checkRes = await request('GET', '/api/orders/' + createdOrderId);
    console.log('Statut:', checkRes.status);
    console.log('Payé:', checkRes.paidAmount, 'FCFA');
    if (checkRes.status !== 'paid') { console.error('Statut pas "paid"'); process.exit(1); }
    console.log('✓ Commande finalisée\n');

    // 6. Vérifier les transactions finance
    console.log('--- 6. Transactions finance ---');
    const finRes = await request('GET', '/api/finance/transactions', null, authToken);
    if (finRes._status === 200 && Array.isArray(finRes)) {
      const salesTx = finRes.filter(tx => tx.category === 'Sales');
      console.log('Transactions Sales trouvées:', salesTx.length);
      if (salesTx.length > 0) {
        const last = salesTx[salesTx.length - 1];
        console.log('Dernière:', last.description, '-', last.amount, 'FCFA');
      }
    } else {
      console.log('Note: /api/finance/transactions non disponible (status:', finRes._status, ')');
    }

    console.log('\n=== ✅ TEST VENTE RÉUSSI ===\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ ERREUR:', err.message);
    process.exit(1);
  }
}

run();
