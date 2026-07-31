import fs from 'node:fs';
import path from 'node:path';
import { ASSET_VERSION } from './seo-config.mjs';

const root = process.cwd();
const siteOrigin = 'https://pmorais.pt';

const portugueseRoutes = {
  'index.html': '/',
  'osteopatia.html': '/osteopatia',
  'sobre-mim.html': '/sobre-mim',
  'blog.html': '/blog',
  'artigo.html': '/artigo',
  'perfil.html': '/perfil',
  'perfis.html': '/perfis',
  'formulario.html': '/formulario',
  'historico.html': '/historico',
  'politica-privacidade.html': '/politica-privacidade',
  'termos-e-condicoes.html': '/termos-e-condicoes',
  'desinscrever.html': '/desinscrever',
  'auth-action.html': '/auth-action',
  'admin-blog.html': '/admin-blog'
};

const englishRoutes = {
  'index.html': '/en/',
  'osteopatia.html': '/en/osteopatia',
  'sobre-mim.html': '/en/sobre-mim',
  'blog.html': '/en/blog',
  'article.html': '/en/article',
  'perfil.html': '/en/perfil',
  'perfis.html': '/en/perfis',
  'formulario.html': '/en/formulario',
  'historico.html': '/en/historico',
  'politica-privacidade.html': '/en/politica-privacidade',
  'termos-e-condicoes.html': '/en/termos-e-condicoes',
  'desinscrever.html': '/en/desinscrever',
  'auth-action.html': '/en/auth-action'
};

function htmlFiles(directory) {
  return fs.readdirSync(directory)
    .filter((name) => name.endsWith('.html') && !name.startsWith('google'))
    .map((name) => path.join(directory, name));
}

function replaceQuotedRoute(source, from, to) {
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return source.replace(new RegExp(`(["'])${escaped}(?=([?#]|["']))`, 'g'), `$1${to}`);
}

function normalizeHtml(file, routes) {
  let source = fs.readFileSync(file, 'utf8');
  for (const [from, to] of Object.entries(routes)) source = replaceQuotedRoute(source, from, to);

  if (routes === englishRoutes) {
    source = source.replaceAll('aria-label="Abrir menu de navegação"', 'aria-label="Open navigation menu"');
  }

  // Absolute canonical/share URLs should use the same clean destinations.
  for (const [from, to] of Object.entries(portugueseRoutes)) {
    source = source.replaceAll(`${siteOrigin}/${from}`, new URL(to, siteOrigin).href);
  }
  for (const [from, to] of Object.entries(englishRoutes)) {
    source = source.replaceAll(`${siteOrigin}/en/${from}`, new URL(to, siteOrigin).href);
  }

  // Hosting caches JavaScript for seven days. Version every shared asset whose
  // navigation/privacy behavior is maintained by this SEO normalization pass.
  source = source
    .replace(
      /(src=["'][^"']*(?:lang|cookie-consent|script|theme)\.js)(?:\?v=[^"']*)?(["'])/g,
      `$1?v=${ASSET_VERSION}$2`
    )
    .replace(
      /(href=["'][^"']*css\/style\.css)(?:\?v=[^"']*)?(["'])/g,
      `$1?v=${ASSET_VERSION}$2`
    )
    .replace(
      /(from\s+["'][^"']*\/blog\.js)(?:\?v=[^"']*)?(["'])/g,
      `$1?v=${ASSET_VERSION}$2`
    );
  fs.writeFileSync(file, source);
}

for (const file of htmlFiles(root)) normalizeHtml(file, portugueseRoutes);
for (const file of htmlFiles(path.join(root, 'en'))) normalizeHtml(file, englishRoutes);

// JavaScript navigation remains relative so shared scripts work in both language trees.
for (const directory of [path.join(root, 'js'), path.join(root, 'en/js')]) {
  for (const name of fs.readdirSync(directory).filter((entry) => entry.endsWith('.js'))) {
    const file = path.join(directory, name);
    let source = fs.readFileSync(file, 'utf8');
    const names = new Set([...Object.keys(portugueseRoutes), ...Object.keys(englishRoutes)]);
    for (const route of names) source = replaceQuotedRoute(source, route, route.replace(/\.html$/, ''));
    for (const [from, to] of Object.entries(portugueseRoutes)) source = source.replaceAll(`/${from}`, to);
    for (const [from, to] of Object.entries(englishRoutes)) source = source.replaceAll(`/en/${from}`, to);
    source = source
      .replaceAll('../termos-e-condicoes.html', '/en/termos-e-condicoes')
      .replaceAll('../politica-privacidade.html', '/en/politica-privacidade');
    fs.writeFileSync(file, source);
  }
}

// Cloud Function emails must never introduce redirecting legacy URLs.
const functionsFile = path.join(root, 'functions/index.js');
let functionsSource = fs.readFileSync(functionsFile, 'utf8');
for (const [from, to] of Object.entries(portugueseRoutes)) {
  functionsSource = functionsSource.replaceAll(`${siteOrigin}/${from}`, new URL(to, siteOrigin).href);
}
fs.writeFileSync(functionsFile, functionsSource);

const manifestFile = path.join(root, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
manifest.start_url = '/perfil';
fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);

const serviceWorkerFile = path.join(root, 'sw.js');
let serviceWorker = fs.readFileSync(serviceWorkerFile, 'utf8')
  .replace(/const CACHE_NAME = 'paulo-morais-pwa-v\d+';/, `const CACHE_NAME = 'paulo-morais-pwa-v${ASSET_VERSION.replaceAll('.', '')}';`);
for (const [from, to] of Object.entries(portugueseRoutes)) serviceWorker = replaceQuotedRoute(serviceWorker, `/${from}`, to);
fs.writeFileSync(serviceWorkerFile, serviceWorker);

const testFile = path.join(root, 'tests/booking.spec.js');
let testSource = fs.readFileSync(testFile, 'utf8').replaceAll('/perfil.html', '/perfil');
fs.writeFileSync(testFile, testSource);

console.log('Normalized internal navigation, email, manifest, service-worker and test URLs.');
