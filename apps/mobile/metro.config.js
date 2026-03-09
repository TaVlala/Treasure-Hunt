// Metro bundler config — extends Expo defaults and adds monorepo support.
// watchFolders ensures Metro can resolve @treasure-hunt/shared from the packages/ directory.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo root so Metro sees the shared package
config.watchFolders = [monorepoRoot];

// Resolve node_modules from both app root and monorepo root (hoisted deps)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
