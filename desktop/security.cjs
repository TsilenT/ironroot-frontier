'use strict';
const path = require('node:path');
const fs = require('node:fs/promises');
const ORIGIN = 'ironroot://game';
const ENTRY = `${ORIGIN}/index.html`;
const NAVIGATION_PAGES = new Set([`${ORIGIN}/`, ENTRY, `${ORIGIN}/training.html`]);
const MIME = Object.freeze({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' });
const CSP = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'none'; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
function isLocal(url) { try { const u = new URL(url); return u.protocol === 'ironroot:' && u.hostname === 'game' && !u.port && !u.username && !u.password; } catch { return false; } }
function isGameNavigation(url) {
  if (typeof url !== 'string' || !isLocal(url)) return false;
  // Fragments stay within a bundled page; queries and URL-normalization aliases
  // are unnecessary for these links and are deliberately not accepted.
  return NAVIGATION_PAGES.has(url.split('#', 1)[0]) && new URL(url).href === url;
}
function assetPath(root, url) {
  if (!isLocal(url)) return null;
  let name; try { name = decodeURIComponent(new URL(url).pathname); } catch { return null; }
  if (name === '/') name = '/index.html';
  if (name.includes('\\') || name.includes('\0') || name.split('/').some(p => p === '..' || p === '.')) return null;
  if (!MIME[path.extname(name)] || name.endsWith('/service-worker.js')) return null;
  const result = path.resolve(root, `.${name}`);
  const rel = path.relative(path.resolve(root), result);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? result : null;
}
async function readAsset(root, url) {
  const target = assetPath(root, url);
  if (!target) return null;
  try {
    const [realRoot, realTarget] = await Promise.all([fs.realpath(root), fs.realpath(target)]);
    const relative = path.relative(realRoot, realTarget);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;
    return { bytes: await fs.readFile(realTarget), type: MIME[path.extname(target)] };
  } catch { return null; }
}
module.exports = { ORIGIN, ENTRY, MIME, CSP, isLocal, isGameNavigation, assetPath, readAsset };
