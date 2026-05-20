const User = require('./User');
const Product = require('./Product');
const Category = require('./Category');
const Customer = require('./Customer');
const { Order, OrderItem } = require('./Order');
const Repair = require('./Repair');
const Installation = require('./Installation');
const CashTransaction = require('./CashTransaction');
const ProductReview = require('./ProductReview');
const Payment = require('./Payment');

// Associations
Category.hasMany(Product, { foreignKey: 'categoryId' });
Product.belongsTo(Category, { foreignKey: 'categoryId' });

Customer.hasMany(Order, { foreignKey: 'customerId' });
Order.belongsTo(Customer, { foreignKey: 'customerId' });

Order.hasMany(OrderItem, { as: 'products', foreignKey: 'orderId' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

Product.hasMany(OrderItem, { foreignKey: 'productId' });
OrderItem.belongsTo(Product, { foreignKey: 'productId' });

Customer.hasMany(Repair, { foreignKey: 'customerId' });
Repair.belongsTo(Customer, { foreignKey: 'customerId' });

Customer.hasMany(Installation, { foreignKey: 'customerId' });
Installation.belongsTo(Customer, { foreignKey: 'customerId' });

User.hasMany(Installation, { as: 'AssignedTechnician', foreignKey: 'technicianId' });
Installation.belongsTo(User, { as: 'Technician', foreignKey: 'technicianId' });

// Product Review associations
Product.hasMany(ProductReview, { foreignKey: 'productId' });
ProductReview.belongsTo(Product, { foreignKey: 'productId' });

Customer.hasMany(ProductReview, { foreignKey: 'customerId' });
ProductReview.belongsTo(Customer, { foreignKey: 'customerId' });

Order.hasMany(Payment, { foreignKey: 'orderId' });
Payment.belongsTo(Order, { foreignKey: 'orderId' });

module.exports = {
  User,
  Product,
  Category,
  Customer,
  Order,
  OrderItem,
  Repair,
  Installation,
  CashTransaction,
  ProductReview,
  Payment
};
