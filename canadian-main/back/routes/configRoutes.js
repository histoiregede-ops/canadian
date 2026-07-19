const express = require('express');
const router = express.Router();

const PAYMENT_METHODS = [
  { key: 'cash', name: 'Espèces', icon: '', operator: '', isMobileMoney: false },
  { key: 'orange_money', name: 'Orange Money', icon: '', operator: 'Orange Mali', isMobileMoney: true },
  { key: 'moov_money', name: 'Mobile Cash', icon: '', operator: 'Moov Africa', isMobileMoney: true },
  { key: 'wave', name: 'Wave', icon: '', operator: 'Wave', isMobileMoney: true },
  { key: 'card', name: 'Carte Bancaire', icon: '', operator: '', isMobileMoney: false },
  { key: 'bank_transfer', name: 'Virement Bancaire', icon: '', operator: '', isMobileMoney: false }
];

const STATUS_LABELS = {
  pending: 'En attente',
  paid: 'Payée',
  partially_paid: 'Partiellement payée',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  available: 'En stock',
  out_of_stock: 'Rupture',
  on_order: 'Sur commande'
};

const LOYALTY_LEVELS = [
  { key: 'bronze', name: 'Bronze', minPoints: 0, maxPoints: 99, color: '#cd7f32' },
  { key: 'silver', name: 'Argent', minPoints: 100, maxPoints: 499, color: '#c0c0c0' },
  { key: 'gold', name: 'Or', minPoints: 500, maxPoints: 999, color: '#ffd700' },
  { key: 'platinum', name: 'Platinum', minPoints: 1000, maxPoints: null, color: '#e5e4e2' }
];

const EXPENSE_CATEGORIES = [
  { key: 'rent', name: 'Loyer / Local', icon: '🏠' },
  { key: 'salary', name: 'Salaires', icon: '👷' },
  { key: 'electricity', name: 'Électricité', icon: '💡' },
  { key: 'internet', name: 'Internet / Téléphonie', icon: '📡' },
  { key: 'transport', name: 'Transport / Carburant', icon: '🚐' },
  { key: 'maintenance', name: 'Maintenance / Réparations', icon: '🔧' },
  { key: 'marketing', name: 'Marketing / Publicité', icon: '📣' },
  { key: 'supplies', name: 'Fournitures', icon: '📦' },
  { key: 'taxes', name: 'Taxes / Impôts', icon: '🧾' },
  { key: 'other', name: 'Autre', icon: '📝' }
];

router.get('/payment-methods', (req, res) => {
  res.json({
    methods: PAYMENT_METHODS,
    whatsapp: process.env.WHATSAPP_NUMBER || '+22879803856',
    currency: 'FCFA',
    taxRate: 18
  });
});

router.get('/status-labels', (req, res) => {
  res.json(STATUS_LABELS);
});

router.get('/loyalty-levels', (req, res) => {
  res.json(LOYALTY_LEVELS);
});

router.get('/expense-categories', (req, res) => {
  res.json(EXPENSE_CATEGORIES);
});

module.exports = router;
