// Jest setup file
global.console = {
  ...console,
  // Suppress console.warn during tests unless explicitly needed
  warn: jest.fn(),
  log: jest.fn(),
};