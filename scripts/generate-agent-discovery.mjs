// Generates every machine-readable surface of the site:
//
//   agents/md/**.md            markdown renditions served on Accept: text/markdown
//   agents/md/**/.htaccess     per-file Content-Type and x-markdown-tokens
//   api/v1/*.json              static read-only JSON API
//   openapi.json               OpenAPI 3.1 description of that API
//   .well-known/api-catalog    RFC 9727 linkset
//   .well-known/ai-catalog.json           ARD capability manifest
//   .well-known/agent-skills/  skills discovery index + SKILL.md artifacts
//   auth.md                    agent authentication posture
//
// Run with: npm run agents:generate

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { LAST_MODIFIED, PUBLIC_PAGES, PRIVATE_ROUTES, SITE_ORIGIN } from './seo-config.mjs';
import {
  AGENT_SKILLS, API_BASE, API_VERSION, CONTACT, CONTENT_SIGNAL,
  DISCLAIMERS, LINK_HEADER_RELATIONS, MARKDOWN_DIR, ORGANISATION, SERVICES
} from './agent-config.mjs';
import { estimateTokens, extractMain, htmlToMarkdown } from './html-to-markdown.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const written = [];

function write(relativePath, contents) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
  written.push(relativePath);
}

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex');
const absolute = (urlPath) => new URL(urlPath, SITE_ORIGIN).href;

// ---------------------------------------------------------------- markdown --

// '/' -> 'index.md', '/en/' -> 'en/index.md', '/osteopatia' -> 'osteopatia.md'
function markdownRelativePath(pagePath) {
  const trimmed = pagePath.replace(/^\/+/, '');
  return trimmed === '' || trimmed.endsWith('/') ? `${trimmed}index.md` : `${trimmed}.md`;
}

function frontmatter(fields) {
  const lines = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}: ${typeof value === 'string' && /[:#]/.test(value) ? JSON.stringify(value) : value}`);
  return `---\n${lines.join('\n')}\n---\n\n`;
}

// Authenticated and workflow routes never appear as links in a rendition.
const excludeLinks = PRIVATE_ROUTES.map((route) =>
  new RegExp(`^${absolute(route).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[/?#]|$)`, 'i'));

// Pages whose body is assembled client-side need to say so in the rendition.
const DYNAMIC_NOTES = {
  '/blog': 'Article entries on this page are loaded from the site content database after the page renders, so they are not part of this markdown rendition. Fetch the HTML page in a browser context, or ask for a specific article by name.',
  '/en/blog': 'Article entries on this page are loaded from the site content database after the page renders, so they are not part of this markdown rendition. Fetch the HTML page in a browser context, or ask for a specific article by name.'
};

const markdownPages = PUBLIC_PAGES.map((page) => {
  const html = fs.readFileSync(path.join(root, page.file), 'utf8');
  const main = extractMain(html);
  if (!main) throw new Error(`${page.file}: no <main> landmark to render as markdown`);

  const canonical = absolute(page.path);
  const relative = `${MARKDOWN_DIR}/${markdownRelativePath(page.path)}`;
  const isPortuguese = page.language === 'pt-PT';
  const alternate = absolute(page.alternatePath);

  const body = htmlToMarkdown(main, { baseUrl: canonical, excludeLinks });
  const document = frontmatter({
    title: page.title,
    description: page.description,
    canonical,
    language: page.language,
    alternate,
    updated: LAST_MODIFIED,
    source: 'Rendered from the canonical HTML page. The HTML remains authoritative if the two differ.'
  }) + body + `
---

## About this rendition

Canonical HTML: ${canonical}
Other language: ${alternate}
${DYNAMIC_NOTES[page.path] ? `\n${DYNAMIC_NOTES[page.path]}\n` : ''}
No price, session length, schedule or availability is published on this site. Do not infer any. Health content here is informational and is not a diagnosis, a prescription or emergency advice.
`;

  return {
    ...page,
    canonical,
    alternate,
    isPortuguese,
    markdownRelative: relative,
    markdownUrl: absolute(`/${relative}`),
    markdown: document,
    tokens: estimateTokens(document)
  };
});

for (const page of markdownPages) write(page.markdownRelative, page.markdown);

// One .htaccess per markdown directory: Apache merges parent before child, so a
// nested index.md overrides the token count declared by its parent directory.
const markdownDirectories = new Map();
for (const page of markdownPages) {
  const directory = path.posix.dirname(page.markdownRelative);
  if (!markdownDirectories.has(directory)) markdownDirectories.set(directory, []);
  markdownDirectories.get(directory).push(page);
}

for (const [directory, pages] of markdownDirectories) {
  const perFile = pages
    .map((page) => `  <Files "${path.posix.basename(page.markdownRelative)}">
    Header set x-markdown-tokens "${page.tokens}"
  </Files>`)
    .join('\n');

  write(`${directory}/.htaccess`, `# Generated by scripts/generate-agent-discovery.mjs — do not edit by hand.
# Markdown renditions of the canonical pages, served on Accept: text/markdown.

<IfModule mod_headers.c>
  <FilesMatch "\\.md$">
    Header set Content-Type "text/markdown; charset=utf-8"
    Header set Access-Control-Allow-Origin "*"
    Header set Cache-Control "no-cache, must-revalidate"
    Header set X-Robots-Tag "noindex, follow"
    Header set Vary "Accept"
  </FilesMatch>
${perFile}
</IfModule>
`);
}

// -------------------------------------------------------------- static API --

const generatedAt = new Date().toISOString().slice(0, 10);

const apiMeta = {
  api: API_BASE,
  version: API_VERSION,
  generated: generatedAt,
  license: `${SITE_ORIGIN}/termos-e-condicoes`,
  documentation: `${SITE_ORIGIN}/llms-full.txt`
};

write('api/v1/site.json', json({
  ...apiMeta,
  organisation: {
    brand: ORGANISATION.brand,
    legalName: ORGANISATION.legalName,
    vatID: ORGANISATION.vatID,
    practitioner: ORGANISATION.practitioner,
    locality: ORGANISATION.locality,
    country: ORGANISATION.country,
    url: ORGANISATION.url
  },
  languages: ORGANISATION.languages,
  defaultLanguage: ORGANISATION.defaultLanguage,
  contentSignal: CONTENT_SIGNAL,
  resources: {
    services: `${API_BASE}/services.json`,
    contact: `${API_BASE}/contact.json`,
    pages: `${API_BASE}/pages.json`,
    status: `${API_BASE}/status.json`,
    openapi: `${SITE_ORIGIN}/openapi.json`,
    apiCatalog: `${SITE_ORIGIN}/.well-known/api-catalog`,
    aiCatalog: `${SITE_ORIGIN}/.well-known/ai-catalog.json`,
    agentSkills: `${SITE_ORIGIN}/.well-known/agent-skills/index.json`,
    authentication: `${SITE_ORIGIN}/auth.md`,
    llms: `${SITE_ORIGIN}/llms.txt`,
    llmsFull: `${SITE_ORIGIN}/llms-full.txt`,
    sitemap: `${SITE_ORIGIN}/sitemap.xml`
  },
  privateRoutes: PRIVATE_ROUTES.map((route) => absolute(route)),
  disclaimers: DISCLAIMERS
}));

write('api/v1/services.json', json({
  ...apiMeta,
  count: SERVICES.length,
  pricing: null,
  pricingNote: CONTACT.note,
  services: SERVICES.map((service) => ({
    id: service.id,
    name: service.name,
    summary: service.summary,
    delivery: service.delivery,
    area: service.area,
    page: service.page,
    constraints: service.constraints ?? []
  })),
  disclaimers: DISCLAIMERS
}));

write('api/v1/contact.json', json({
  ...apiMeta,
  email: CONTACT.email,
  telephone: CONTACT.telephone,
  whatsapp: CONTACT.whatsapp,
  instagram: CONTACT.instagram,
  locality: CONTACT.locality,
  clientArea: { 'pt-PT': CONTACT.clientArea, 'en-GB': CONTACT.clientAreaEn },
  contactForms: {
    'pt-PT': [`${SITE_ORIGIN}/`, `${SITE_ORIGIN}/osteopatia`],
    'en-GB': [`${SITE_ORIGIN}/en/`, `${SITE_ORIGIN}/en/osteopatia`]
  },
  bookingApi: null,
  note: CONTACT.note
}));

write('api/v1/pages.json', json({
  ...apiMeta,
  count: markdownPages.length,
  pages: markdownPages.map((page) => ({
    path: page.path,
    canonical: page.canonical,
    language: page.language,
    alternate: page.alternate,
    title: page.title,
    description: page.description,
    markdown: page.markdownUrl,
    markdownTokens: page.tokens,
    updated: LAST_MODIFIED
  })),
  note: 'Send Accept: text/markdown to any canonical URL above to receive the same markdown rendition inline.'
}));

write('api/v1/status.json', json({
  ...apiMeta,
  status: 'operational',
  representation: 'static',
  note: 'This API is a set of static documents regenerated at build time. A 200 response means the origin is serving the current build.'
}));

// -------------------------------------------------------------- OpenAPI 3.1 --

const jsonResponse = (description) => ({
  description,
  content: { 'application/json': { schema: { type: 'object' } } }
});

write('openapi.json', json({
  openapi: '3.1.0',
  info: {
    title: 'Paulo Morais public content API',
    version: `1.0.0+${LAST_MODIFIED}`,
    summary: 'Read-only, unauthenticated description of the public Paulo Morais website.',
    description: [
      'A static, read-only API describing the public content of https://pmorais.pt: the services published on the site, the public contact channels and the canonical pages with their markdown renditions.',
      '',
      'There is no booking, payment or client-data endpoint. The client area is authenticated and human-only; see https://pmorais.pt/auth.md.',
      '',
      'No price, schedule or availability is published anywhere on the site and none may be inferred from this API.'
    ].join('\n'),
    contact: { name: ORGANISATION.brand, email: CONTACT.email, url: SITE_ORIGIN },
    license: { name: 'Website terms and conditions', url: `${SITE_ORIGIN}/termos-e-condicoes` }
  },
  servers: [{ url: API_BASE, description: 'Production' }],
  externalDocs: { description: 'Expanded factual representation', url: `${SITE_ORIGIN}/llms-full.txt` },
  paths: {
    '/site.json': {
      get: {
        operationId: 'getSite',
        summary: 'Site identity, languages, discovery resources and interpretation limits',
        tags: ['site'],
        responses: { 200: jsonResponse('Site identity document') }
      }
    },
    '/services.json': {
      get: {
        operationId: 'listServices',
        summary: 'The services published on the website, bilingual, with their delivery modes',
        tags: ['content'],
        responses: { 200: jsonResponse('Service catalogue. `pricing` is always null.') }
      }
    },
    '/contact.json': {
      get: {
        operationId: 'getContact',
        summary: 'Public contact channels and the URLs of the contact forms',
        tags: ['content'],
        responses: { 200: jsonResponse('Contact document. `bookingApi` is always null.') }
      }
    },
    '/pages.json': {
      get: {
        operationId: 'listPages',
        summary: 'Canonical public pages with language, alternate and markdown rendition URLs',
        tags: ['content'],
        responses: { 200: jsonResponse('Page index') }
      }
    },
    '/status.json': {
      get: {
        operationId: 'getStatus',
        summary: 'Build and availability status of this API',
        tags: ['site'],
        responses: { 200: jsonResponse('Status document') }
      }
    }
  },
  tags: [
    { name: 'site', description: 'Identity and operational metadata' },
    { name: 'content', description: 'Public editorial content' }
  ]
}));

// ------------------------------------------------------ RFC 9727 catalogue --

write('.well-known/api-catalog', json({
  linkset: [
    {
      anchor: `${API_BASE}/`,
      'service-desc': [
        { href: `${SITE_ORIGIN}/openapi.json`, type: 'application/vnd.oai.openapi+json;version=3.1', title: 'OpenAPI 3.1 description' }
      ],
      'service-doc': [
        { href: `${SITE_ORIGIN}/llms-full.txt`, type: 'text/plain', title: 'Expanded factual representation' },
        { href: `${SITE_ORIGIN}/llms.txt`, type: 'text/plain', title: 'Site index for language models' }
      ],
      'service-meta': [
        { href: `${SITE_ORIGIN}/.well-known/ai-catalog.json`, type: 'application/json', title: 'ARD capability manifest' }
      ],
      status: [
        { href: `${API_BASE}/status.json`, type: 'application/json', title: 'Build and availability status' }
      ],
      author: [
        { href: SITE_ORIGIN, title: ORGANISATION.brand }
      ],
      license: [
        { href: `${SITE_ORIGIN}/termos-e-condicoes`, title: 'Website terms and conditions' }
      ],
      'privacy-policy': [
        { href: `${SITE_ORIGIN}/politica-privacidade`, title: 'Privacy policy' }
      ]
    }
  ]
}));

// --------------------------------------------------------- ARD ai-catalog ---

const urn = (namespace, name) => `urn:air:pmorais.pt:${namespace}:${name}`;

write('.well-known/ai-catalog.json', json({
  specVersion: '1.0',
  host: {
    identifier: 'did:web:pmorais.pt',
    displayName: ORGANISATION.brand,
    url: SITE_ORIGIN,
    description: 'Personal training, online training, adapted exercise in oncology and osteopathy in Lisbon, Portugal. Published in European Portuguese and British English.'
  },
  entries: [
    {
      identifier: urn('api', 'openapi'),
      displayName: 'Public content API (OpenAPI 3.1)',
      description: 'Read-only description of the static JSON API covering services, contact channels and canonical pages.',
      type: 'application/vnd.oai.openapi+json;version=3.1',
      url: `${SITE_ORIGIN}/openapi.json`,
      representativeQueries: [
        'what API does pmorais.pt expose',
        'machine readable description of Paulo Morais services',
        'openapi schema for pmorais.pt'
      ]
    },
    {
      identifier: urn('api', 'services'),
      displayName: 'Services catalogue',
      description: 'The four services published on the website, in Portuguese and English, with delivery modes and interpretation limits.',
      type: 'application/json',
      url: `${API_BASE}/services.json`,
      representativeQueries: [
        'what services does Paulo Morais offer',
        'does Paulo Morais do online personal training',
        'osteopathy in Lisbon with Paulo Morais',
        'adapted exercise for cancer patients in Lisbon'
      ]
    },
    {
      identifier: urn('api', 'contact'),
      displayName: 'Public contact channels',
      description: 'Email, telephone, WhatsApp, Instagram and the URLs of the published contact forms.',
      type: 'application/json',
      url: `${API_BASE}/contact.json`,
      representativeQueries: [
        'how do I contact Paulo Morais',
        'email address for pmorais.pt',
        'book a session with Paulo Morais'
      ]
    },
    {
      identifier: urn('api', 'pages'),
      displayName: 'Canonical page index',
      description: 'The eight canonical public pages with language, reciprocal alternate and markdown rendition URL.',
      type: 'application/json',
      url: `${API_BASE}/pages.json`,
      representativeQueries: [
        'list the pages of pmorais.pt',
        'markdown version of the Paulo Morais website',
        'english pages on pmorais.pt'
      ]
    },
    {
      identifier: urn('content', 'llms-full'),
      displayName: 'Expanded factual representation',
      description: 'Long-form prose description of the organisation, services, background and interpretation limits, in English and Portuguese.',
      type: 'text/plain',
      url: `${SITE_ORIGIN}/llms-full.txt`,
      representativeQueries: [
        'who is Paulo Morais',
        'what experience does Paulo Morais have',
        'what can and cannot be claimed about Paulo Morais'
      ]
    },
    {
      identifier: urn('skills', 'index'),
      displayName: 'Agent skills index',
      description: 'Discovery index for the SKILL.md artifacts published by this site.',
      type: 'application/json',
      url: `${SITE_ORIGIN}/.well-known/agent-skills/index.json`,
      representativeQueries: [
        'agent skills published by pmorais.pt',
        'how should an agent interact with Paulo Morais',
        'skill for booking a session with Paulo Morais'
      ]
    }
  ]
}));

// ------------------------------------------------------------ agent skills --

const skillIndex = AGENT_SKILLS.map((skill) => {
  const artifact = `---
name: ${skill.name}
description: ${skill.description}
---

# ${skill.title}

${skill.body.trim()}
`;
  const relative = `.well-known/agent-skills/${skill.name}/SKILL.md`;
  write(relative, artifact);
  return {
    name: skill.name,
    type: 'skill-md',
    description: skill.description,
    url: absolute(`/${relative}`),
    digest: `sha256:${sha256(artifact)}`
  };
});

write('.well-known/agent-skills/index.json', json({
  $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
  version: '0.2.0',
  updated: LAST_MODIFIED,
  publisher: { name: ORGANISATION.brand, url: SITE_ORIGIN },
  skills: skillIndex
}));

// ----------------------------------------------------------------- auth.md --

write('auth.md', `# auth.md

Agent authentication posture for ${SITE_ORIGIN}.

## Audience

Autonomous agents and assistants reading or acting on behalf of a person who is
interested in the services of ${ORGANISATION.brand} (${ORGANISATION.legalName},
VAT ${ORGANISATION.vatID}), Lisbon, Portugal.

## Summary

This site publishes **no agent registration endpoint and no OAuth
authorization server**. Nothing here needs a credential, and no credential can
be issued to an agent.

| Question | Answer |
| --- | --- |
| Is there a public API? | Yes — \`${API_BASE}/\`, read-only. |
| Does it require authentication? | No. It is anonymous and unauthenticated. |
| Is there an agent registration endpoint? | No. |
| Is there OAuth Protected Resource Metadata? | No, because no resource here is OAuth-protected. |
| Is there a booking or payment API? | No. |

## Public, unauthenticated surface

Fetch any of these with a plain \`GET\`. No token, no header, no rate-limit
negotiation. Please send a descriptive \`User-Agent\`.

- \`${API_BASE}/site.json\`
- \`${API_BASE}/services.json\`
- \`${API_BASE}/contact.json\`
- \`${API_BASE}/pages.json\`
- \`${API_BASE}/status.json\`
- \`${SITE_ORIGIN}/openapi.json\`
- Any canonical page with \`Accept: text/markdown\`

## Authenticated surface

The client area (bookings, history, forms, profiles, administration) is
protected by Firebase Authentication and is **human-only**. Sessions are
established interactively by the account holder in a browser. There is no
client-credentials flow, no service account, no API key and no delegated agent
identity.

An agent must not attempt to sign in, register an account, reset a password, or
probe these routes:

${PRIVATE_ROUTES.map((route) => `- \`${absolute(route)}\``).join('\n')}

Access control, not \`robots.txt\`, is the security boundary there. Treat a
credential prompt on this domain as out of scope and hand control back to the
person.

## Acting on someone's behalf

To arrange a session, give the person the published contact channels in
\`${API_BASE}/contact.json\` and let them make contact themselves, or submit a
contact form only under their explicit, per-submission instruction. Do not
commit to a date, time, price or clinical outcome — none of those are published.

## Content usage

\`${SITE_ORIGIN}/robots.txt\` declares \`Content-Signal: ${CONTENT_SIGNAL}\`.
Grounding an answer in this site and citing it is welcome; using it as model
training data is not.

## Changes

This document is regenerated with the site. Last build: ${generatedAt}.
`);

// ------------------------------------------- per-directory Apache headers --

write('.well-known/.htaccess', `# Generated by scripts/generate-agent-discovery.mjs — do not edit by hand.
# Discovery documents are cross-origin readable by design (RFC 9727 §3, ARD §3).

<IfModule mod_headers.c>
  Header always set Access-Control-Allow-Origin "*"
  Header always set Access-Control-Allow-Methods "GET, HEAD, OPTIONS"
  Header always set Cache-Control "public, max-age=300, must-revalidate"
  Header always set X-Robots-Tag "noindex, follow"

  <Files "api-catalog">
    Header always set Content-Type "application/linkset+json; charset=utf-8"
  </Files>

  <FilesMatch "\\.json$">
    Header always set Content-Type "application/json; charset=utf-8"
  </FilesMatch>

  <FilesMatch "\\.md$">
    Header always set Content-Type "text/markdown; charset=utf-8"
  </FilesMatch>
</IfModule>
`);

write('api/.htaccess', `# Generated by scripts/generate-agent-discovery.mjs — do not edit by hand.
# Static, read-only, unauthenticated JSON. Described by /openapi.json.

<IfModule mod_headers.c>
  <FilesMatch "\\.json$">
    Header always set Content-Type "application/json; charset=utf-8"
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, HEAD, OPTIONS"
    Header always set Cache-Control "public, max-age=300, must-revalidate"
    Header always set X-Robots-Tag "noindex, follow"
  </FilesMatch>
</IfModule>
`);

// ------------------------------------------------------------------ report --

console.log(`Generated ${written.length} agent-discovery files:`);
for (const relative of written.sort()) console.log(`  ${relative}`);
console.log(`\nLink relations advertised on HTML: ${LINK_HEADER_RELATIONS.map((entry) => entry.rel).join(', ')}`);
