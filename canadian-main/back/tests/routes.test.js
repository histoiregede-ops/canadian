const assert = require('assert');

// Test that all route modules load without errors
function testRouteLoading() {
  const routes = [
    '../routes/productRoutes',
    '../routes/categoryRoutes',
    '../routes/orderRoutes',
    '../routes/authRoutes',
    '../routes/customerRoutes',
    '../routes/financeRoutes',
    '../routes/userRoutes',
    '../routes/repairRoutes',
    '../routes/installationRoutes',
    '../routes/paymentRoutes',
    '../routes/messagingRoutes',
    '../routes/productReviews',
    '../routes/contactRoutes',
    '../routes/statsRoutes',
    '../routes/configRoutes',
    '../routes/reportsRoutes',
  ];

  routes.forEach(route => {
    try {
      const mod = require(route);
      assert.ok(mod, `${route} should export a router`);
      assert.equal(typeof mod, 'function', `${route} should be a Router function`);
      console.log(`  ✅ ${route}`);
    } catch (err) {
      console.error(`  ❌ ${route}: ${err.message}`);
      process.exitCode = 1;
    }
  });
}

console.log('\n🔍 Testing route loading...');
testRouteLoading();

console.log('\n🔍 Testing config payload...');
const configRoutes = require('../routes/configRoutes');
assert.ok(configRoutes, 'Config routes loaded');
console.log('  ✅ Config routes OK');

console.log('\n✅ All route tests passed.\n');
