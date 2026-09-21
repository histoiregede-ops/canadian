const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../utils/auth');

// In-memory store - revient aux valeurs par défaut au redémarrage Render (suffisant pour éviter le 404)
let companySettings = {
  name: 'Electro Canadien',
  phone: '+223 00 00 00 00',
  email: 'contact@electrocanadien.com',
  address: 'Hamdalaye ACI 2000',
  city: 'Bamako',
  country: 'Mali',
  currency: 'FCFA',
  taxRate: 18,
  whatsapp: '+223 00 00 00 00',
  logo: ''
};

function defaultPermissions() {
  const all = [
    { key: 'dashboard', label: 'Tableau de bord' },
    { key: 'sales', label: 'Ventes (POS)' },
    { key: 'inventory', label: 'Stock' },
    { key: 'customers', label: 'Clients' },
    { key: 'orders', label: 'Commandes' },
    { key: 'receipts', label: 'Reçus' },
    { key: 'movements', label: 'Mouvements' },
    { key: 'transfers', label: 'Transferts' },
    { key: 'suppliers', label: 'Fournisseurs' },
    { key: 'purchase_orders', label: 'Achats' },
    { key: 'repairs', label: 'Réparations SAV' },
    { key: 'installations', label: 'Installations' },
    { key: 'technicians', label: 'Techniciens' },
    { key: 'finance', label: 'Finance' },
    { key: 'reports', label: 'Rapports' },
    { key: 'users', label: 'Utilisateurs' },
    { key: 'settings', label: 'Paramètres' },
    { key: 'shop', label: 'Boutique en ligne' }
  ];
  return [
    { role: 'admin', roleLabel: 'Administrateur', permissions: all.map(p => ({ ...p, allowed: true })) },
    { role: 'cashier', roleLabel: 'Caissier', permissions: all.map(p => ({ ...p, allowed: ['dashboard','sales','inventory','customers','orders','receipts','movements','transfers','shop'].includes(p.key) })) },
    { role: 'technician', roleLabel: 'Technicien', permissions: all.map(p => ({ ...p, allowed: ['dashboard','repairs','installations','inventory','customers','shop'].includes(p.key) })) },
    { role: 'seller', roleLabel: 'Commercial', permissions: all.map(p => ({ ...p, allowed: ['dashboard','sales','customers','orders','shop'].includes(p.key) })) }
  ];
}

function defaultFeatures() {
  return [
    { key: 'online_shop', name: 'Boutique en ligne', description: 'Activer la vente en ligne pour les clients', enabled: true, icon: '🛒' },
    { key: 'mobile_money', name: 'Paiement Mobile Money', description: 'Orange Money, Wave, Moov Money', enabled: true, icon: '📱' },
    { key: 'card_payment', name: 'Paiement par carte', description: 'Accepte les paiements par carte bancaire', enabled: true, icon: '💳' },
    { key: 'customer_dashboard', name: 'Espace client', description: 'Les clients peuvent suivre leurs commandes', enabled: true, icon: '👤' },
    { key: 'repairs', name: 'SAV / Réparations', description: 'Module de gestion des réparations', enabled: true, icon: '🔧' },
    { key: 'installations', name: 'Installations solaires', description: 'Module de gestion des installations', enabled: true, icon: '☀️' },
    { key: 'loyalty', name: 'Fidélité clients', description: 'Points de fidélité et niveaux', enabled: true, icon: '⭐' },
    { key: 'notifications', name: 'Notifications', description: 'Notifications email et SMS', enabled: true, icon: '🔔' },
    { key: 'whatsapp', name: 'Whatsapp', description: 'Envoi de messages et relances via WhatsApp', enabled: true, icon: '💬' },
    { key: 'international_transfers', name: 'Transferts internationaux', description: 'Transferts Mobile Money vers d\'autres pays', enabled: true, icon: '🌍' },
    { key: 'multi_currency', name: 'Multi-devises', description: 'Afficher les prix en plusieurs devises', enabled: false, icon: '💰' }
  ];
}

let permissionsStore = defaultPermissions();
let featuresStore = defaultFeatures();

// GET /api/admin -> tous les paramètres
router.get('/', authenticate, authorize('admin'), (req, res) => {
  res.json({ company: companySettings, permissions: permissionsStore, features: featuresStore });
});

// PUT /api/admin/company
router.put('/company', authenticate, authorize('admin'), (req, res) => {
  companySettings = { ...companySettings, ...req.body };
  res.json({ success: true, company: companySettings });
});

// GET /api/admin/permissions
router.get('/permissions', authenticate, authorize('admin'), (req, res) => {
  res.json(permissionsStore);
});

// PUT /api/admin/permissions
router.put('/permissions', authenticate, authorize('admin'), (req, res) => {
  if (Array.isArray(req.body.permissions)) {
    permissionsStore = req.body.permissions;
  }
  res.json({ success: true, permissions: permissionsStore });
});

// GET /api/admin/features
router.get('/features', authenticate, authorize('admin'), (req, res) => {
  res.json(featuresStore);
});

// PUT /api/admin/features/:key
router.put('/features/:key', authenticate, authorize('admin'), (req, res) => {
  const { key } = req.params;
  const { enabled } = req.body;
  const idx = featuresStore.findIndex(f => f.key === key);
  if (idx === -1) return res.status(404).json({ error: 'Feature not found' });
  featuresStore[idx].enabled = !!enabled;
  res.json({ success: true, feature: featuresStore[idx] });
});

module.exports = router;
