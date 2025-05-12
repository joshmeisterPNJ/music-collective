// jest.config.cjs (root)
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/server/tests'],
  moduleDirectories: ['node_modules', 'server/node_modules'],
  transform: {},        // no Babel needed
};