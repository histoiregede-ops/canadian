const { Category, Product, CashTransaction, Customer, Repair, Installation, User } = require('./models');
const sequelize = require('./config/database');

async function seed() {
  await sequelize.sync({ force: true });
  console.log('Database cleared.');

  // Create Categories
  const catSolar = await Category.create({ name: 'Solaire', type: 'solar' });
  const catElectronics = await Category.create({ name: 'Électronique', type: 'electronics' });
  const catAcc = await Category.create({ name: 'Accessoires', type: 'accessory' });

  // Create Products
  await Product.create({
    name: 'Panneau Solaire 400W Monocristallin',
    description: 'Haute efficacité, garantie 25 ans.',
    price: 150000,
    stockQuantity: 15,
    status: 'available',
    categoryId: catSolar.id
  });

  await Product.create({
    name: 'Batterie Lithium LiFePO4 12V 100Ah',
    description: 'Cycle profond, 6000 cycles.',
    price: 450000,
    stockQuantity: 5,
    status: 'available',
    categoryId: catSolar.id
  });

  await Product.create({
    name: 'iPhone 14 Pro 256GB',
    description: 'Noir Sidéral, Neuf scellé.',
    price: 850000,
    stockQuantity: 2,
    status: 'available',
    categoryId: catElectronics.id
  });

  // Create some transactions for stats
  await CashTransaction.create({
    type: 'income',
    amount: 1450000,
    description: 'Vente journalière cumulée',
    category: 'Sales'
  });

  // Create Customers
  const customer = await Customer.create({
    fullName: 'Moussa Traoré',
    phone: '+228 90 00 00 00',
    email: 'moussa@example.com',
    address: 'Lomé, Togo'
  });

  // Create Repairs
  await Repair.create({
    deviceType: 'iPhone 13',
    reportedIssue: 'Écran cassé',
    diagnosis: 'Changement bloc écran',
    estimatedCost: 45000,
    status: 'repairing',
    customerId: customer.id
  });

  await Repair.create({
    deviceType: 'Laptop Dell G15',
    reportedIssue: 'Surchauffe',
    diagnosis: 'Nettoyage et pâte thermique',
    estimatedCost: 15000,
    status: 'ready',
    customerId: customer.id
  });

  // Create Technicians (Users)
  const tech = await User.create({
    username: 'tech1',
    password: 'password',
    role: 'technician',
    fullName: 'Amadou Diallo'
  });

  // Create Installations
  await Installation.create({
    location: 'Lomé II, Résidence 45',
    kitType: 'Kit Autonome Premium',
    powerCapacity: '5 KVA',
    materialsNeeded: '12 Panneaux 400W, Onduleur 5KW, 4 Batteries 200Ah',
    scheduledDate: new Date(Date.now() + 86400000 * 2), // In 2 days
    status: 'planned',
    customerId: customer.id,
    technicianId: tech.id
  });

  console.log('Database seeded successfully.');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
