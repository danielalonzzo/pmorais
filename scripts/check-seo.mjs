import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSET_VERSION, LAST_MODIFIED, PRIVATE_ROUTES, PUBLIC_PAGES, SITE_ORIGIN } from './seo-config.mjs';
import { eachLocalModuleSpecifier, localModules } from './asset-versioning.mjs';
import { AGENT_SKILLS, API_BASE, CONTENT_SIGNAL, LINK_HEADER_RELATIONS, MARKDOWN_DIR } from './agent-config.mjs';
import crypto from 'node:crypto';

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
const modules = localModules(root);
for (const directory of ['js', 'en/js']) {
  for (const name of fs.readdirSync(path.join(root, directory)).filter((entry) => entry.endsWith('.js'))) {
    const relative = `${directory}/${name}`;
    eachLocalModuleSpecifier(read(relative), modules, (specifier, query) => {
      if (query !== `?v=${ASSET_VERSION}`) fail(`${relative}: import lacks current cache version: ${specifier}${query}`);
    });
  }
}

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
  eachLocalModuleSpecifier(html, modules, (specifier, query) => {
    if (query !== `?v=${ASSET_VERSION}`) fail(`${file}: local script lacks current cache version: ${specifier}${query}`);
  });
  for (const match of html.matchAll(/href=["']([^"']*css\/style\.css(?:\?v=[^"']*)?)["']/g)) {
    if (!match[1].endsWith(`?v=${ASSET_VERSION}`)) fail(`${file}: shared stylesheet lacks current cache version: ${match[1]}`);
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

// ---------------------------------------------------------- agent surface --
//
// The machine-readable surface is generated by scripts/generate-agent-discovery.mjs.
// These checks fail when a generated document, the Apache configuration and the
// HTML have drifted apart — the failure mode that leaves agents fetching a 404
// advertised by a Link header.

function readJsonFile(relativePath) {
  try {
    return JSON.parse(read(relativePath));
  } catch (error) {
    fail(`${relativePath}: ${error.code === 'ENOENT' ? 'missing — run npm run agents:generate' : `invalid JSON (${error.message})`}`);
    return null;
  }
}

// Resolves an on-origin URL back to the file that answers it.
function localTargetFor(url) {
  if (!url.startsWith(SITE_ORIGIN)) return null;
  const urlPath = decodeURIComponent(new URL(url).pathname);
  const candidates = urlPath.endsWith('/')
    ? [path.join(root, urlPath, 'index.html')]
    : [path.join(root, urlPath), `${path.join(root, urlPath)}.html`, path.join(root, urlPath, 'index.html')];
  return candidates.some((candidate) => fs.existsSync(candidate)) ? urlPath : false;
}

function checkOriginUrls(label, urls) {
  for (const url of new Set(urls)) {
    if (localTargetFor(url) === false) fail(`${label}: advertises ${url}, which no local file answers`);
  }
}

const htaccess = read('.htaccess');
for (const link of LINK_HEADER_RELATIONS) {
  const parameters = link.type ? `; rel=\\"${link.rel}\\"; type=\\"${link.type}\\"` : `; rel=\\"${link.rel}\\"`;
  if (!htaccess.includes(`Header always add Link "<${link.href}>${parameters}"`)) {
    fail(`.htaccess: missing Link header for rel="${link.rel}" -> ${link.href}`);
  }
  if (localTargetFor(absoluteUrl(link.href)) === false) fail(`.htaccess: Link header points at missing ${link.href}`);
}
if (!/RewriteCond %\{HTTP:Accept\} text\/markdown/.test(htaccess)) fail('.htaccess: missing Accept: text/markdown content negotiation');
if (!htaccess.includes('Header always append Vary "Accept"')) fail('.htaccess: HTML responses must Vary on Accept when markdown is negotiated');

// Markdown renditions: one per canonical page, each with a declared token count.
for (const page of PUBLIC_PAGES) {
  const trimmed = page.path.replace(/^\/+/, '');
  const relative = `${MARKDOWN_DIR}/${trimmed === '' || trimmed.endsWith('/') ? `${trimmed}index.md` : `${trimmed}.md`}`;
  if (!fs.existsSync(path.join(root, relative))) {
    fail(`${relative}: missing markdown rendition — run npm run agents:generate`);
    continue;
  }
  const markdown = read(relative);
  if (!markdown.includes(`canonical: "${absoluteUrl(page.path)}"`)) fail(`${relative}: canonical does not match scripts/seo-config.mjs`);
  const directoryRules = read(`${path.posix.dirname(relative)}/.htaccess`);
  const declared = new RegExp(`<Files "${path.posix.basename(relative)}">\\s*Header set x-markdown-tokens "(\\d+)"`).exec(directoryRules);
  if (!declared) fail(`${relative}: no x-markdown-tokens header declared`);
  else if (Number(declared[1]) !== Math.max(1, Math.ceil(markdown.length / 4))) fail(`${relative}: declared token count is stale — run npm run agents:generate`);
  if (!/^---\n/.test(markdown)) fail(`${relative}: missing front matter`);
}

// RFC 9727 API catalog.
const catalog = readJsonFile('.well-known/api-catalog');
if (catalog) {
  if (!Array.isArray(catalog.linkset) || !catalog.linkset.length) fail('.well-known/api-catalog: linkset must be a non-empty array');
  for (const entry of catalog.linkset ?? []) {
    if (!entry.anchor) fail('.well-known/api-catalog: entry without an anchor');
    for (const relation of ['service-desc', 'service-doc']) {
      if (!Array.isArray(entry[relation]) || !entry[relation].length) fail(`.well-known/api-catalog: ${entry.anchor} lacks ${relation}`);
    }
    checkOriginUrls('.well-known/api-catalog', Object.values(entry)
      .filter(Array.isArray).flat().map((link) => link.href).filter(Boolean));
  }
}

// OpenAPI description.
const openapi = readJsonFile('openapi.json');
if (openapi) {
  if (!/^3\.1\./.test(openapi.openapi ?? '')) fail('openapi.json: expected an OpenAPI 3.1 document');
  if (openapi.servers?.[0]?.url !== API_BASE) fail(`openapi.json: server should be ${API_BASE}`);
  for (const route of Object.keys(openapi.paths ?? {})) {
    if (!fs.existsSync(path.join(root, 'api/v1', route))) fail(`openapi.json: documents ${route}, which does not exist under api/v1/`);
  }
  const documented = new Set(Object.keys(openapi.paths ?? {}).map((route) => route.replace(/^\//, '')));
  for (const name of fs.readdirSync(path.join(root, 'api/v1')).filter((entry) => entry.endsWith('.json'))) {
    if (!documented.has(name)) fail(`openapi.json: api/v1/${name} is served but not documented`);
  }
}

// ARD capability manifest.
const aiCatalog = readJsonFile('.well-known/ai-catalog.json');
if (aiCatalog) {
  if (typeof aiCatalog.specVersion !== 'string' || !aiCatalog.specVersion) fail('.well-known/ai-catalog.json: specVersion must be a non-empty string');
  if (!aiCatalog.host?.identifier || !aiCatalog.host?.displayName) fail('.well-known/ai-catalog.json: host needs identifier and displayName');
  if (!Array.isArray(aiCatalog.entries) || !aiCatalog.entries.length) fail('.well-known/ai-catalog.json: entries must be a non-empty array');
  for (const entry of aiCatalog.entries ?? []) {
    const label = entry.identifier ?? '(no identifier)';
    if (!/^urn:air:pmorais\.pt:[a-z0-9-]+:[a-z0-9-]+$/.test(entry.identifier ?? '')) fail(`.well-known/ai-catalog.json: ${label} is not a urn:air:<fqdn>:<namespace>:<name> identifier`);
    if (!entry.displayName) fail(`.well-known/ai-catalog.json: ${label} has no displayName`);
    if (!entry.type) fail(`.well-known/ai-catalog.json: ${label} has no media type`);
    if (Boolean(entry.url) === Boolean(entry.data)) fail(`.well-known/ai-catalog.json: ${label} needs exactly one of url or data`);
    const queries = entry.representativeQueries ?? [];
    if (queries.length < 2 || queries.length > 5) fail(`.well-known/ai-catalog.json: ${label} needs 2-5 representativeQueries, has ${queries.length}`);
  }
  checkOriginUrls('.well-known/ai-catalog.json', aiCatalog.entries?.map((entry) => entry.url).filter(Boolean) ?? []);
}

// Agent skills discovery index.
const skillsIndex = readJsonFile('.well-known/agent-skills/index.json');
if (skillsIndex) {
  if (skillsIndex.$schema !== 'https://schemas.agentskills.io/discovery/0.2.0/schema.json') fail('.well-known/agent-skills/index.json: unexpected $schema');
  if (skillsIndex.skills?.length !== AGENT_SKILLS.length) fail(`.well-known/agent-skills/index.json: expected ${AGENT_SKILLS.length} skills`);
  for (const skill of skillsIndex.skills ?? []) {
    if (!/^[a-z0-9-]+$/.test(skill.name ?? '')) fail(`.well-known/agent-skills/index.json: invalid skill name ${skill.name}`);
    if (skill.type !== 'skill-md') fail(`.well-known/agent-skills/index.json: ${skill.name} must be type skill-md`);
    if (!skill.description) fail(`.well-known/agent-skills/index.json: ${skill.name} has no description`);
    const relative = `.well-known/agent-skills/${skill.name}/SKILL.md`;
    if (!fs.existsSync(path.join(root, relative))) {
      fail(`${relative}: indexed but missing`);
      continue;
    }
    const digest = `sha256:${crypto.createHash('sha256').update(read(relative), 'utf8').digest('hex')}`;
    if (skill.digest !== digest) fail(`${relative}: digest is stale — run npm run agents:generate`);
    if (skill.url !== absoluteUrl(`/${relative}`)) fail(`${relative}: indexed under the wrong URL`);
  }
}

// Agent authentication posture.
const authMd = read('auth.md');
if (!/^#\s.*auth\.md/im.test(authMd)) fail('auth.md: needs an H1 heading containing "auth.md"');
for (const route of PRIVATE_ROUTES) {
  if (!authMd.includes(absoluteUrl(route))) fail(`auth.md: does not list ${route} as off limits`);
}

// Content signals and the ARD robots.txt pointer.
if (occurrences(robots, new RegExp(`^Content-Signal: ${CONTENT_SIGNAL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'gm')) !== 2) {
  fail('robots.txt: Content-Signal must be declared for general and named AI crawlers');
}
if (!robots.includes(`Agentmap: ${SITE_ORIGIN}/.well-known/ai-catalog.json`)) fail('robots.txt: missing Agentmap pointer to the ARD manifest');

// Every canonical page advertises the manifest and registers the WebMCP tools.
for (const page of PUBLIC_PAGES) {
  const html = read(page.file);
  if (!hasLink(html, 'ai-catalog', '/.well-known/ai-catalog.json')) fail(`${page.file}: missing ai-catalog discovery link`);
  if (!/<link\b[^>]*type=["']text\/markdown["'][^>]*>/i.test(html)) fail(`${page.file}: missing markdown rendition link`);
  if (!/<script\b[^>]*src=["'][^"']*webmcp\.js\?v=/i.test(html)) fail(`${page.file}: missing WebMCP tool registration`);
}
for (const file of ['js/webmcp.js', 'en/js/webmcp.js']) {
  const source = read(file);
  if (!source.includes('navigator.modelContext')) fail(`${file}: does not feature-detect navigator.modelContext`);
  if (!source.includes('registerTool')) fail(`${file}: does not register any WebMCP tool`);
}
if (read('js/webmcp.js') !== read('en/js/webmcp.js')) fail('en/js/webmcp.js has drifted from js/webmcp.js');

notes.push(`${PUBLIC_PAGES.length} markdown renditions checked`);
notes.push(`${LINK_HEADER_RELATIONS.length} Link relations checked against .htaccess`);
notes.push(`${AGENT_SKILLS.length} agent skills checked against their digests`);

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
