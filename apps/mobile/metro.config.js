// Konfigurasi Metro untuk monorepo pnpm — memastikan paket workspace
// seperti @bpom/shared bisa di-resolve dari luar folder apps/mobile.
// pnpm sudah menyusun node_modules via symlink dengan benar, jadi kita cukup
// mengaktifkan symlink resolution & mengizinkan Metro mengawasi root workspace
// tanpa membatasi nodeModulesPaths (pembatasan itu justru merusak resolusi
// dependency transitif seperti expo-modules-core).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
