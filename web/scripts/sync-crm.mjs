import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(webRoot, '..');
const frontendRoot = path.resolve(repoRoot, 'frontend');

console.log('[sync-crm] Bridging CRM into Unified Web project...');
console.log('  Source frontend:', frontendRoot);
console.log('  Target web:     ', webRoot);

if (!fs.existsSync(frontendRoot)) {
  console.log('[sync-crm] Notice: frontend directory not found at', frontendRoot);
  console.log('[sync-crm] Using pre-committed CRM files in web/src (Vercel scoped build).');
  process.exit(0);
}

function copyRecursive(src, dest, overwrite = false) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child), overwrite);
    }
  } else {
    if (overwrite || !fs.existsSync(dest)) {
      const destDir = path.dirname(dest);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, dest);
    }
  }
}

// 1. Refresh CRM-owned components. Public website components have distinct names.
console.log('[sync-crm] Copying CRM components...');
copyRecursive(
  path.join(frontendRoot, 'src', 'components'),
  path.join(webRoot, 'src', 'components'),
  true
);

// 2. Copy CRM lib files (api.ts, constants.ts, format.ts, etc.)
console.log('[sync-crm] Copying CRM lib utilities...');
copyRecursive(
  path.join(frontendRoot, 'src', 'lib'),
  path.join(webRoot, 'src', 'lib'),
  true
);

// 3. Copy CRM public assets (lv-track.js, etc.)
console.log('[sync-crm] Copying CRM public assets...');
copyRecursive(
  path.join(frontendRoot, 'public'),
  path.join(webRoot, 'public'),
  true
);

// 4. Copy CRM routes: (app), login, forgot-password, reset-password
console.log('[sync-crm] Copying CRM app routes...');
for (const route of ['(app)', 'login', 'forgot-password', 'reset-password']) {
  const srcRoute = path.join(frontendRoot, 'src', 'app', route);
  const destRoute = path.join(webRoot, 'src', 'app', route);
  copyRecursive(srcRoute, destRoute, true);
}

// 5. Ensure CRM has its CSS theme isolated
const frontendCss = path.join(frontendRoot, 'src', 'app', 'globals.css');
const destCrmCss = path.join(webRoot, 'src', 'app', 'crm-theme.css');
if (fs.existsSync(frontendCss)) {
  fs.copyFileSync(frontendCss, destCrmCss);
  console.log('[sync-crm] Saved CRM theme as crm-theme.css');
}

console.log('[sync-crm] CRM bridge complete!');
