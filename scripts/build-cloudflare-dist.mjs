import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'tmp', 'dist');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

const copyList = [
  'css', 'en', 'es', 'artigos', 'images', 'js', 'assets', 'agents', 'api', '.well-known',
  'manifest.json', 'robots.txt', 'sitemap.xml', 'sitemap-articles.xml', 'llms.txt', 'llms-full.txt',
  'sw.js', 'firebase-messaging-sw.js', 'openapi.json', 'auth.md', 'google0ef2004b37f69f6d.html',
  '29c5fae97ae9363315db62e3db72671c.txt'
];

for (const item of copyList) {
  const src = path.join(root, item);
  const dest = path.join(dist, item);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
  }
}

for (const file of fs.readdirSync(root)) {
  if (file.endsWith('.html')) {
    fs.copyFileSync(path.join(root, file), path.join(dist, file));
  }
}

function removeUnneeded(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      removeUnneeded(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      const stat = fs.statSync(fullPath);
      if (stat.size > 20 * 1024 * 1024 || ['.mov', '.eps', '.heic', '.log', '.py', '.map'].includes(ext) || (entry.name.startsWith('.') && !entry.name.startsWith('.well-known'))) {
        fs.unlinkSync(fullPath);
        console.log('Removed from dist:', fullPath);
      }
    }
  }
}

removeUnneeded(dist);

const headersContent = `/*
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; script-src 'self' 'nonce-pmorais-2026' https://www.gstatic.com https://unpkg.com https://www.googletagmanager.com; script-src-attr 'unsafe-inline'; style-src 'self' 'nonce-pmorais-2026' https://fonts.googleapis.com https://fonts.gstatic.com; style-src-attr 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.cloudfunctions.net https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com wss://*.firebaseio.com; img-src 'self' data: https: blob:; media-src 'self' https://www.youtube-nocookie.com; frame-src https://www.youtube-nocookie.com https://www.googletagmanager.com; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none';

/sw.js
  Cache-Control: no-cache, no-store, must-revalidate

/*.html
  Cache-Control: no-cache, must-revalidate
  Link: </.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json", </openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1", </llms-full.txt>; rel="service-doc"; type="text/plain", </llms.txt>; rel="describedby"; type="text/plain", </.well-known/ai-catalog.json>; rel="service-meta"; type="application/json", </.well-known/ai-catalog.json>; rel="ai-catalog"; type="application/json", </.well-known/agent-skills/index.json>; rel="describedby"; type="application/json", </.well-known/mcp/server-card.json>; rel="describedby"; type="application/json", </auth.md>; rel="describedby"; type="text/markdown", </sitemap.xml>; rel="sitemap"; type="application/xml", </politica-privacidade>; rel="privacy-policy", </termos-e-condicoes>; rel="terms-of-service"
  Vary: Accept

/en/*.html
  Cache-Control: no-cache, must-revalidate
  Link: </.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json", </openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1", </llms-full.txt>; rel="service-doc"; type="text/plain", </llms.txt>; rel="describedby"; type="text/plain", </.well-known/ai-catalog.json>; rel="service-meta"; type="application/json", </.well-known/ai-catalog.json>; rel="ai-catalog"; type="application/json", </.well-known/agent-skills/index.json>; rel="describedby"; type="application/json", </.well-known/mcp/server-card.json>; rel="describedby"; type="application/json", </auth.md>; rel="describedby"; type="text/markdown", </sitemap.xml>; rel="sitemap"; type="application/xml", </politica-privacidade>; rel="privacy-policy", </termos-e-condicoes>; rel="terms-of-service"
  Vary: Accept

/llms.txt
  Content-Type: text/plain; charset=utf-8
  Cache-Control: no-cache, must-revalidate

/llms-full.txt
  Content-Type: text/plain; charset=utf-8
  Cache-Control: no-cache, must-revalidate

/robots.txt
  Content-Type: text/plain; charset=utf-8
  Cache-Control: no-cache, must-revalidate

/sitemap.xml
  Content-Type: application/xml; charset=utf-8
  Cache-Control: no-cache, must-revalidate

/.well-known/api-catalog
  Content-Type: application/linkset+json; charset=utf-8
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=300, must-revalidate

/openapi.json
  Content-Type: application/vnd.oai.openapi+json;version=3.1
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=300, must-revalidate

/.well-known/*
  Content-Type: application/json; charset=utf-8
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=300, must-revalidate

/api/*
  Content-Type: application/json; charset=utf-8
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=300, must-revalidate

/*.md
  Content-Type: text/markdown; charset=utf-8
  Access-Control-Allow-Origin: *
  X-Robots-Tag: noindex, follow
  Cache-Control: no-cache, must-revalidate
`;

fs.writeFileSync(path.join(dist, '_headers'), headersContent);

// Mirrors the 301s in .htaccess: personal training now lives on the about page.
const redirectsContent = `/treino-personalizado /sobre-mim#treino-personalizado 301
/treino-personalizado.html /sobre-mim#treino-personalizado 301
/en/personal-training /en/sobre-mim#personal-training 301
/en/personal-training.html /en/sobre-mim#personal-training 301
`;

fs.writeFileSync(path.join(dist, '_redirects'), redirectsContent);
console.log('Cloudflare Pages dist built successfully in tmp/dist');
