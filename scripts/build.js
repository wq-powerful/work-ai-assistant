/**
 * One-click build script for packaging the AI Work Assistant
 *
 * Steps:
 *   1. Build frontend (Vite)
 *   2. Package backend with PyInstaller
 *   3. Build Electron installer with electron-builder
 *
 * Usage:  node scripts/build.js
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const FRONTEND = path.join(ROOT, 'frontend');
const BACKEND = path.join(ROOT, 'backend');
const DESKTOP = path.join(ROOT, 'desktop');

function run(cmd, cwd = ROOT) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Running: ${cmd}`);
  console.log(`  CWD:     ${cwd}`);
  console.log('='.repeat(60));
  execSync(cmd, { cwd, stdio: 'inherit', shell: true });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Step 1: Build Frontend ────────────────────────────────

console.log('\n[1/3] Building frontend...');
run('npm run build', FRONTEND);

const distDir = path.join(FRONTEND, 'dist');
if (!fs.existsSync(distDir)) {
  console.error('ERROR: Frontend build failed — dist/ not found');
  process.exit(1);
}
console.log('[1/3] Frontend build complete.');

// ── Step 2: Package Backend with PyInstaller ──────────────

console.log('\n[2/3] Packaging backend with PyInstaller...');

// Ensure PyInstaller is installed
try {
  execSync('python -m PyInstaller --version', { stdio: 'pipe' });
} catch {
  console.log('Installing PyInstaller...');
  run('pip install pyinstaller', BACKEND);
}

run('python -m PyInstaller app.spec --clean --noconfirm', BACKEND);

const backendDist = path.join(BACKEND, 'dist', 'backend');
if (!fs.existsSync(backendDist)) {
  console.error('ERROR: PyInstaller build failed — dist/backend/ not found');
  process.exit(1);
}
console.log('[2/3] Backend packaging complete.');

// ── Step 3: Build Electron Installer ──────────────────────

console.log('\n[3/3] Building Electron installer...');

// Install desktop dependencies if needed
if (!fs.existsSync(path.join(DESKTOP, 'node_modules'))) {
  run('npm install', DESKTOP);
}

// Generate a placeholder icon if missing
const iconPath = path.join(DESKTOP, 'icon.ico');
if (!fs.existsSync(iconPath)) {
  console.log('WARNING: icon.ico not found in desktop/. Building without custom icon.');
  console.log('         To add a custom icon, place icon.ico (256x256) in the desktop/ folder.');
}

run('npm run build', DESKTOP);

console.log('\n' + '='.repeat(60));
console.log('  BUILD COMPLETE!');
console.log('  Installer is in: release/');
console.log('='.repeat(60));
