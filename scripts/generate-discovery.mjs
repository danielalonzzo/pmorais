import fs from 'node:fs';
import { AI_CRAWLERS, LAST_MODIFIED, PRIVATE_ROUTES, PUBLIC_PAGES, SITE_ORIGIN } from './seo-config.mjs';

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
User-agent: *
Allow: /
${privateRules()}

# AI assistants and AI search crawlers receive the same safety boundaries.
${AI_CRAWLERS.map((crawler) => `User-agent: ${crawler}`).join('\n')}
Allow: /
${privateRules()}

Sitemap: ${SITE_ORIGIN}/sitemap.xml
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

## Usage notes

- Prefer the canonical clean URLs listed above.
- Treat booking history, forms, profiles, account actions and administration as private workflow routes.
- Do not infer prices, diagnoses, guarantees or availability that are not explicitly published on the website.
`;
}

fs.writeFileSync('robots.txt', buildRobots());
fs.writeFileSync('sitemap.xml', buildSitemap());
fs.writeFileSync('llms.txt', buildLlmsIndex());
console.log('Generated robots.txt, sitemap.xml and llms.txt');
