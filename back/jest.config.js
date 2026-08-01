module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  // Exclut le script de smoke-test (non-Jest) exécuté via `node tests/routes.test.js` / npm test
  testPathIgnorePatterns: ['/node_modules/', '/tests/routes.test.js'],
  collectCoverageFrom: ['**/*.js', '!node_modules/**', '!coverage/**', '!tests/**', '!jest.config.js', '!seeders/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'html', 'json'],
  collectCoverage: true,
  verbose: true,
  testTimeout: 15000,
  maxWorkers: 1,
  // index.js lance `app.listen()` au chargement (side-effect), ce qui maintient la
  // boucle d'événements ouverte : on force la sortie de Jest une fois les suites terminées.
  forceExit: true,
  setupFiles: ['<rootDir>/tests/setup.js'],
  globalSetup: '<rootDir>/tests/global-setup.js',
  globalTeardown: '<rootDir>/tests/global-teardown.js'
};
