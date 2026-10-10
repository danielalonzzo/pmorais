import fs from 'node:fs';
import path from 'node:path';
import { LOCALES, NON_PUBLIC_DESCRIPTIONS, PUBLIC_PAGES, SITE_ORIGIN, assertPublicPages, localizedPages, pageAlternates } from './seo-config.mjs';
import { MARKDOWN_DIR } from './agent-config.mjs';
import { structuredData } from './structured-data.mjs';

const imageUrl = `${SITE_ORIGIN}/images/logo/paulo_morais-08.png`;

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('&amp;amp;', '&amp;');
}

function plainText(fragment) {
  return fragment.replace(/<\/(?:p|li|h\d)>/g, ' ').replace(/<[^>]+>/g, '')
    .replaceAll('&nbsp;', ' ').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ').trim();
}

// Visible FAQ blocks (`.service-faq` or `.pm-faq`, one <article> per
// question, or one <details> with the <h3> inside <summary> when the answer
// opens on tap) become FAQPage markup, so structured answers cannot drift
// from the text a visitor reads on the page.
function visibleFaq(html) {
  const faq = [];
  for (const [, block] of html.matchAll(/<div class="(?:service-faq|pm-faq)\b[^"]*">([\s\S]*?)<\/div>/g)) {
    for (const [, , question, answer] of block.matchAll(/<(article|details)>\s*(?:<summary>\s*)?<h3>([\s\S]*?)<\/h3>(?:\s*<\/summary>)?([\s\S]*?)<\/\1>/g)) {
      faq.push({ question: plainText(question), answer: plainText(answer) });
    }
  }
  return faq;
}

function schemaBlock(page, html) {
  const json = JSON.stringify(structuredData(page, { faq: visibleFaq(html) }), null, 2).replaceAll('<', '\\u003c');
  return `
    <script nonce="pmorais-2026" type="application/ld+json">
${json}
    </script>`;
}

function markdownRelative(pagePath) {
  const trimmed = pagePath.replace(/^\/+/, '');
  return trimmed === '' || trimmed.endsWith('/') ? `${trimmed}index.md` : `${trimmed}.md`;
}

function seoBlock(page, html) {
  const canonical = new URL(page.path, SITE_ORIGIN).href;
  const alternates = pageAlternates(page).map((entry) =>
    `    <link rel="alternate" hreflang="${entry.language}" href="${new URL(entry.path, SITE_ORIGIN).href}">`).join('\n');
  const alternateLocales = localizedPages(page).filter((entry) => entry.language !== page.language).map((entry) =>
    `    <meta property="og:locale:alternate" content="${LOCALES[entry.language]?.ogLocale ?? entry.language.replace('-', '_')}">`).join('\n');
  const locale = LOCALES[page.language]?.ogLocale ?? page.language.replace('-', '_');
  const markdownUrl = `${SITE_ORIGIN}/${MARKDOWN_DIR}/${markdownRelative(page.path)}`;
  return `    <!-- SEO Architecture: generated from scripts/seo-config.mjs -->
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    <meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    <meta name="author" content="Paulo Morais">
    <link rel="canonical" href="${canonical}">
${alternates}
    <link rel="alternate" type="text/plain" href="${SITE_ORIGIN}/llms.txt" title="LLM summary">
    <link rel="alternate" type="text/plain" href="${SITE_ORIGIN}/llms-full.txt" title="Expanded LLM content">
    <link rel="alternate" type="text/markdown" href="${markdownUrl}" title="Markdown rendition">
    <link rel="ai-catalog" href="/.well-known/ai-catalog.json">
    <link rel="service-desc" type="application/vnd.oai.openapi+json;version=3.1" href="/openapi.json">
    <meta property="og:type" content="${page.ogType}">
    <meta property="og:site_name" content="Paulo Morais">
    <meta property="og:url" content="${canonical}">
    <meta property="og:locale" content="${locale}">
${alternateLocales}
    <meta property="og:title" content="${escapeHtml(page.title)}">
    <meta property="og:description" content="${escapeHtml(page.description)}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:image:alt" content="Paulo Morais — Your Own Workout">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(page.title)}">
    <meta name="twitter:description" content="${escapeHtml(page.description)}">
    <meta name="twitter:image" content="${imageUrl}">
    <meta name="twitter:image:alt" content="Paulo Morais — Your Own Workout">${schemaBlock(page, html)}
    <!-- /SEO Architecture -->`;
}

const LANGUAGE_LINKS = {
  'pt-PT': { code: 'PT', name: 'Português' },
  'en-GB': { code: 'EN', name: 'English' },
  'es': { code: 'ES', name: 'Español' }
};

// The footer switcher links each page to its own published translations, so a
// Spanish page appears there as soon as it is registered in seo-config.mjs.
function setLanguageSwitcher(html, page) {
  const order = Object.keys(LOCALES);
  const translations = localizedPages(page).sort((a, b) => order.indexOf(a.language) - order.indexOf(b.language));
  return html.replace(/(<div class="footer-lang-switcher">\n)([ \t]*)[\s\S]*?(\n[ \t]*<\/div>)/, (match, open, indent, close) => {
    const links = translations.map((entry) => {
      const label = LANGUAGE_LINKS[entry.language] ?? { code: entry.language.toUpperCase(), name: entry.language };
      return `<a href="${entry.path}"${entry.path === page.path ? ' class="active"' : ''} title="${label.name}">${label.code}</a>`;
    });
    return `${open}${indent}${links.join(`\n${indent}<span class="lang-divider">|</span>\n${indent}`)}${close}`;
  });
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

assertPublicPages();
// Validate every source before the first write, so an incomplete locale launch
// cannot leave only part of the site with regenerated metadata.
for (const page of PUBLIC_PAGES) {
  const source = fs.readFileSync(page.file, 'utf8');
  if (!/<head\b[^>]*>[\s\S]*?<\/head>/i.test(source) || !/<title>[\s\S]*?<\/title>/i.test(source)) {
    throw new Error(`${page.file}: missing HTML head or title`);
  }
}

for (const page of PUBLIC_PAGES) {
  let html = fs.readFileSync(page.file, 'utf8');
  html = html.replace(/<html\s+lang=["'][^"']+["']>/i, `<html lang="${page.language}">`);
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`);
  html = setDescription(html, page.description);
  html = setLanguageSwitcher(html, page);

  // Replace legacy per-template graphs with the shared provider/service graph.
  // Metadata and visible page content now describe the same service catalogue.
  html = html.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
  const generated = seoBlock(page, html);
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

  // Wire WebMCP tool registration alongside script.js
  if (!html.includes('webmcp.js')) {
    const anchor = /([ \t]*)<script nonce="pmorais-2026" src="((?:\.\.\/)?js\/)script\.js(?:\?v=[^"]*)?" defer><\/script>/;
    const match = anchor.exec(html);
    if (match) {
      html = html.replace(anchor, `${match[0]}\n${match[1]}<script nonce="pmorais-2026" src="${match[2]}webmcp.js" defer></script>`);
    }
  }

  fs.writeFileSync(page.file, html);
}

// The static CSP permits this known GTM bootstrap through the same nonce used
// by the site's other trusted inline scripts.
for (const directory of ['.', 'en', 'es'].filter((entry) => fs.existsSync(entry))) {
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
const cleanUrlReplacements = new Map(PUBLIC_PAGES
  .filter((page) => !page.file.endsWith('/index.html') && page.file !== 'index.html')
  .map((page) => [`/${page.file}`, page.path]));
for (const page of PUBLIC_PAGES) {
  let html = fs.readFileSync(page.file, 'utf8');
  for (const [from, to] of cleanUrlReplacements) {
    html = html.replaceAll(`${SITE_ORIGIN}${from}`, `${SITE_ORIGIN}${to}`);
  }
  fs.writeFileSync(page.file, html);
}

console.log(`Applied SEO metadata to ${PUBLIC_PAGES.length} public pages and noindex rules to private/support pages.`);
