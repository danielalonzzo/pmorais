// Generates every machine-readable surface of the site:
//
//   agents/md/**.md            markdown renditions served on Accept: text/markdown
//   agents/md/**/.htaccess     per-file Content-Type and x-markdown-tokens
//   api/v1/*.json              static read-only JSON API
//   openapi.json               OpenAPI 3.1 description of that API
//   .well-known/api-catalog    RFC 9727 linkset
//   .well-known/ai-catalog.json           ARD capability manifest
//   .well-known/agent-skills/  skills discovery index + SKILL.md artifacts
//   .well-known/oauth-protected-resource  RFC 9728 protected resource metadata
//   auth.md                    agent authentication posture
//
// Run with: npm run agents:generate

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { LAST_MODIFIED, PUBLIC_PAGES, PRIVATE_ROUTES, SITE_ORIGIN } from './seo-config.mjs';
import {
  AGENT_AUTH, AGENT_SKILLS, API_BASE, API_VERSION, AUTHORIZATION_SERVER, CONTACT,
  CONTENT_SIGNAL, DNS_AID, DISCLAIMERS, LINK_HEADER_RELATIONS, MARKDOWN_DIR,
  MCP_SERVER, ORGANISATION, PROTECTED_RESOURCE, SERVICES
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
    },
    {
      anchor: MCP_SERVER.endpoint,
      'service-desc': [
        { href: `${SITE_ORIGIN}/.well-known/mcp/server-card.json`, type: 'application/json', title: 'MCP server card (SEP-1649)' }
      ],
      'service-doc': [
        { href: `${SITE_ORIGIN}/llms-full.txt`, type: 'text/plain', title: 'Expanded factual representation' }
      ],
      status: [
        { href: `${API_BASE}/status.json`, type: 'application/json', title: 'Build and availability status' }
      ]
    }
  ]
}));

// ------------------------------------------------------- MCP server card ---

write('.well-known/mcp/server-card.json', json({
  $schema: 'https://modelcontextprotocol.io/schemas/draft/server-card.schema.json',
  serverInfo: {
    name: MCP_SERVER.name,
    title: MCP_SERVER.title,
    version: MCP_SERVER.version,
    description: 'Read-only access to the public content of pmorais.pt: the published services, the public contact channels, the canonical pages and their markdown renditions.',
    websiteUrl: SITE_ORIGIN
  },
  endpoint: MCP_SERVER.endpoint,
  transport: { type: MCP_SERVER.transport, endpoint: MCP_SERVER.endpoint },
  transports: [{ type: MCP_SERVER.transport, endpoint: MCP_SERVER.endpoint }],
  protocolVersions: MCP_SERVER.protocolVersions,
  capabilities: MCP_SERVER.capabilities,
  tools: MCP_SERVER.tools,
  authentication: { type: 'none', description: `Anonymous. No credential is issued or accepted; see ${SITE_ORIGIN}/auth.md.` },
  documentation: `${SITE_ORIGIN}/llms-full.txt`,
  privacyPolicy: `${SITE_ORIGIN}/politica-privacidade`,
  termsOfService: `${SITE_ORIGIN}/termos-e-condicoes`
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
      identifier: urn('server', 'mcp'),
      displayName: 'Public content MCP server',
      description: 'Streamable HTTP MCP server exposing read-only tools over the published services, contact channels, canonical pages and site search. Anonymous.',
      type: 'application/mcp-server-card+json',
      url: `${SITE_ORIGIN}/.well-known/mcp/server-card.json`,
      representativeQueries: [
        'MCP server for Paulo Morais',
        'connect an agent to pmorais.pt',
        'read the Paulo Morais site through MCP',
        'what tools does pmorais.pt expose to agents'
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
    },
    {
      identifier: urn('auth', 'protected-resource'),
      displayName: 'Protected resource metadata',
      description: 'RFC 9728 metadata for this origin. Names the authorization server behind the client area and states that no scope on it is delegable to an agent.',
      type: 'application/json',
      url: `${SITE_ORIGIN}/.well-known/oauth-protected-resource`,
      representativeQueries: [
        'how does an agent authenticate with pmorais.pt',
        'does pmorais.pt issue API keys or OAuth tokens',
        'can an agent log in to the Paulo Morais client area'
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

// ------------------------------------------- RFC 9728 protected resource --
//
// Extensionless by specification, so .well-known/.htaccess sets its
// Content-Type by filename rather than by extension.

write('.well-known/oauth-protected-resource', json({
  resource: PROTECTED_RESOURCE.resource,
  authorization_servers: PROTECTED_RESOURCE.authorizationServers,
  scopes_supported: PROTECTED_RESOURCE.scopesSupported,
  bearer_methods_supported: PROTECTED_RESOURCE.bearerMethodsSupported,
  resource_name: ORGANISATION.brand,
  resource_documentation: PROTECTED_RESOURCE.documentation,
  resource_policy_uri: absolute('/politica-privacidade'),
  resource_tos_uri: absolute('/termos-e-condicoes'),
  authorization_server_metadata: PROTECTED_RESOURCE.authorizationServerMetadata,
  // Extension members. RFC 9728 §2 permits them, and they carry the part of
  // this resource's posture the registered members cannot express: which
  // paths are protected, that none of them is reachable with a token an agent
  // could obtain, and where the prose version lives.
  protected_paths: [...PRIVATE_ROUTES],
  public_paths_require_no_token: [`/api/${API_VERSION}/`, '/mcp', '/openapi.json'],
  agent_delegated_access: 'not-offered',
  agent_auth: AGENT_AUTH
}));

// ----------------------------------------------------------------- auth.md --

write('auth.md', `# auth.md

Agent registration and authentication for ${SITE_ORIGIN}, operated by
${ORGANISATION.legalName} (VAT ${ORGANISATION.vatID}), Lisbon, Portugal.

This document follows the auth.md procedural shape — discover, register, claim,
exchange, use, revoke — and answers each step for this service. Several of the
answers are "not offered". They are stated explicitly so an agent can stop
early instead of probing for endpoints that do not exist.

## Audience

Autonomous agents and assistants acting for a person who wants information
about, or contact with, ${ORGANISATION.brand}: personal training, online
training, adapted exercise in oncology, and osteopathy.

## Declared posture

\`\`\`json
${JSON.stringify({ agent_auth: AGENT_AUTH }, null, 2)}
\`\`\`

The same block is served as the \`agent_auth\` member of
${SITE_ORIGIN}/.well-known/oauth-protected-resource, so an agent that reads
only machine-readable documents still gets it. The auth.md specification puts
\`agent_auth\` in authorization server metadata; this origin publishes none,
for the reason in the table below, and the metadata of the authorization server
it does rely on belongs to Google and cannot carry members of ours.

## Step 1 — Discover

| Document | Status |
| --- | --- |
| \`/.well-known/oauth-protected-resource\` | Published. RFC 9728 metadata for the resource \`${SITE_ORIGIN}\`. Read \`scopes_supported\` first: it is empty, and that is the answer to most questions below. |
| \`/.well-known/oauth-authorization-server\` | **Not published.** This origin issues no tokens, so it has no issuer identifier of its own. Publishing RFC 8414 metadata here whose \`issuer\` named somebody else would fail the issuer check in §3.3 of that RFC, and correctly so. The authorization server is named in the protected resource metadata instead. |
| \`/.well-known/openid-configuration\` | **Not published.** This origin is not an OpenID provider. The provider it relies on publishes its own, at ${PROTECTED_RESOURCE.authorizationServerMetadata}. |
| \`/.well-known/api-catalog\` | Published. RFC 9727 linkset for the public API and the MCP endpoint. |
| \`/.well-known/mcp/server-card.json\` | Published. The MCP server is anonymous — \`authentication.type\` is \`none\`. |
| \`/openapi.json\` | Published. Every operation is anonymous. |
| \`/.well-known/ai-catalog.json\` | Published. ARD capability manifest. |

### What the protected resource metadata does and does not claim

It claims that the resource \`${SITE_ORIGIN}\` has a protected surface — the
client area listed under "The closed surface" below — and that the authorization
server governing it is \`${AUTHORIZATION_SERVER}\`, the Firebase Authentication
issuer whose \`iss\` claim appears in every ID token that area accepts. That
issuer publishes conforming metadata at its own well-known location, so the
chain resolves end to end.

It does not claim that an agent can walk that chain. \`scopes_supported\` is
empty because no scope here is delegable to a third party, and
\`agent_delegated_access\` is \`not-offered\`.

One caveat worth stating plainly rather than leaving to be discovered: no HTTP
request to ${SITE_ORIGIN} itself carries or parses a bearer token. The client
area is a browser application that signs the person in and then reads their data
directly from Google's APIs, which is where the
\`Authorization: Bearer\` header goes. So no endpoint on this origin returns
\`401\` with a \`WWW-Authenticate: Bearer resource_metadata=…\` challenge —
not because the resource is unprotected, but because the token never travels
here. \`bearer_methods_supported\` describes how the protected surface is
reached, not a header this origin will honour.

## Step 2 — Register

**Agent registration is not offered. There is no registration endpoint.**

- \`register_uri\`: none
- Identity assertion (ID-JAG, \`urn:ietf:params:oauth:token-type:id-jag\`): not accepted
- Verified email: not accepted
- Anonymous agent credentials: not issued
- Dynamic client registration (RFC 7591): not supported

There is nothing to register *for*. The public API below is open, and the only
other surface is a personal client area that is deliberately closed to agents.

The one provisioning path that exists is out of band and human-mediated: a
person emails ${CONTACT.email} and arranges matters directly with Paulo Morais.
An agent may surface that address to the person it is helping. It may not
complete the exchange on their behalf.

## Steps 3–5 — Claim, exchange, use

Not applicable. No claim ceremony (RFC 8628 style or otherwise), no token
exchange (RFC 7523 or otherwise), and no credential to use.

Use the public surface directly instead. Plain \`GET\`, no token, no header
negotiation. Please send a descriptive \`User-Agent\`.

- \`${API_BASE}/site.json\`
- \`${API_BASE}/services.json\`
- \`${API_BASE}/contact.json\`
- \`${API_BASE}/pages.json\`
- \`${API_BASE}/status.json\`
- \`${SITE_ORIGIN}/openapi.json\`
- Any canonical page with \`Accept: text/markdown\`

The MCP server at \`${MCP_SERVER.endpoint}\` is part of that same anonymous
surface. It speaks streamable HTTP, accepts \`POST\` with a JSON-RPC 2.0 body,
and never asks for a credential. It returns \`401\` to nobody, because it
authenticates nobody. Its tools are read-only and cover the same published
content: ${MCP_SERVER.tools.map((tool) => `\`${tool}\``).join(', ')}.

## Step 6 — Revoke

Not applicable; nothing is issued. No \`revocation_uri\`, no revocation events.

## The closed surface

The client area — bookings, history, forms, profiles, administration — is
protected by Firebase Authentication and is **human-only**. Sessions are
established interactively by the account holder in a browser. There is no
client-credentials flow, no service account, no API key, and no delegated agent
identity. It holds personal health information, which is why no agent-delegated
access path is published rather than merely undocumented.

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

  <Files "oauth-protected-resource">
    Header always set Content-Type "application/json; charset=utf-8"
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

// -------------------------------------------------------------- DNS-AID ----
//
// DNS records cannot be published from this repository — pmorais.pt is served
// by ns1/ns2/ns3.dnscpanel.com. These files are the exact zone data to hand to
// the DNS provider, plus the procedure. scripts/check-dns-aid.mjs verifies the
// result once it is live.

// RFC 3597 generic encoding of the SVCB RDATA, for authoritative servers that
// accept unknown RR types but have no SVCB parser. Verified byte-for-byte
// against dnspython in scripts/check-dns-aid.mjs's fixture.
const SVC_PARAM_KEYS = { mandatory: 0, alpn: 1, 'no-default-alpn': 2, port: 3 };

function encodeName(name) {
  const bytes = [];
  for (const label of name.replace(/\.$/, '').split('.')) {
    const encoded = Buffer.from(label, 'utf8');
    bytes.push(encoded.length, ...encoded);
  }
  bytes.push(0);
  return Buffer.from(bytes);
}

function encodeSvcParam(key, value) {
  const number = SVC_PARAM_KEYS[key] ?? Number(/^key(\d+)$/.exec(key)?.[1]);
  if (!Number.isInteger(number)) throw new Error(`unknown SvcParamKey ${key}`);

  let payload;
  if (number === 0) {
    // mandatory: a list of uint16 keys, in ascending numeric order.
    const keys = value.split(',').map((name) => SVC_PARAM_KEYS[name] ?? Number(/^key(\d+)$/.exec(name)?.[1]));
    payload = Buffer.alloc(keys.length * 2);
    keys.sort((a, b) => a - b).forEach((entry, index) => payload.writeUInt16BE(entry, index * 2));
  } else if (number === 1) {
    // alpn: a sequence of length-prefixed protocol identifiers.
    payload = Buffer.concat(value.split(',').map((protocol) => {
      const encoded = Buffer.from(protocol, 'utf8');
      return Buffer.concat([Buffer.from([encoded.length]), encoded]);
    }));
  } else if (number === 3) {
    payload = Buffer.alloc(2);
    payload.writeUInt16BE(Number(value));
  } else {
    payload = Buffer.from(value, 'utf8');
  }

  const header = Buffer.alloc(4);
  header.writeUInt16BE(number, 0);
  header.writeUInt16BE(payload.length, 2);
  return { number, bytes: Buffer.concat([header, payload]) };
}

function svcbRdataHex(entry) {
  const priority = Buffer.alloc(2);
  priority.writeUInt16BE(entry.priority);
  const params = [
    encodeSvcParam('mandatory', entry.mandatory),
    encodeSvcParam('alpn', entry.alpn),
    encodeSvcParam('port', String(entry.port)),
    ...entry.params.map((param) => encodeSvcParam(param.key, param.value))
  ].sort((a, b) => a.number - b.number).map((param) => param.bytes);

  return Buffer.concat([priority, encodeName(entry.target), ...params]).toString('hex');
}

function assertSvcParamSafe(entry) {
  for (const param of entry.params) {
    // A comma or backslash inside a quoted SvcParam value needs escaping that
    // no two DNS providers agree on. Keep the values free of both.
    if (/[,\\]/.test(param.value)) {
      throw new Error(`${entry.owner}: ${param.key} value must not contain a comma or backslash`);
    }
  }
}

function svcbRecord(entry, rrType) {
  assertSvcParamSafe(entry);
  const params = [
    `alpn="${entry.alpn}"`,
    `port=${entry.port}`,
    `mandatory=${entry.mandatory}`,
    ...entry.params.map((param) => `${param.key}="${param.value}"`)
  ];
  return `${entry.owner} ${DNS_AID.ttl} IN ${rrType} ${entry.priority} ${entry.target} ${params.join(' ')}`;
}

const zoneLines = [];
for (const entry of DNS_AID.entrypoints) {
  zoneLines.push(`; ${entry.comment}`);
  zoneLines.push('; Preferred form — ServiceMode SVCB (RR type 64).');
  zoneLines.push(svcbRecord(entry, 'SVCB'));
  zoneLines.push('');
  zoneLines.push('; Equivalent HTTPS RR (type 65). Publish this INSTEAD of the SVCB record');
  zoneLines.push('; only if the provider supports type 65 but not type 64. Never both.');
  zoneLines.push(`;${svcbRecord(entry, 'HTTPS')}`);
  zoneLines.push('');
  const hex = svcbRdataHex(entry);
  zoneLines.push('; Same record in RFC 3597 generic form, for an authoritative server that');
  zoneLines.push('; accepts unknown RR types but cannot parse SVCB presentation syntax.');
  zoneLines.push(`;${entry.owner} ${DNS_AID.ttl} IN TYPE64 \\# ${hex.length / 2} ${hex}`);
  zoneLines.push('');
}
for (const record of DNS_AID.textRecords) {
  zoneLines.push(`; ${record.comment}`);
  zoneLines.push(`${record.owner} ${DNS_AID.ttl} IN TXT "${record.value}"`);
  zoneLines.push('');
}

write('dns/dns-aid.zone', `; DNS for AI Discovery records for ${DNS_AID.zone}
; Generated by scripts/generate-agent-discovery.mjs — do not edit by hand.
; Spec: draft-mozleywilliams-dnsop-dnsaid-01, RFC 9460.
; Verify after publishing: npm run check:dns

${zoneLines.join('\n')}`);

write('dns/README.md', `# Publishing the DNS-AID records for ${DNS_AID.zone}

The records themselves are in [dns-aid.zone](dns-aid.zone), generated from
\`scripts/agent-config.mjs\`. They cannot be applied from this repository —
${DNS_AID.zone} is served by ns1/ns2/ns3.dnscpanel.com, so publishing is a
change in the hosting provider's DNS, and DNSSEC signing needs both the DNS
host and the registrar.

## What is being published, and why only this

${DNS_AID.entrypoints.map((entry) => `- \`${entry.owner.replace(/\.$/, '')}\` — ${entry.comment}`).join('\n')}
- \`${DNS_AID.textRecords[0].owner.replace(/\.$/, '')}\` — ${DNS_AID.textRecords[0].comment}

Nothing else. In particular there is no \`_a2a._agents\` record, because there
is no A2A agent behind this domain. Advertising an endpoint in DNS that does not
answer wastes every resolver that trusts it. Add the record to
\`scripts/agent-config.mjs\` and regenerate the day the endpoint exists.

## Step 1 — the TXT record (publishable today, anywhere)

\`_catalog._agents.${DNS_AID.zone}\` is a plain TXT record. Every DNS provider
supports TXT, including cPanel's Zone Editor, and it satisfies the ARD spec's
DNS discovery mechanism on its own.

In cPanel: **Zone Editor → Manage → Add Record → TXT**, with the name and value
from \`dns-aid.zone\`.

## Step 2 — the SVCB records

${DNS_AID.entrypoints.map((entry) => `\`${entry.owner.replace(/\.$/, '')}\``).join(' and ')} need SVCB
records, DNS RR type 64. cPanel's Zone Editor does not offer type 64 in its
record-type list in most builds, and type 65 (HTTPS) only in recent ones. Two
ways forward:

1. **Ask the provider.** Send flesk.com the SVCB lines from \`dns-aid.zone\`
   verbatim and ask for them to be added to the zone. If they can only do type
   65, ask for the commented HTTPS lines instead — publish one form or the
   other, never both.
2. **Move DNS to a provider that supports it.** Cloudflare's free tier accepts
   SVCB and HTTPS records directly and turns on DNSSEC with one click, which
   also settles step 3. Nameserver delegation changes at the registrar; the
   hosting itself does not move.

## Step 3 — DNSSEC

The draft asks for the discovery zone to be signed so validating resolvers
return authenticated data. \`${DNS_AID.zone}\` is currently unsigned — there is
no DS record at the \`.pt\` parent and no DNSKEY in the zone.

With cPanel as the DNS host: **Zone Editor → DNSSEC → Create Key**, then copy
the generated DS record to the domain registrar. Propagation to the parent zone
takes up to a day. With Cloudflare: **DNS → Settings → Enable DNSSEC**, then the
same DS submission at the registrar.

DNSSEC is a zone-wide change. If mail or any other service depends on this zone,
enable it during a window where a mistake can be rolled back.

## Step 4 — verify

\`\`\`
npm run check:dns
\`\`\`

Resolves each record over DNS-over-HTTPS through the same resolvers the scanner
uses (cloudflare-dns.com, falling back to dns.google) and reports the DNSSEC
authenticated-data flag.
`);

// ------------------------------------------------------------------ report --

console.log(`Generated ${written.length} agent-discovery files:`);
for (const relative of written.sort()) console.log(`  ${relative}`);
console.log(`\nLink relations advertised on HTML: ${LINK_HEADER_RELATIONS.map((entry) => entry.rel).join(', ')}`);
