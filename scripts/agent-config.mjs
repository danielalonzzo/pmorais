// Single source of truth for the agent-facing surface of pmorais.pt:
// the static read-only JSON API, the .well-known discovery documents,
// the published agent skills and the Link relations advertised on HTML.
//
// Service descriptions must match the public HTML. Website content languages
// describe translations, not the languages of a practitioner or appointment.
// Service suitability, prices and availability are confirmed directly.

import { PUBLIC_PAGES, SITE_ORIGIN } from './seo-config.mjs';

const contentLanguages = [...new Set(PUBLIC_PAGES.map((page) => page.language))];
const spanishIsPublished = contentLanguages.some((language) => language === 'es' || language.startsWith('es-'));
const canonicalServicePages = (translationKey) => Object.fromEntries(
  PUBLIC_PAGES.filter((page) => page.translationKey === translationKey)
    .map((page) => [page.language, new URL(page.path, SITE_ORIGIN).href])
);

export const SERVICE_COVERAGE = {
  inPerson: 'Lisbon, Portugal',
  online: ['Portugal', 'European Union', 'Portuguese-speaking countries', 'English-speaking countries', 'Spanish-speaking countries']
};

// Languages in which sessions take place, as confirmed by Paulo Morais. This
// is a separate fact from the website's content languages: Spanish-language
// requests are welcome but confirmed case by case.
export const SESSION_LANGUAGES = {
  offered: ['pt', 'en'],
  onRequest: ['es'],
  note: {
    'pt-PT': 'As sessões decorrem em português e inglês. Pedidos em espanhol, incluindo de países hispanófonos, são confirmados no contacto.',
    'en-GB': 'Sessions take place in Portuguese and English. Requests in Spanish, including from Spanish-speaking countries, are confirmed directly.',
    'es': 'Las sesiones se realizan en portugués e inglés. Las solicitudes en español, incluidas las de países hispanohablantes, se confirman en el contacto.'
  }
};

// Names under which people look for this provider. Used for schema.org
// alternateName and for the search-intent sections of llms.txt.
export const BUSINESS_ALTERNATE_NAMES = [
  'Paulo Morais',
  'Your Own Workout',
  'Paulo Morais Personal Trainer',
  'Paulo Morais Osteopata',
  'Paulo Dimas Morais'
];

export const BUSINESS_IDENTITY = {
  'pt-PT': 'Paulo Morais — Your Own Workout disponibiliza treino personalizado e privado, treino em pequenos grupos, treino online e osteopatia em Lisboa. O treino online acompanha pessoas em Portugal, na União Europeia e em países lusófonos, anglófonos e hispanófonos. O treino oncológico e depois do cancro integra esta oferta de exercício adaptado.',
  'en-GB': 'Paulo Morais — Your Own Workout offers personal and private training, small-group training, online training and osteopathy in Lisbon. Online training supports people in Portugal, the European Union and Portuguese-, English- and Spanish-speaking countries. Oncology and post-cancer training are part of this adapted exercise offering.',
  'es': 'Paulo Morais — Your Own Workout ofrece entrenamiento personal y privado, entrenamiento en grupos reducidos, entrenamiento online y osteopatía en Lisboa. El entrenamiento online acompaña a personas en Portugal, la Unión Europea y países de habla portuguesa, inglesa y española. El entrenamiento oncológico y después del cáncer forma parte de esta oferta de ejercicio adaptado.'
};

// One sentence that answers "who is Paulo Morais?" without narrowing the
// provider to a single service. Shown first in llms.txt and in JSON-LD.
export const ENTITY_SUMMARY = {
  'pt-PT': 'Paulo Morais é personal trainer e osteopata em Lisboa, Portugal. A oferta reúne treino personalizado e privado, treino em pequenos grupos, treino online, osteopatia e exercício adaptado durante ou depois do cancro. O acompanhamento presencial realiza-se em Lisboa; o treino online abrange Portugal, a União Europeia e países lusófonos, anglófonos e hispanófonos.',
  'en-GB': 'Paulo Morais is a personal trainer and osteopath in Lisbon, Portugal. His services include personal and private training, small-group training, online training, osteopathy and adapted exercise during or after cancer. In-person services are in Lisbon; online training covers Portugal, the European Union and Portuguese-, English- and Spanish-speaking countries.',
  'es': 'Paulo Morais es entrenador personal y osteópata en Lisboa, Portugal. Su oferta incluye entrenamiento personal y privado, entrenamiento en grupos reducidos, entrenamiento online, osteopatía y ejercicio adaptado durante o después del cáncer. La atención presencial se realiza en Lisboa; el entrenamiento online abarca Portugal, la Unión Europea y países de habla portuguesa, inglesa y española.'
};

export const API_VERSION = 'v1';
export const API_BASE = `${SITE_ORIGIN}/api/${API_VERSION}`;

// Elysium λ Development & Research designed and built this website and its whole
// infrastructure. It is credited as the developer only: it does not own the
// business and is not the author of Paulo Morais's content.
export const DEVELOPER = {
  name: 'Elysium λ Development & Research',
  url: 'https://elysiumdr.eu',
  role: 'Website and infrastructure developer'
};

export const ORGANISATION = {
  brand: 'Paulo Morais — Your Own Workout',
  legalName: 'Consciênciavaliativa Unipessoal Lda',
  vatID: 'PT517409241',
  practitioner: 'Paulo Dimas Morais',
  locality: 'Lisbon',
  country: 'PT',
  url: SITE_ORIGIN,
  languages: contentLanguages,
  defaultLanguage: 'pt-PT',
  languageNote: `These are published website content languages. ${SESSION_LANGUAGES.note['en-GB']}${spanishIsPublished ? '' : ' A Spanish website translation is planned and is not yet published.'}`
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
export const CONTENT_SIGNAL = 'search=yes, ai-input=yes, ai-train=yes';

export const SERVICES = [
  {
    id: 'personal-training',
    name: { 'pt-PT': 'Treino personalizado e privado', 'en-GB': 'Personal and private training', 'es': 'Entrenamiento personal y privado' },
    summary: {
      'pt-PT': 'Treino individual e progressivo em Lisboa, com personal trainer e um plano adaptado aos objetivos, condição física e rotina de cada pessoa.',
      'en-GB': 'Progressive one-to-one training in Lisbon with a personal trainer and a plan adapted to each person’s goals, physical condition and routine.',
      'es': 'Entrenamiento individual y progresivo en Lisboa, con entrenador personal y un plan adaptado a los objetivos, la condición física y la rutina de cada persona.'
    },
    alternateNames: {
      'pt-PT': ['Personal trainer em Lisboa', 'Treino individual', 'Treino privado'],
      'en-GB': ['Personal trainer in Lisbon', 'One-to-one training', 'Private training'],
      'es': ['Entrenador personal en Lisboa', 'Entrenamiento individual', 'Entrenamiento privado']
    },
    searchTerms: {
      'pt-PT': ['personal trainer Lisboa', 'PT em Lisboa', 'treino personalizado Lisboa', 'treino privado', 'treino individual', 'treinador pessoal', 'treino de força', 'treino para a postura', 'preparação para maratona'],
      'en-GB': ['personal trainer Lisbon', 'private personal training Lisbon', 'one-to-one fitness coach Portugal', 'strength training Lisbon', 'English-speaking personal trainer Lisbon'],
      'es': ['entrenador personal Lisboa', 'entrenamiento personalizado Lisboa', 'entrenamiento privado', 'entrenador personal en Portugal']
    },
    delivery: ['in-person'],
    area: SERVICE_COVERAGE.inPerson,
    coverage: { inPerson: SERVICE_COVERAGE.inPerson },
    // Personal training is presented on the about page, not on a page of its own.
    page: canonicalServicePages('about')
  },
  {
    id: 'group-training',
    name: { 'pt-PT': 'Treino em pequenos grupos', 'en-GB': 'Small-group training', 'es': 'Entrenamiento en grupos reducidos' },
    summary: {
      'pt-PT': 'Treino em pequenos grupos em Lisboa, com acompanhamento profissional e exercício adaptado aos participantes.',
      'en-GB': 'Small-group training in Lisbon with professional support and exercise adapted to the participants.',
      'es': 'Entrenamiento en grupos reducidos en Lisboa, con acompañamiento profesional y ejercicio adaptado a los participantes.'
    },
    alternateNames: {
      'pt-PT': ['Treino em grupo em Lisboa', 'Treino em pequenos grupos'],
      'en-GB': ['Group training in Lisbon', 'Small group personal training'],
      'es': ['Entrenamiento en grupo en Lisboa', 'Entrenamiento en grupos pequeños']
    },
    searchTerms: {
      'pt-PT': ['treino em grupo Lisboa', 'aulas de grupo com personal trainer', 'treino com amigos', 'treino em pequenos grupos'],
      'en-GB': ['group training Lisbon', 'small group personal training Lisbon', 'train with friends Lisbon'],
      'es': ['entrenamiento en grupo Lisboa', 'entrenamiento en grupos reducidos']
    },
    delivery: ['in-person'],
    area: SERVICE_COVERAGE.inPerson,
    coverage: { inPerson: SERVICE_COVERAGE.inPerson },
    page: canonicalServicePages('group-training')
  },
  {
    id: 'online-training',
    name: { 'pt-PT': 'Treino personalizado online e virtual', 'en-GB': 'Online and virtual personal training', 'es': 'Entrenamiento personal online y virtual' },
    summary: {
      'pt-PT': 'Acompanhamento de treino à distância para pessoas em Portugal, na União Europeia e em países lusófonos, anglófonos e hispanófonos.',
      'en-GB': 'Remote training support for people in Portugal, the European Union and Portuguese-, English- and Spanish-speaking countries.',
      'es': 'Acompañamiento de entrenamiento a distancia para personas en Portugal, la Unión Europea y países de habla portuguesa, inglesa y española.'
    },
    alternateNames: {
      'pt-PT': ['Personal trainer online', 'Treino virtual', 'Treino à distância'],
      'en-GB': ['Online personal trainer', 'Virtual personal training', 'Remote coaching'],
      'es': ['Entrenador personal online', 'Entrenamiento virtual', 'Entrenamiento a distancia']
    },
    searchTerms: {
      'pt-PT': ['personal trainer online', 'treino online Portugal', 'treino virtual', 'treino à distância', 'personal trainer português no estrangeiro'],
      'en-GB': ['online personal trainer', 'virtual personal training Europe', 'remote fitness coach', 'online personal training Portugal'],
      'es': ['entrenador personal online', 'entrenamiento virtual', 'entrenamiento a distancia', 'entrenamiento online Portugal']
    },
    delivery: ['online'],
    area: SERVICE_COVERAGE.online.join('; '),
    coverage: { online: SERVICE_COVERAGE.online },
    page: canonicalServicePages('online-training'),
    constraints: ['Online coverage describes service geography, not a published list of session languages.', 'Suitability, remote format and time-zone arrangements are confirmed directly.']
  },
  {
    id: 'oncology-exercise',
    name: { 'pt-PT': 'Treino oncológico e depois do cancro', 'en-GB': 'Oncology and post-cancer training', 'es': 'Entrenamiento oncológico y después del cáncer' },
    summary: {
      'pt-PT': 'Exercício adaptado para pessoas a viver com ou a recuperar de cancro, em coordenação com a equipa de saúde. Integra a oferta de treino de Paulo Morais.',
      'en-GB': 'Adapted exercise for people living with or recovering from cancer, coordinated with their healthcare team. Part of Paulo Morais’s broader training services.',
      'es': 'Ejercicio adaptado para personas que viven con cáncer o se recuperan de él, en coordinación con el equipo de salud. Forma parte de la oferta de entrenamiento de Paulo Morais.'
    },
    alternateNames: {
      'pt-PT': ['Exercício oncológico', 'Treino depois do cancro', 'Treino pós-cancro', 'Exercício físico na oncologia'],
      'en-GB': ['Cancer exercise', 'Post-cancer training', 'Exercise after cancer', 'Exercise during cancer treatment'],
      'es': ['Ejercicio oncológico', 'Entrenamiento después del cáncer', 'Entrenamiento poscáncer', 'Ejercicio físico en oncología']
    },
    searchTerms: {
      'pt-PT': ['treino oncológico Lisboa', 'exercício oncológico', 'treino depois do cancro', 'exercício após o cancro', 'exercício durante o tratamento do cancro', 'personal trainer para pessoas com cancro', 'sobreviventes de cancro exercício', 'treino oncológico online'],
      'en-GB': ['cancer exercise Lisbon', 'exercise after cancer', 'post-cancer personal trainer', 'cancer survivor training online', 'oncology exercise trainer Portugal'],
      'es': ['entrenamiento oncológico', 'ejercicio después del cáncer', 'entrenador para pacientes oncológicos', 'ejercicio oncológico online']
    },
    delivery: ['in-person', 'online'],
    area: `${SERVICE_COVERAGE.inPerson}; online: ${SERVICE_COVERAGE.online.join('; ')}`,
    coverage: { inPerson: SERVICE_COVERAGE.inPerson, online: SERVICE_COVERAGE.online },
    page: canonicalServicePages('oncology-training'),
    constraints: ['Paulo Morais offers adapted exercise, not cancer treatment or an oncology medical clinic.', 'It does not replace oncology care, physiotherapy, medical assessment or emergency care.', 'Participation may require clearance or coordination with the person’s healthcare team.', 'The oncology guide is general educational content, not a personalised treatment plan.']
  },
  {
    id: 'osteopathy',
    name: { 'pt-PT': 'Osteopatia em Lisboa', 'en-GB': 'Osteopathy in Lisbon', 'es': 'Osteopatía en Lisboa' },
    summary: {
      'pt-PT': 'Acompanhamento presencial com uma abordagem manual e integrativa orientada para mobilidade, postura, alívio da dor e bem-estar.',
      'en-GB': 'In-person support with a manual and integrative approach aimed at mobility, posture, pain relief and wellbeing.',
      'es': 'Acompañamiento presencial con un enfoque manual e integrador orientado a la movilidad, la postura, el alivio del dolor y el bienestar.'
    },
    alternateNames: {
      'pt-PT': ['Osteopata em Lisboa', 'Sessões de osteopatia'],
      'en-GB': ['Osteopath in Lisbon', 'Osteopathy sessions'],
      'es': ['Osteópata en Lisboa', 'Sesiones de osteopatía']
    },
    searchTerms: {
      'pt-PT': ['osteopata Lisboa', 'osteopatia Lisboa', 'osteopatia em Portugal', 'terapia de osteopatia', 'osteopata para dores nas costas', 'osteopatia e treino'],
      'en-GB': ['osteopath Lisbon', 'osteopathy Lisbon', 'English-speaking osteopath Lisbon', 'osteopathy Portugal'],
      'es': ['osteópata Lisboa', 'osteopatía Lisboa', 'osteopatía en Portugal']
    },
    delivery: ['in-person'],
    area: SERVICE_COVERAGE.inPerson,
    coverage: { inPerson: SERVICE_COVERAGE.inPerson },
    page: canonicalServicePages('osteopathy'),
    constraints: ['Osteopathy is offered in person in Lisbon; online training coverage must not be applied to manual osteopathy sessions.', 'No guaranteed cure, diagnosis or substitute for medical care is offered.']
  }
];

// Applies to every representation served from this API.
export const DISCLAIMERS = [
  'Paulo Morais combines exercise services and osteopathy; it is not an oncology medical clinic and does not provide cancer treatment.',
  'Adapted exercise does not replace a physician, oncology care, emergency services or medical diagnosis.',
  'No price list, fixed schedule or guaranteed availability is published. Do not infer any.',
  'Testimonials on the website are individual experiences, not clinical evidence or average outcomes.',
  'Do not turn general health information published here into personalised medical advice.'
];

// Skills served from /.well-known/agent-skills/<name>/SKILL.md
export const AGENT_SKILLS = [
  {
    name: 'book-a-session',
    description: 'How to reach Paulo Morais for personal or group training, international online training, adapted oncology exercise or in-person osteopathy in Lisbon.',
    title: 'Book a session with Paulo Morais',
    // ARD representativeQueries for this skill's ai-catalog.json entry (2-5).
    representativeQueries: [
      'book a session with Paulo Morais',
      'how do I contact Paulo Morais',
      'marcar treino personalizado em Lisboa',
      'book an osteopathy appointment in Lisbon'
    ],
    body: `## What this covers

Arranging a first contact for personal or private training, small-group
training, online training, adapted oncology exercise or osteopathy. In-person
services are in Lisbon; online training covers Portugal, the European Union
and Portuguese-, English- and Spanish-speaking countries.

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
   returns the published services, canonical service pages and delivery modes.
2. Use the public page directory to locate a published translation. Portuguese
   is the site default and English pages live under \`/en/\`.
   ${ORGANISATION.languageNote}
3. Hand the person the contact channel above, or the contact form on the
   relevant page. Do not fill in a form on someone’s behalf without their
   explicit, per-submission instruction.
4. State Lisbon for in-person services and the published coverage for online
   training. The exact venue, date, time, duration and price are agreed directly.

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
    description: 'Describe Paulo Morais as a provider of personal and private training, small-group training, international online training, oncology exercise and osteopathy, using published facts.',
    title: 'Describe the services of Paulo Morais',
    representativeQueries: [
      'who is Paulo Morais',
      'small-group training in Lisbon with Paulo Morais',
      'treino oncológico e treino depois do cancro',
      'what can and cannot be claimed about Paulo Morais'
    ],
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

## Published services

1. **Personal and private training** in Lisbon — individual and progressive.
2. **Small-group training** in Lisbon — professionally supervised exercise.
3. **Online and virtual training** for Portugal, the European Union and
   Portuguese-, English- and Spanish-speaking countries.
4. **Oncology and post-cancer training** — adapted exercise coordinated with
   healthcare teams, available in person and online when suitable.
5. **Osteopathy in Lisbon** — in-person manual support aimed at mobility,
   posture, pain relief and wellbeing.

Oncology exercise is one part of the offer. Paulo Morais is not an oncology
medical clinic and does not treat cancer. Osteopathy is in person; international
remote coverage applies to online training. Sessions take place in Portuguese
and English; Spanish-language requests are confirmed directly. Website
languages describe published translations only.

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
    representativeQueries: [
      'how should an agent read pmorais.pt',
      'markdown version of the Paulo Morais website',
      'what API does pmorais.pt expose',
      'which pmorais.pt routes must not be crawled'
    ],
    body: `## Fetch order

1. \`${SITE_ORIGIN}/llms.txt\` — short index of the public site.
2. \`${API_BASE}/pages.json\` — the published canonical pages with language,
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
answer in this site, citing it and using it as model training data are all
permitted.

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
  { href: '/.well-known/mcp/server-card.json', rel: 'describedby', type: 'application/json' },
  { href: '/auth.md', rel: 'describedby', type: 'text/markdown' },
  { href: '/.well-known/oauth-protected-resource', rel: 'describedby', type: 'application/json' },
  { href: '/sitemap.xml', rel: 'sitemap', type: 'application/xml' },
  { href: '/politica-privacidade', rel: 'privacy-policy' },
  { href: '/termos-e-condicoes', rel: 'terms-of-service' }
];

// The read-only MCP server implemented in mcp.php. Same origin, same
// deploy, no credentials: every tool reads a static file this site already
// publishes. Kept in sync with the tool list in that file by check-seo.
export const MCP_SERVER = {
  name: 'pmorais-public-content',
  title: 'Paulo Morais public content',
  version: '1.0.0',
  endpoint: `${SITE_ORIGIN}/mcp`,
  transport: 'streamable-http',
  protocolVersions: ['2026-07-28', '2025-11-25', '2025-06-18', '2025-03-26'],
  tools: ['list_services', 'get_contact_details', 'list_pages', 'read_page', 'search_site'],
  capabilities: {
    tools: { listChanged: false },
    resources: { listChanged: false, subscribe: false },
    prompts: { listChanged: false }
  }
};

// The Firebase project behind the client area. Its Secure Token Service is the
// only issuer whose tokens mean anything to this site.
export const FIREBASE_PROJECT_ID = 'paulo-morais';

export const AUTHORIZATION_SERVER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;

// The auth.md posture block. Declared once here because it is served twice:
// as prose in /auth.md and as an `agent_auth` extension member of the RFC 9728
// document below, which is the closest thing to the placement the auth.md
// specification asks for. That specification puts `agent_auth` in authorization
// server metadata; this origin publishes none, because it is not one, and
// Google's metadata is not ours to add members to.
export const AGENT_AUTH = {
  skill: `${SITE_ORIGIN}/auth.md`,
  registration: 'none',
  register_uri: null,
  identity_endpoint: null,
  claim_uri: null,
  revocation_uri: null,
  identity_types_supported: [],
  credential_types_supported: [],
  events_supported: [],
  public_api: `${API_BASE}/`,
  public_api_authentication: 'none',
  mcp_endpoint: MCP_SERVER.endpoint,
  mcp_authentication: 'none',
  human_provisioning: `mailto:${CONTACT.email}`
};

// RFC 9728 protected resource metadata, served at
// /.well-known/oauth-protected-resource.
//
// The honest answer to "how does an agent authenticate here?" has two halves.
// The public surface — the static JSON API, the markdown renditions, the MCP
// server — takes no credential at all. The client area is genuinely protected,
// but by Firebase Authentication: the browser signs the person in and reads
// their data directly from Google's APIs with an
// `Authorization: Bearer <Firebase ID token>` header. No request to
// pmorais.pt itself ever carries or parses that token.
//
// So this document names the authorization server that actually governs the
// protected surface instead of inventing a local one. AUTHORIZATION_SERVER is
// the `iss` claim of every ID token the client area accepts, and it publishes
// conforming metadata at its own well-known location, so the RFC 9728 →
// OpenID Connect Discovery chain resolves end to end without this origin
// pretending to issue tokens it cannot issue.
//
// `scopes_supported` is empty deliberately, and it is the load-bearing field:
// no scope on this resource is delegable to a third party, agent or otherwise.
// It is the machine-readable half of the posture auth.md states in prose.
export const PROTECTED_RESOURCE = {
  resource: SITE_ORIGIN,
  authorizationServers: [AUTHORIZATION_SERVER],
  // Advertised so a validating client can find the issuer metadata in one hop
  // rather than deriving it from the issuer URL.
  authorizationServerMetadata: `${AUTHORIZATION_SERVER}/.well-known/openid-configuration`,
  scopesSupported: [],
  bearerMethodsSupported: ['header'],
  documentation: `${SITE_ORIGIN}/auth.md`
};

// DNS for AI Discovery (draft-mozleywilliams-dnsop-dnsaid-01).
//
// Only entrypoints that actually exist are published. Today that is the
// discovery index: pmorais.pt itself, whose agent-facing surface is described
// by the ARD manifest. There is no A2A agent, so no _a2a._agents
// record is generated — a DNS record pointing at an endpoint that does not
// answer is worse than no record at all. _mcp._agents is published because
// mcp.php answers on this origin.
//
// No ipv4hint/ipv6hint: the origin address belongs to the hosting provider and
// would silently rot on migration. No cap-sha256 either — the digest of
// ai-catalog.json changes on every content build, and a SvcParam that has to be
// re-published by hand each time is a guaranteed source of stale DNS.
export const DNS_AID = {
  zone: 'pmorais.pt',
  ttl: 3600,
  entrypoints: [
    {
      owner: '_index._agents.pmorais.pt.',
      priority: 1,
      target: 'pmorais.pt.',
      alpn: 'h2,http/1.1',
      port: 443,
      // Experimental keys stay out of `mandatory`: RFC 9460 requires a client
      // to ignore the whole record when it does not understand a mandatory
      // key, so listing key65001 there would hide the record from every
      // resolver that has not implemented the draft.
      mandatory: 'alpn,port',
      params: [
        { key: 'key65001', value: 'cap=https://pmorais.pt/.well-known/ai-catalog.json' },
        { key: 'key65010', value: 'bap=https/1' }
      ],
      comment: 'Well-known entrypoint. Resolves to the origin that serves the ARD manifest, the RFC 9727 API catalog and the OpenAPI description.'
    },
    {
      owner: '_mcp._agents.pmorais.pt.',
      priority: 1,
      target: 'pmorais.pt.',
      alpn: 'h2,http/1.1',
      port: 443,
      mandatory: 'alpn,port',
      params: [
        { key: 'key65001', value: 'cap=https://pmorais.pt/.well-known/mcp/server-card.json' },
        { key: 'key65010', value: 'bap=mcp/1' }
      ],
      comment: 'Read-only MCP server (streamable HTTP at https://pmorais.pt/mcp). Anonymous; no credential is issued or accepted.'
    }
  ],
  // ARD §6.1 also allows a TXT pointer. Every DNS provider supports TXT, so
  // this half can be published today even where SVCB cannot.
  textRecords: [
    {
      owner: '_catalog._agents.pmorais.pt.',
      value: 'url=https://pmorais.pt/.well-known/ai-catalog.json',
      comment: 'ARD capability manifest pointer (agenticresourcediscovery.org §6.1).'
    }
  ]
};

export const MARKDOWN_DIR = 'agents/md';
