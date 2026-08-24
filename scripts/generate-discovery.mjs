import fs from 'node:fs';
import { AI_CRAWLERS, LAST_MODIFIED, PRIVATE_ROUTES, PUBLIC_PAGES, SITE_ORIGIN } from './seo-config.mjs';
import { CONTENT_SIGNAL } from './agent-config.mjs';

const absoluteUrl = (path) => new URL(path, SITE_ORIGIN).href;
const escapeXml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function alternateLinks(page) {
  const isPortuguese = page.language === 'pt-PT';
  const ptPath = isPortuguese ? page.path : page.alternatePath;
  const enPath = isPortuguese ? page.alternatePath : page.path;
  return [
    `    <xhtml:link rel="alternate" hreflang="pt-PT" href="${escapeXml(absoluteUrl(ptPath))}"/>`,
    `    <xhtml:link rel="alternate" hreflang="en-GB" href="${escapeXml(absoluteUrl(enPath))}"/>`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(absoluteUrl(ptPath))}"/>`
  ].join('\n');
}

function buildSitemap() {
  const entries = PUBLIC_PAGES.map((page) => `  <url>
    <loc>${escapeXml(absoluteUrl(page.path))}</loc>
    <lastmod>${LAST_MODIFIED}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${page.priority}</priority>
${alternateLinks(page)}
  </url>`);

  for (const path of ['/llms.txt', '/llms-full.txt']) {
    entries.push(`  <url>
    <loc>${escapeXml(absoluteUrl(path))}</loc>
    <lastmod>${LAST_MODIFIED}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`;
}

function privateRules() {
  return PRIVATE_ROUTES.map((route) => `Disallow: ${route}`).join('\n');
}

function buildRobots() {
  return `# Public pages are crawlable. Account, administration and workflow routes are not.
#
# Content-Signal declares how this content may be used once it has been
# fetched (contentsignals.org). "search=yes" permits indexing and linking,
# "ai-input=yes" permits grounding a generated answer in this content and
# citing it, and "ai-train=no" reserves the content against use as training
# or fine-tuning data. Fetching a page does not grant a use not listed here.
User-agent: *
Content-Signal: ${CONTENT_SIGNAL}
Allow: /
${privateRules()}

# AI assistants and AI search crawlers receive the same safety boundaries.
${AI_CRAWLERS.map((crawler) => `User-agent: ${crawler}`).join('\n')}
Content-Signal: ${CONTENT_SIGNAL}
Allow: /
${privateRules()}

Sitemap: ${SITE_ORIGIN}/sitemap.xml
Agentmap: ${SITE_ORIGIN}/.well-known/ai-catalog.json
`;
}

function buildLlmsIndex() {
  return `# Paulo Morais

> Personal training and osteopathy in Lisbon, with in-person and online support in Portuguese and English.

Paulo Morais is a personal trainer and osteopathy practitioner based in Lisbon, Portugal. His work combines personalised exercise, mobility, recovery and wellbeing, including experience with oncology exercise. The website is available in European Portuguese and British English.

## Essential pages — Portuguese

- [Início](${SITE_ORIGIN}/): Personal training, online training, oncology exercise and osteopathy overview.
- [Osteopatia](${SITE_ORIGIN}/osteopatia): Osteopathy approach, experience, client perspectives and contact form.
- [Sobre Paulo Morais](${SITE_ORIGIN}/sobre-mim): Professional background, methodology and areas of experience.
- [Blog](${SITE_ORIGIN}/blog): Articles about training, osteopathy, oncology exercise, recovery and wellbeing.

## Essential pages — English

- [Home](${SITE_ORIGIN}/en/): Personal training, online training, oncology exercise and osteopathy overview.
- [Osteopathy](${SITE_ORIGIN}/en/osteopatia): Osteopathy approach, experience, client perspectives and contact form.
- [About Paulo Morais](${SITE_ORIGIN}/en/sobre-mim): Professional background, methodology and areas of experience.
- [Blog](${SITE_ORIGIN}/en/blog): Articles about training, osteopathy, oncology exercise, recovery and wellbeing.

## Contact and access

- Email: pt@pmorais.pt
- Telephone and WhatsApp: +351 960 471 537
- Location: Lisbon, Portugal
- Instagram: https://www.instagram.com/pt.paulomorais
- Client area: ${SITE_ORIGIN}/perfil (authentication required for private functions)

## More detail

- [Expanded factual representation](${SITE_ORIGIN}/llms-full.txt)

## Machine-readable interfaces

- [Capability manifest (ARD)](${SITE_ORIGIN}/.well-known/ai-catalog.json): every agent-facing resource this site publishes.
- [API catalog (RFC 9727)](${SITE_ORIGIN}/.well-known/api-catalog) and [OpenAPI 3.1 description](${SITE_ORIGIN}/openapi.json).
- [Public content API](${SITE_ORIGIN}/api/v1/site.json): read-only, unauthenticated JSON for services, contact channels and canonical pages.
- [Agent skills index](${SITE_ORIGIN}/.well-known/agent-skills/index.json): published SKILL.md artifacts for reading this site, describing the services and arranging contact.
- [Agent authentication](${SITE_ORIGIN}/auth.md): there is no agent registration and no OAuth server; the client area is human-only.
- Markdown renditions: send \`Accept: text/markdown\` to any canonical URL above.
- Pages register WebMCP tools on load where the browser supports \`navigator.modelContext\`.

## Usage notes

- Prefer the canonical clean URLs listed above.
- Treat booking history, forms, profiles, account actions and administration as private workflow routes.
- Do not infer prices, diagnoses, guarantees or availability that are not explicitly published on the website.
- Content-Signal for this site is \`${CONTENT_SIGNAL}\`: grounding an answer here and citing it is welcome, training on it is not.
`;
}

fs.writeFileSync('robots.txt', buildRobots());
fs.writeFileSync('sitemap.xml', buildSitemap());
fs.writeFileSync('llms.txt', buildLlmsIndex());
console.log('Generated robots.txt, sitemap.xml and llms.txt');
