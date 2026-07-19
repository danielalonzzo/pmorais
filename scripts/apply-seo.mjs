import fs from 'node:fs';
import path from 'node:path';
import { NON_PUBLIC_DESCRIPTIONS, PUBLIC_PAGES, SITE_ORIGIN } from './seo-config.mjs';

const imageUrl = `${SITE_ORIGIN}/images/logo/paulo_morais-08.png`;

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('&amp;amp;', '&amp;');
}

function pageAlternates(page) {
  const portuguesePath = page.language === 'pt-PT' ? page.path : page.alternatePath;
  const englishPath = page.language === 'en-GB' ? page.path : page.alternatePath;
  return { portuguesePath, englishPath };
}

function blogSchema(page) {
  if (!page.file.endsWith('blog.html')) return '';
  const isPortuguese = page.language === 'pt-PT';
  const home = isPortuguese ? '/' : '/en/';
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${new URL(page.path, SITE_ORIGIN).href}#collection`,
        url: new URL(page.path, SITE_ORIGIN).href,
        name: isPortuguese ? 'Blog de Paulo Morais' : 'Paulo Morais Blog',
        description: page.description,
        inLanguage: page.language,
        about: isPortuguese
          ? ['Treino personalizado', 'Osteopatia', 'Exercício oncológico', 'Saúde e bem-estar']
          : ['Personal training', 'Osteopathy', 'Oncology exercise', 'Health and wellbeing'],
        isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
        publisher: { '@id': `${SITE_ORIGIN}/#business` }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: isPortuguese ? 'Início' : 'Home', item: new URL(home, SITE_ORIGIN).href },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: new URL(page.path, SITE_ORIGIN).href }
        ]
      }
    ]
  };
  const json = JSON.stringify(schema, null, 2).split('\n').map((line) => `    ${line}`).join('\n');
  return `
    <script nonce="pmorais-2026" type="application/ld+json">
${json}
    </script>`;
}

function seoBlock(page) {
  const canonical = new URL(page.path, SITE_ORIGIN).href;
  const { portuguesePath, englishPath } = pageAlternates(page);
  const alternateLocale = page.language === 'pt-PT' ? 'en_GB' : 'pt_PT';
  const locale = page.language.replace('-', '_');
  return `    <!-- SEO Architecture: generated from scripts/seo-config.mjs -->
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    <meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    <meta name="author" content="Paulo Morais">
    <link rel="canonical" href="${canonical}">
    <link rel="alternate" hreflang="pt-PT" href="${new URL(portuguesePath, SITE_ORIGIN).href}">
    <link rel="alternate" hreflang="en-GB" href="${new URL(englishPath, SITE_ORIGIN).href}">
    <link rel="alternate" hreflang="x-default" href="${new URL(portuguesePath, SITE_ORIGIN).href}">
    <link rel="alternate" type="text/plain" href="${SITE_ORIGIN}/llms.txt" title="LLM summary">
    <link rel="alternate" type="text/plain" href="${SITE_ORIGIN}/llms-full.txt" title="Expanded LLM content">
    <meta property="og:type" content="${page.ogType}">
    <meta property="og:site_name" content="Paulo Morais">
    <meta property="og:url" content="${canonical}">
    <meta property="og:locale" content="${locale}">
    <meta property="og:locale:alternate" content="${alternateLocale}">
    <meta property="og:title" content="${escapeHtml(page.title)}">
    <meta property="og:description" content="${escapeHtml(page.description)}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:image:alt" content="Paulo Morais — Your Own Workout">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(page.title)}">
    <meta name="twitter:description" content="${escapeHtml(page.description)}">
    <meta name="twitter:image" content="${imageUrl}">
    <meta name="twitter:image:alt" content="Paulo Morais — Your Own Workout">${blogSchema(page)}
    <!-- /SEO Architecture -->`;
}

function setDescription(html, description) {
  const tag = `<meta name="description" content="${escapeHtml(description)}">`;
  const regex = /<meta\s+name=["']description["'][^>]*>/i;
  if (regex.test(html)) return html.replace(regex, tag);
  const viewport = /<meta\s+name=["']viewport["'][^>]*>/i;
  return html.replace(viewport, (match) => `${match}\n    ${tag}`);
}

function setRobots(html, content) {
  const tag = `<meta name="robots" content="${content}">`;
  const regex = /<meta\s+name=["']robots["'][^>]*>/i;
  if (regex.test(html)) return html.replace(regex, tag);
  const viewport = /<meta\s+name=["']viewport["'][^>]*>/i;
  return html.replace(viewport, (match) => `${match}\n    ${tag}`);
}

for (const page of PUBLIC_PAGES) {
  let html = fs.readFileSync(page.file, 'utf8');
  html = html.replace(/<html\s+lang=["'][^"']+["']>/i, `<html lang="${page.language}">`);
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`);
  html = setDescription(html, page.description);

  const generated = seoBlock(page);
  const generatedRegex = /    <!-- SEO Architecture:[\s\S]*?    <!-- \/SEO Architecture -->/;
  const legacyRegex = /    <!-- SEO Meta Tags -->[\s\S]*?(?=    <!-- (?:PWA Meta Tags|Schema\.org JSON-LD))/;
  if (generatedRegex.test(html)) {
    html = html.replace(generatedRegex, generated);
  } else if (legacyRegex.test(html)) {
    html = html.replace(legacyRegex, `${generated}\n`);
  } else {
    html = html.replace('</head>', `${generated}\n</head>`);
  }
  // Some older biography templates placed their SEO block immediately before
  // JSON-LD, while other templates placed it before the PWA block.
  html = html.replace(/    <!-- SEO Meta Tags -->[\s\S]*?(?=    <!-- (?:PWA Meta Tags|Schema\.org JSON-LD))/g, '');

  fs.writeFileSync(page.file, html);
}

// The static CSP permits this known GTM bootstrap through the same nonce used
// by the site's other trusted inline scripts.
for (const directory of ['.', 'en']) {
  for (const name of fs.readdirSync(directory).filter((entry) => entry.endsWith('.html') && !entry.startsWith('google'))) {
    const file = path.join(directory, name);
    let html = fs.readFileSync(file, 'utf8');
    html = html.replace(/(<\!-- Google Tag Manager -->\s*)<script>(?=\(function\(w,d,s,l,i\))/, '$1<script nonce="pmorais-2026">');
    fs.writeFileSync(file, html);
  }
}

const publicFiles = new Set(PUBLIC_PAGES.map((page) => page.file));
for (const [file, description] of Object.entries(NON_PUBLIC_DESCRIPTIONS)) {
  if (!fs.existsSync(file) || publicFiles.has(file)) continue;
  let html = fs.readFileSync(file, 'utf8');
  html = setDescription(html, description);
  const isEditorialShell = file === 'artigo.html' || file === 'en/article.html';
  const isLegal = file.endsWith('politica-privacidade.html') || file.endsWith('termos-e-condicoes.html');
  html = setRobots(html, isEditorialShell || isLegal ? 'noindex, follow' : 'noindex, nofollow, noarchive');
  fs.writeFileSync(file, html);
}

// Keep structured-data URLs aligned with Firebase Hosting cleanUrls.
const cleanUrlReplacements = new Map([
  ['/osteopatia.html', '/osteopatia'],
  ['/sobre-mim.html', '/sobre-mim'],
  ['/blog.html', '/blog'],
  ['/en/osteopatia.html', '/en/osteopatia'],
  ['/en/sobre-mim.html', '/en/sobre-mim'],
  ['/en/blog.html', '/en/blog']
]);
for (const page of PUBLIC_PAGES) {
  let html = fs.readFileSync(page.file, 'utf8');
  for (const [from, to] of cleanUrlReplacements) {
    html = html.replaceAll(`${SITE_ORIGIN}${from}`, `${SITE_ORIGIN}${to}`);
  }
  fs.writeFileSync(page.file, html);
}

console.log(`Applied SEO metadata to ${PUBLIC_PAGES.length} public pages and noindex rules to private/support pages.`);
