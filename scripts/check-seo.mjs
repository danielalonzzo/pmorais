import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSET_VERSION, LAST_MODIFIED, PRIVATE_ROUTES, PUBLIC_PAGES, SITE_ORIGIN } from './seo-config.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const notes = [];
const fail = (message) => failures.push(message);

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function occurrences(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

function stripCode(source) {
  return source.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '');
}

function absoluteUrl(urlPath) {
  return new URL(urlPath, SITE_ORIGIN).href;
}

function hasLink(source, rel, href) {
  const links = source.match(/<link\b[^>]*>/gi) ?? [];
  return links.some((link) => new RegExp(`\\brel=["']${rel}["']`, 'i').test(link)
    && new RegExp(`\\bhref=["']${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'i').test(link));
}

for (const page of PUBLIC_PAGES) {
  const html = read(page.file);
  const visible = stripCode(html);
  const expectedCanonical = absoluteUrl(page.path);
  const isPortuguese = page.language === 'pt-PT';
  const ptPath = isPortuguese ? page.path : page.alternatePath;
  const enPath = isPortuguese ? page.alternatePath : page.path;

  if (!new RegExp(`<html\\s+lang=["']${page.language}["']`, 'i').test(html)) fail(`${page.file}: incorrect html lang`);
  if (!hasLink(html, 'canonical', expectedCanonical)) fail(`${page.file}: missing clean canonical ${expectedCanonical}`);
  if (!html.includes(`<title>${page.title}</title>`)) fail(`${page.file}: title differs from scripts/seo-config.mjs`);
  if (!html.includes(`hreflang="pt-PT" href="${absoluteUrl(ptPath)}"`)) fail(`${page.file}: missing pt-PT alternate`);
  if (!html.includes(`hreflang="en-GB" href="${absoluteUrl(enPath)}"`)) fail(`${page.file}: missing en-GB alternate`);
  if (!html.includes(`hreflang="x-default" href="${absoluteUrl(ptPath)}"`)) fail(`${page.file}: missing x-default alternate`);
  if (occurrences(html, /hreflang=/gi) !== 3) fail(`${page.file}: expected exactly 3 hreflang declarations`);
  if (!/<meta\s+name=["']description["'][^>]+content=["'][^"']{50,}["']/i.test(html)) fail(`${page.file}: missing or short meta description`);
  if (!/<meta\s+name=["']robots["'][^>]+content=["'][^"']*index[^"']*follow/i.test(html)) fail(`${page.file}: missing index/follow directive`);
  for (const signal of ['og:title', 'og:description', 'og:url', 'og:image']) {
    if (!html.includes(`property="${signal}"`)) fail(`${page.file}: missing ${signal}`);
  }
  for (const signal of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
    if (!html.includes(`name="${signal}"`)) fail(`${page.file}: missing ${signal}`);
  }
  for (const llmFile of ['llms.txt', 'llms-full.txt']) {
    if (!html.includes(`type="text/plain" href="${SITE_ORIGIN}/${llmFile}"`)) fail(`${page.file}: missing ${llmFile} discovery link`);
  }
  if (occurrences(visible, /<main\b/gi) !== 1) fail(`${page.file}: expected exactly one main element`);
  if (occurrences(visible, /<h1\b/gi) !== 1) fail(`${page.file}: expected exactly one H1`);
  for (const image of visible.match(/<img\b[^>]*>/gi) ?? []) {
    if (!/\balt=["'][^"']*["']/i.test(image)) fail(`${page.file}: image without alt: ${image.slice(0, 100)}`);
  }
  const jsonLdBlocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  if (!jsonLdBlocks.length) fail(`${page.file}: missing JSON-LD`);
  for (const [, json] of jsonLdBlocks) {
    try { JSON.parse(json); } catch (error) { fail(`${page.file}: invalid JSON-LD (${error.message})`); }
  }
}

const htmlFiles = fs.readdirSync(root).filter((name) => name.endsWith('.html'))
  .concat(fs.readdirSync(path.join(root, 'en')).filter((name) => name.endsWith('.html')).map((name) => `en/${name}`))
  .filter((name) => !name.startsWith('google'));
const publicFiles = new Set(PUBLIC_PAGES.map((page) => page.file));
for (const file of htmlFiles) {
  if (publicFiles.has(file)) continue;
  const html = read(file);
  if (!/<meta\s+name=["']robots["'][^>]+content=["']noindex/i.test(html)) fail(`${file}: non-public/support page must be noindex`);
  if (!/<meta\s+name=["']description["'][^>]+content=["'][^"']+["']/i.test(html)) fail(`${file}: missing support-page description`);
}

const sitemap = read('sitemap.xml');
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const expectedSitemapUrls = PUBLIC_PAGES.map((page) => absoluteUrl(page.path)).concat(`${SITE_ORIGIN}/llms.txt`, `${SITE_ORIGIN}/llms-full.txt`);
if (JSON.stringify(sitemapUrls) !== JSON.stringify(expectedSitemapUrls)) fail('sitemap.xml URLs do not match scripts/seo-config.mjs');
if (sitemapUrls.some((url) => url.endsWith('.html'))) fail('sitemap.xml contains non-canonical .html URLs');

const robots = read('robots.txt');
for (const route of PRIVATE_ROUTES) {
  const count = occurrences(robots, new RegExp(`^Disallow: ${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'gm'));
  if (count !== 2) fail(`robots.txt: ${route} must be blocked for general and named AI crawlers`);
}
if (!robots.includes(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`)) fail('robots.txt: missing sitemap declaration');

const firebaseConfig = JSON.parse(read('firebase.json'));
const globalHeaders = firebaseConfig.hosting?.headers?.find((entry) => entry.source === '**')?.headers ?? [];
const csp = globalHeaders.find((header) => header.key === 'Content-Security-Policy')?.value ?? '';
for (const requiredSource of [
  "script-src 'self' 'nonce-pmorais-2026'",
  "script-src-attr 'unsafe-inline'",
  "style-src-attr 'unsafe-inline'",
  "font-src 'self'",
  'https://www.googletagmanager.com',
  "frame-ancestors 'none'"
]) {
  if (!csp.includes(requiredSource)) fail(`firebase.json: CSP missing ${requiredSource}`);
}
for (const ignoredPath of ['functions/**', 'scripts/**', 'tests/**', 'scratch/**', 'package.json', 'package-lock.json', 'firestore.rules', 'firestore.indexes.json']) {
  if (!firebaseConfig.hosting?.ignore?.includes(ignoredPath)) fail(`firebase.json: hosting must exclude ${ignoredPath}`);
}

for (const file of htmlFiles) {
  const html = read(file);
  if (/<!-- Google Tag Manager -->\s*<script>(?=\(function\(w,d,s,l,i\))/i.test(html)) fail(`${file}: GTM bootstrap lacks CSP nonce`);
  if (/https:\/\/pmorais\.pt\/[^"'\s]+\.html/i.test(html)) fail(`${file}: contains an absolute legacy .html URL`);
  for (const match of html.matchAll(/src=["']([^"']*(?:lang|cookie-consent|script|theme)\.js(?:\?v=[^"']*)?)["']/g)) {
    if (!match[1].endsWith(`?v=${ASSET_VERSION}`)) fail(`${file}: shared script lacks current cache version: ${match[1]}`);
  }
  for (const match of html.matchAll(/href=["']([^"']*css\/style\.css(?:\?v=[^"']*)?)["']/g)) {
    if (!match[1].endsWith(`?v=${ASSET_VERSION}`)) fail(`${file}: shared stylesheet lacks current cache version: ${match[1]}`);
  }
  for (const match of html.matchAll(/from\s+["']([^"']*\/blog\.js(?:\?v=[^"']*)?)["']/g)) {
    if (!match[1].endsWith(`?v=${ASSET_VERSION}`)) fail(`${file}: blog module lacks current cache version: ${match[1]}`);
  }
  if (file.startsWith('en/') && html.includes('aria-label="Abrir menu de navegação"')) fail(`${file}: English menu has a Portuguese accessible name`);
}

for (const file of ['js/cookie-consent.js', 'js/script.js', 'en/js/script.js', 'js/blog.js', 'functions/index.js', 'manifest.json', 'sw.js']) {
  const source = read(file);
  const legacy = source.match(/(?:pmorais\.pt\/|["'`])[^"'`\s]*\.html(?=[?#"'`])/);
  if (legacy) fail(`${file}: contains legacy navigation URL ${legacy[0]}`);
}

const llms = read('llms.txt');
const llmsFull = read('llms-full.txt');
for (const page of PUBLIC_PAGES) {
  const url = absoluteUrl(page.path);
  if (!llms.includes(url)) fail(`llms.txt: missing ${url}`);
  if (!llmsFull.includes(url)) fail(`llms-full.txt: missing ${url}`);
}
if (!llms.includes(`${SITE_ORIGIN}/llms-full.txt`)) fail('llms.txt: missing expanded representation link');
if (!llmsFull.includes(`Last internally verified: ${LAST_MODIFIED}`)) fail('llms-full.txt: verification date differs from scripts/seo-config.mjs');

// Check local HTML navigation targets without making network requests.
for (const file of htmlFiles) {
  const html = stripCode(read(file));
  for (const [, rawHref] of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    if (/^(?:https?:|mailto:|tel:|sms:|whatsapp:|#|javascript:)/i.test(rawHref)) continue;
    const href = rawHref.split('#')[0].split('?')[0];
    if (!href) continue;
    const decoded = decodeURIComponent(href);
    const resolved = decoded.startsWith('/') ? path.join(root, decoded) : path.resolve(root, path.dirname(file), decoded);
    const candidates = [resolved, `${resolved}.html`, path.join(resolved, 'index.html')];
    if (!candidates.some((candidate) => fs.existsSync(candidate))) fail(`${file}: broken internal link ${rawHref}`);
  }
}

// Check static asset references as well. This catches wrong ../ prefixes in
// language folders and missing files before a cPanel deployment can create 404s.
for (const file of htmlFiles) {
  const html = read(file);
  for (const match of html.matchAll(/<(?:link|script|img|source|video)\b[^>]*?\b(?:src|href|poster)=["']([^"']+)["'][^>]*>/gi)) {
    const rawReference = match[1];
    if (/^(?:https?:|data:|blob:|\/\/)/i.test(rawReference)) continue;
    const reference = rawReference.split(/[?#]/)[0];
    if (!reference) continue;
    const resolved = reference.startsWith('/')
      ? path.join(root, reference)
      : path.resolve(root, path.dirname(file), reference);
    if (!fs.existsSync(resolved)) fail(`${file}: missing local asset ${rawReference}`);
  }
}

for (const cssFile of ['css/style.css', 'css/tokens.css', 'css/typography.css', 'css/components/breadcrumb.css']) {
  const css = read(cssFile);
  for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    const rawReference = match[1].trim();
    if (/^(?:https?:|data:|blob:|#|var\()/i.test(rawReference)) continue;
    const reference = rawReference.split(/[?#]/)[0];
    const resolved = path.resolve(root, path.dirname(cssFile), reference);
    if (!fs.existsSync(resolved)) fail(`${cssFile}: missing local asset ${rawReference}`);
  }
}

notes.push(`${PUBLIC_PAGES.length} canonical pages checked`);
notes.push(`${htmlFiles.length - PUBLIC_PAGES.length} non-public/support pages checked for noindex`);
notes.push(`${sitemapUrls.length} sitemap URLs checked`);
notes.push(`${htmlFiles.length} pages checked for local link targets`);
notes.push(`${htmlFiles.length} pages checked for local assets`);

if (failures.length) {
  console.error(`SEO validation failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`SEO validation passed: ${notes.join('; ')}.`);
