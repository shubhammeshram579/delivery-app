// ── jest.config.js ────────────────────────────────────────
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterFramework: ['./tests/setup.js'],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'services/**/*.js',
    'middleware/**/*.js',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: { branches: 60, functions: 60, lines: 60, statements: 60 },
  },
  testTimeout: 30000,
};
