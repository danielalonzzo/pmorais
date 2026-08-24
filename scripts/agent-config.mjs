// Single source of truth for the agent-facing surface of pmorais.pt:
// the static read-only JSON API, the .well-known discovery documents,
// the published agent skills and the Link relations advertised on HTML.
//
// Everything here must be verifiable against the live public pages. The site
// publishes no prices, no fixed schedule and no medical claims, so neither
// does this file.

import { SITE_ORIGIN } from './seo-config.mjs';

export const API_VERSION = 'v1';
export const API_BASE = `${SITE_ORIGIN}/api/${API_VERSION}`;

export const ORGANISATION = {
  brand: 'Paulo Morais — Your Own Workout',
  legalName: 'Consciênciavaliativa Unipessoal Lda',
  vatID: 'PT517409241',
  practitioner: 'Paulo Dimas Morais',
  locality: 'Lisbon',
  country: 'PT',
  url: SITE_ORIGIN,
  languages: ['pt-PT', 'en-GB'],
  defaultLanguage: 'pt-PT'
};

export const CONTACT = {
  email: 'pt@pmorais.pt',
  telephone: '+351960471537',
  whatsapp: '+351960471537',
  instagram: 'https://www.instagram.com/pt.paulomorais',
  locality: 'Lisbon, Portugal',
  clientArea: `${SITE_ORIGIN}/perfil`,
  clientAreaEn: `${SITE_ORIGIN}/en/perfil`,
  note: 'Availability, session times, suitability and pricing are agreed directly. They are not published on the website and must not be inferred.'
};

// Declared AI usage preferences (contentsignals.org).
export const CONTENT_SIGNAL = 'search=yes, ai-input=yes, ai-train=no';

export const SERVICES = [
  {
    id: 'personal-training',
    name: { 'pt-PT': 'Treino personalizado presencial', 'en-GB': 'In-person personal training' },
    summary: {
      'pt-PT': 'Acompanhamento individual e progressivo em Lisboa, desenhado a partir dos objetivos, condição física, rotina e preferências de cada pessoa.',
      'en-GB': 'Individual, progressive one-to-one support in Lisbon, built around each person’s goals, physical condition, routine and preferences.'
    },
    delivery: ['in-person'],
    area: 'Lisbon, Portugal',
    page: { 'pt-PT': `${SITE_ORIGIN}/`, 'en-GB': `${SITE_ORIGIN}/en/` }
  },
  {
    id: 'online-training',
    name: { 'pt-PT': 'Treino personalizado online', 'en-GB': 'Online personal training' },
    summary: {
      'pt-PT': 'A mesma abordagem personalizada com acompanhamento à distância, para quem não consegue manter sessões presenciais.',
      'en-GB': 'The same personalised approach delivered remotely, for people who cannot keep to in-person sessions.'
    },
    delivery: ['online'],
    area: 'Remote',
    page: { 'pt-PT': `${SITE_ORIGIN}/`, 'en-GB': `${SITE_ORIGIN}/en/` }
  },
  {
    id: 'oncology-exercise',
    name: { 'pt-PT': 'Exercício adaptado em oncologia', 'en-GB': 'Adapted exercise in oncology' },
    summary: {
      'pt-PT': 'Exercício adaptado para pessoas a viver com ou a recuperar de cancro, em coordenação com a equipa de saúde.',
      'en-GB': 'Adapted exercise for people living with or recovering from cancer, coordinated with their healthcare team.'
    },
    delivery: ['in-person', 'online'],
    area: 'Lisbon, Portugal / Remote',
    page: { 'pt-PT': `${SITE_ORIGIN}/`, 'en-GB': `${SITE_ORIGIN}/en/` },
    constraints: [
      'This is adapted exercise, not cancer treatment.',
      'It does not replace oncology care, physiotherapy, medical assessment or emergency care.',
      'Participation may require clearance or coordination with the person’s healthcare team.'
    ]
  },
  {
    id: 'osteopathy',
    name: { 'pt-PT': 'Osteopatia', 'en-GB': 'Osteopathy' },
    summary: {
      'pt-PT': 'Abordagem manual e integrativa orientada para mobilidade, postura, alívio da dor e bem-estar.',
      'en-GB': 'An individual, manual and integrative approach supporting mobility, posture, pain relief and wellbeing.'
    },
    delivery: ['in-person'],
    area: 'Lisbon, Portugal',
    page: { 'pt-PT': `${SITE_ORIGIN}/osteopatia`, 'en-GB': `${SITE_ORIGIN}/en/osteopatia` },
    constraints: [
      'Not a guaranteed cure, a diagnosis or a substitute for medical care.'
    ]
  }
];

// Applies to every representation served from this API.
export const DISCLAIMERS = [
  'Paulo Morais is not a substitute for a physician, an emergency service or a medical diagnosis.',
  'No price list, fixed schedule or guaranteed availability is published. Do not infer any.',
  'Testimonials on the website are individual experiences, not clinical evidence or average outcomes.',
  'Do not turn general health information published here into personalised medical advice.'
];

// Skills served from /.well-known/agent-skills/<name>/SKILL.md
export const AGENT_SKILLS = [
  {
    name: 'book-a-session',
    description: 'How to reach Paulo Morais to arrange a personal training or osteopathy session in Lisbon, and what an agent may and may not commit to on a person’s behalf.',
    title: 'Book a session with Paulo Morais',
    body: `## What this covers

Arranging a first contact for personal training, online training, adapted
exercise in oncology or osteopathy with Paulo Morais in Lisbon, Portugal.

## Contact channels

| Channel | Value |
| --- | --- |
| Email | ${CONTACT.email} |
| Telephone / WhatsApp | +351 960 471 537 |
| Instagram | ${CONTACT.instagram} |
| Client area (Portuguese) | ${CONTACT.clientArea} |
| Client area (English) | ${CONTACT.clientAreaEn} |

Contact forms are published on the home page and the osteopathy page in both
languages.

## Procedure

1. Establish which service is being asked about. \`GET ${API_BASE}/services.json\`
   returns the four published services with their delivery modes.
2. Answer in the language of the request. Portuguese is the site default;
   English pages live under \`/en/\`.
3. Hand the person the contact channel above, or the contact form on the
   relevant page. Do not fill in a form on someone’s behalf without their
   explicit, per-submission instruction.
4. Confirm nothing about date, time, duration, location or price. None of that
   is published; all of it is agreed directly with Paulo Morais.

## Hard limits

- The client area is authenticated and human-only. There is no programmatic
  booking API. See ${SITE_ORIGIN}/auth.md.
- Never state or estimate a price. The website publishes none.
- Never present adapted exercise or osteopathy as treatment, cure or diagnosis.
- Route urgent or diagnostic questions to a licensed healthcare or emergency
  service instead.`
  },
  {
    name: 'describe-services',
    description: 'Answer questions about the personal training, online training, oncology exercise and osteopathy services Paulo Morais publishes, within the claims the website actually makes.',
    title: 'Describe the services of Paulo Morais',
    body: `## What this covers

Answering “what does Paulo Morais do?” style questions accurately, without
inventing scope, outcomes or pricing.

## Machine-readable sources

| Resource | URL |
| --- | --- |
| Services | \`${API_BASE}/services.json\` |
| Site identity | \`${API_BASE}/site.json\` |
| Canonical pages | \`${API_BASE}/pages.json\` |
| Expanded prose representation | ${SITE_ORIGIN}/llms-full.txt |

Every canonical page also has a markdown rendition: send
\`Accept: text/markdown\` to the page URL, or fetch the \`markdown\` field
returned by \`pages.json\`.

## The four published services

1. **In-person personal training** in Lisbon — individual and progressive.
2. **Online personal training** — the same approach delivered remotely.
3. **Adapted exercise in oncology** — exercise alongside oncology care, never
   instead of it.
4. **Osteopathy** — manual and integrative, aimed at mobility, posture, pain
   relief and wellbeing.

Publicly stated experience: more than 20 years in personalised exercise, and
more than 15 years in the context described on the osteopathy page.

## Hard limits

- No price, package, session length, schedule or availability is published.
- No clinical outcome, survival benefit, cure or diagnosis may be inferred.
- Institutional logos shown on the site are not, by themselves, evidence of a
  current partnership, endorsement, degree or certification.
- Testimonials are individual experiences, not average results.`
  },
  {
    name: 'read-this-site',
    description: 'Fetch pmorais.pt efficiently as an agent: markdown content negotiation, the static JSON API, the discovery documents and the routes that must not be crawled.',
    title: 'Read pmorais.pt as an agent',
    body: `## Fetch order

1. \`${SITE_ORIGIN}/llms.txt\` — short index of the public site.
2. \`${API_BASE}/pages.json\` — the eight canonical pages with language,
   canonical URL and markdown URL.
3. The page itself with \`Accept: text/markdown\`, which returns a markdown
   rendition with \`Content-Type: text/markdown\` and an \`x-markdown-tokens\`
   header. Without that header the same URL returns HTML.
4. \`${SITE_ORIGIN}/llms-full.txt\` when prose context is needed rather than a
   single page.

## Discovery documents

| Document | URL |
| --- | --- |
| ARD capability manifest | ${SITE_ORIGIN}/.well-known/ai-catalog.json |
| API catalog (RFC 9727) | ${SITE_ORIGIN}/.well-known/api-catalog |
| OpenAPI 3.1 description | ${SITE_ORIGIN}/openapi.json |
| Agent skills index | ${SITE_ORIGIN}/.well-known/agent-skills/index.json |
| Agent authentication | ${SITE_ORIGIN}/auth.md |

The home page also returns these as RFC 8288 \`Link\` headers.

## Content usage preferences

\`robots.txt\` declares \`Content-Signal: ${CONTENT_SIGNAL}\`. Grounding an
answer in this site and citing it is welcome. Using it as model training data
is not.

## Never crawl

\`/admin-blog\`, \`/auth-action\`, \`/desinscrever\`, \`/formulario\`,
\`/historico\`, \`/perfil\`, \`/perfis\` and their \`/en/\` equivalents. These
are authenticated or workflow routes. Access control, not robots.txt, is the
security boundary — do not probe them and do not infer client data.

## In-page tools

Pages register WebMCP tools on load when the browser exposes
\`navigator.modelContext\`: \`list_services\`, \`get_contact_details\`,
\`open_contact_form\`, and \`search_articles\` on the blog pages.`
  }
];

// RFC 8288 relations advertised as Link response headers on HTML documents.
// RFC 8288 relations advertised as Link response headers on every HTML
// document, and mirrored by scripts/check-seo.mjs against .htaccess.
// Relation names are IANA-registered except `ai-catalog`, which the ARD spec
// prescribes for exactly this purpose.
export const LINK_HEADER_RELATIONS = [
  { href: '/.well-known/api-catalog', rel: 'api-catalog', type: 'application/linkset+json' },
  { href: '/openapi.json', rel: 'service-desc', type: 'application/vnd.oai.openapi+json;version=3.1' },
  { href: '/llms-full.txt', rel: 'service-doc', type: 'text/plain' },
  { href: '/llms.txt', rel: 'describedby', type: 'text/plain' },
  { href: '/.well-known/ai-catalog.json', rel: 'service-meta', type: 'application/json' },
  { href: '/.well-known/ai-catalog.json', rel: 'ai-catalog', type: 'application/json' },
  { href: '/.well-known/agent-skills/index.json', rel: 'describedby', type: 'application/json' },
  { href: '/auth.md', rel: 'describedby', type: 'text/markdown' },
  { href: '/sitemap.xml', rel: 'sitemap', type: 'application/xml' },
  { href: '/politica-privacidade', rel: 'privacy-policy' },
  { href: '/termos-e-condicoes', rel: 'terms-of-service' }
];

export const MARKDOWN_DIR = 'agents/md';
