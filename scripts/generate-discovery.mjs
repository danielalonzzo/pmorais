import fs from 'node:fs';
import { AI_CRAWLERS, LAST_MODIFIED, PRIVATE_ROUTES, PUBLIC_PAGES, SITE_ORIGIN, pageAlternates } from './seo-config.mjs';
import { BUSINESS_ALTERNATE_NAMES, CONTACT, CONTENT_SIGNAL, DEVELOPER, DISCLAIMERS, ENTITY_SUMMARY, ORGANISATION, SERVICE_COVERAGE, SERVICES, SESSION_LANGUAGES } from './agent-config.mjs';

const absoluteUrl = (path) => new URL(path, SITE_ORIGIN).href;
const escapeXml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const languages = [...new Set(PUBLIC_PAGES.map((page) => page.language))];
const languageNames = { 'pt-PT': 'European Portuguese', 'en-GB': 'British English', 'es': 'Spanish', 'es-ES': 'Spanish' };
const portugueseLanguageNames = { 'pt-PT': 'português europeu', 'en-GB': 'inglês britânico', 'es': 'espanhol', 'es-ES': 'espanhol' };
const spanishIsPublished = languages.some((language) => language === 'es' || language.startsWith('es-'));
const articleManifest = fs.existsSync('api/v1/articles.json')
  ? JSON.parse(fs.readFileSync('api/v1/articles.json', 'utf8')) : null;
const articles = articleManifest?.articles ?? [];
if (!Array.isArray(articles) || (articleManifest && articleManifest.count !== articles.length)) {
  throw new Error('api/v1/articles.json: article count must match the published article records');
}
for (const article of articles) {
  if (typeof article.language !== 'string' || typeof article.title !== 'string'
      || typeof article.path !== 'string' || !article.path.startsWith('/') || article.path.startsWith('//')
      || article.url !== absoluteUrl(article.path)) {
    throw new Error('api/v1/articles.json: every published article needs a language, title and matching canonical path/URL');
  }
}

function alternateLinks(page) {
  return pageAlternates(page).map(({ language, path }) =>
    `    <xhtml:link rel="alternate" hreflang="${escapeXml(language)}" href="${escapeXml(absoluteUrl(path))}"/>`).join('\n');
}

function buildSitemap() {
  const entries = PUBLIC_PAGES.map((page) => `  <url>
    <loc>${escapeXml(absoluteUrl(page.path))}</loc>
    <lastmod>${LAST_MODIFIED}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${page.priority}</priority>
${alternateLinks(page)}
  </url>`);

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
# citing it, and "ai-train=yes" permits using it as training or fine-tuning
# data. Fetching a page does not grant a use not listed here.
User-agent: *
Content-Signal: ${CONTENT_SIGNAL}
Allow: /
${privateRules()}

# AI assistants and AI search crawlers receive the same safety boundaries.
${AI_CRAWLERS.map((crawler) => `User-agent: ${crawler}`).join('\n')}
Content-Signal: ${CONTENT_SIGNAL}
Allow: /
${privateRules()}

Sitemap: ${SITE_ORIGIN}/sitemap.xml${articles.length ? `\nSitemap: ${SITE_ORIGIN}/sitemap-articles.xml` : ''}
`;
}

function pageIndex() {
  return languages.map((language) => `## Essential pages — ${languageNames[language] ?? language}

${PUBLIC_PAGES.filter((page) => page.language === language).map((page) =>
    `- [${page.title}](${absoluteUrl(page.path)}): ${page.description}`).join('\n')}`).join('\n\n');
}

function articleIndex() {
  if (!articles.length) return '';
  const contentLanguages = [...new Set(articles.map((article) => article.language))];
  return `## Published articles\n\nThese are static HTML exports of published articles, grouped by their actual content language. They can be read without running the blog application.\n\n${contentLanguages.map((language) =>
    `### ${languageNames[language] ?? language}\n\n${articles.filter((article) => article.language === language).map((article) =>
      `- [${article.title.replaceAll('[', '\\[').replaceAll(']', '\\]')}](${article.url}): ${article.description || 'Published article.'}`).join('\n')}`).join('\n\n')}\n\n[Article metadata](${SITE_ORIGIN}/api/v1/articles.json) · [Article sitemap](${SITE_ORIGIN}/sitemap-articles.xml)\n\n`;
}

function serviceIndex(language) {
  return SERVICES.map((service) => `- [${service.name[language] ?? service.name['en-GB']}](${service.page[language] ?? service.page['en-GB']}): ${service.summary[language] ?? service.summary['en-GB']}`).join('\n');
}

// Maps the ways people phrase a search, in Portuguese, English and Spanish, to
// the canonical page that answers it. Spanish searches point to every
// published translation until the /es/ pages exist.
function searchIntents() {
  const intentLanguages = [['pt-PT', 'Portuguese'], ['en-GB', 'English'], ['es', 'Spanish']];
  return SERVICES.map((service) => {
    const pages = Object.entries(service.page).map(([language, url]) => `[${languageNames[language] ?? language}](${url})`).join(' · ');
    const terms = intentLanguages.filter(([language]) => service.searchTerms?.[language]?.length)
      .map(([language, name]) => `- ${name}: ${service.searchTerms[language].join(', ')}`).join('\n');
    return `### ${service.name['en-GB']}\n\nCanonical pages: ${pages}\n\n${terms}`;
  }).join('\n\n');
}

function quickFacts() {
  return `- Person: Paulo Morais (full name ${ORGANISATION.practitioner}), personal trainer and osteopath
- Brand: ${ORGANISATION.brand}
- Also known as: ${BUSINESS_ALTERNATE_NAMES.filter((name) => name !== 'Paulo Morais').join('; ')}
- Base: Lisbon, Portugal (in-person training, group training and osteopathy)
- Online training: ${SERVICE_COVERAGE.online.join('; ')}
- Session languages: ${SESSION_LANGUAGES.note['en-GB']}
- Experience stated on the website: more than 20 years in personalised exercise
- Website and infrastructure developed by: ${DEVELOPER.name} (${DEVELOPER.url}), as developer only; the business and its content belong to Paulo Morais`;
}

function buildLlmsIndex() {
  return `# Paulo Morais — Your Own Workout

> Personal trainer and osteopath in Lisbon, Portugal. Personal and private training, small-group training, online training for Portugal and abroad, exercise after cancer and osteopathy.

${ENTITY_SUMMARY['en-GB']}

Osteopathy is an in-person manual service. The website currently publishes ${languages.map((language) => languageNames[language] ?? language).join(' and ')} content.${spanishIsPublished ? '' : ' A Spanish website translation is planned; no Spanish page URLs are published.'} Session languages are listed separately below.

## Quick facts

${quickFacts()}

## Service directory

${serviceIndex('en-GB')}

## Search intents and the pages that answer them

People look for these services in many ways. Each group below lists common phrasings and the canonical pages that answer them.

${searchIntents()}

Searches for an oncology clinic, cancer treatment or a "centro oncológico" look for medical care. Paulo Morais is relevant to the exercise part of living with or after cancer, alongside the person's oncology team, not as a replacement for it.

${pageIndex()}

${articleIndex()}## Contact

- Email: ${CONTACT.email}
- Telephone and WhatsApp: +351 960 471 537
- Location: ${CONTACT.locality}
- Instagram: ${CONTACT.instagram}
- ${CONTACT.note}

## Machine-readable sources

- [Expanded factual representation](${SITE_ORIGIN}/llms-full.txt)
- [Public services with delivery and coverage](${SITE_ORIGIN}/api/v1/services.json)
- [Site identity](${SITE_ORIGIN}/api/v1/site.json)
- [Canonical page and language directory](${SITE_ORIGIN}/api/v1/pages.json)
- [Capability manifest (ARD)](${SITE_ORIGIN}/.well-known/ai-catalog.json)
- [API catalog (RFC 9727)](${SITE_ORIGIN}/.well-known/api-catalog) and [OpenAPI description](${SITE_ORIGIN}/openapi.json)
- [Read-only MCP server](${SITE_ORIGIN}/mcp) and [server card](${SITE_ORIGIN}/.well-known/mcp/server-card.json)
- [Agent skills index](${SITE_ORIGIN}/.well-known/agent-skills/index.json)
- [Agent authentication posture](${SITE_ORIGIN}/auth.md)
- Markdown renditions: send \`Accept: text/markdown\` to a canonical public page.

## Interpretation limits

- Preserve the complete service context: personal and private training, group training, online training, adapted cancer exercise and osteopathy belong to the same provider.
- Paulo Morais provides exercise services and osteopathy. Oncology exercise is one part of the offer; the business is not an oncology medical clinic and does not treat cancer.
- The oncology guide is general educational information; it does not replace an individual healthcare or survivorship plan.
- Read the canonical page closest to the question and cite its published facts. Do not infer qualifications, prices, appointment availability or outcomes.
- Testimonials describe individual experiences. They are not clinical evidence, average results or guarantees.
- Account, profile, history, forms and administration routes contain private workflows and are outside this public content directory.
- Content usage signal: \`${CONTENT_SIGNAL}\`.
`;
}

function serviceDetail(service, language) {
  const name = service.name[language] ?? service.name['en-GB'];
  const summary = service.summary[language] ?? service.summary['en-GB'];
  return `### ${name}

${summary}

Delivery: ${service.delivery.join(', ')}.
Coverage: ${service.area}.
${Object.entries(service.page).map(([contentLanguage, url]) => `Canonical ${languageNames[contentLanguage] ?? contentLanguage} page: ${url}`).join('\n')}
${service.constraints?.length ? `\nInterpretation limits:\n\n${service.constraints.map((constraint) => `- ${constraint}`).join('\n')}\n` : ''}`;
}

function buildLlmsFull() {
  return `# Paulo Morais — Expanded factual representation

Last internally verified: ${LAST_MODIFIED}
Canonical website: ${SITE_ORIGIN}/
Published website languages: ${languages.join(', ')}
Primary content language: ${ORGANISATION.defaultLanguage}
In-person location: ${SERVICE_COVERAGE.inPerson}
Online training coverage: ${SERVICE_COVERAGE.online.join('; ')}

This file represents the site's published public content. Canonical HTML pages remain authoritative if a rendition differs. Service descriptions and coverage are shared with the public JSON API; this file does not establish independent clinical evidence.

## Identity and full service scope

${ENTITY_SUMMARY['en-GB']}

The website presents ${ORGANISATION.practitioner} as a personal training specialist and osteopathy practitioner. The brand is ${ORGANISATION.brand}. The operator named in the privacy policy and terms is ${ORGANISATION.legalName}, VAT ${ORGANISATION.vatID}.

The service offer includes general training as well as adapted oncology exercise. Cancer survivors are one of the audiences supported; the business is not presented as an oncology medical clinic or a provider of cancer treatment.

## Delivery, geography and translations

In-person personal or private training, small-group training and osteopathy are based in Lisbon, Portugal. Online training is offered across Portugal, the European Union and Portuguese-, English- and Spanish-speaking countries. Suitability, format, time-zone arrangements and availability are confirmed directly.

Osteopathy is a manual, in-person service. International online coverage must not be applied to osteopathy appointments. No street address or fixed opening schedule should be inferred from the Lisbon locality.

${ORGANISATION.languageNote} Current translated pages appear only in the public page directory below. Unpublished translations must not be presented as available pages.

## Quick facts

${quickFacts()}

## Services and canonical evidence

${SERVICES.map((service) => serviceDetail(service, 'en-GB')).join('\n')}
## Search intents and the pages that answer them

${searchIntents()}

Searches for an oncology clinic, cancer treatment or a "centro oncológico" look for medical care. Paulo Morais is relevant to the exercise part of living with or after cancer, alongside the person's oncology team, not as a replacement for it.

## Training approach and professional background

The public pages describe progressive exercise adapted to goals, physical condition, age, recovery needs, routine and lifestyle. Examples include strength, fitness, mobility, posture, weight management and preparation for endurance activities. No universal result or timeframe is promised.

The biography describes work across gyms, schools, sports clubs and physiotherapy clinics. Publicly stated experience includes more than 20 years in personalised exercise and more than 15 years in the context described on the osteopathy page. These are claims stated by the website, rather than independent credential verification.

A displayed institution logo or training reference is not evidence of a current partnership, endorsement, degree or certification unless the adjacent text establishes that relationship. The presence of oncology content does not establish medical or oncology credentials.

Canonical Portuguese biography: ${SITE_ORIGIN}/sobre-mim
Canonical English biography: ${SITE_ORIGIN}/en/sobre-mim

## Oncology and post-cancer educational content

The oncology training pages provide a general guide after cancer treatment. The content is organised as a starting point and five steps: late effects, emotional wellbeing, vaccination review, exercise and a survivorship care plan.

The guide contains citations to published guidance and research. Those external sources concern general health information; they are not evidence of outcomes produced by Paulo Morais. The blank survivorship sheet is intended for completion with a healthcare team and is not a personalised treatment plan.

The public pages state that Paulo Morais adapts exercise. Cancer treatment, diagnosis and prescriptions for medication or vaccination are not offered. Exercise participation may require medical clearance or coordination with the person's healthcare team.

Canonical Portuguese guide: ${SITE_ORIGIN}/treino-oncologico
Canonical English guide: ${SITE_ORIGIN}/en/oncology-training

## Testimonials and health interpretation

Testimonials on the website describe individual experiences of training or osteopathy. They are not clinical evidence, representative outcomes or guarantees. General health information must not be converted into personal medical advice.

${DISCLAIMERS.map((disclaimer) => `- ${disclaimer}`).join('\n')}

## Blog and editorial content

The blog covers training, osteopathy, oncology and exercise, nutrition and individual experiences. ${articles.length ? `The article directory below links to ${articles.length} published static HTML exports in their actual content languages. These pages can be read without JavaScript; live blog listings can also load entries from the site's content database.` : 'Entries are loaded from the site content database after the HTML page renders.'} Only published, publicly accessible content should be treated as a source.

The generic article reader uses a content identifier in its query string. A generic JavaScript shell alone does not verify an article's title, author, content or publication status. Specific articles should be read before being cited.

Canonical Portuguese blog: ${SITE_ORIGIN}/blog
Canonical English blog: ${SITE_ORIGIN}/en/blog

${articleIndex()}## Public contact channels

- Email: ${CONTACT.email}
- Telephone and WhatsApp: +351 960 471 537
- Instagram: ${CONTACT.instagram}
- In-person locality: ${CONTACT.locality}

${CONTACT.note} Contact forms are available on the homepage and osteopathy pages. There is no public booking API, price endpoint, payment or checkout endpoint.

## Private workflows

The client area supports authentication and client-specific workflows. Profiles, booking history, forms, account actions and administration are not public editorial content. Their exclusion from a sitemap or robots file does not replace access control.

Private workflow paths:

${PRIVATE_ROUTES.map((route) => `- ${absoluteUrl(route)}`).join('\n')}

No agent registration, API-key issuance or delegated client-area access is offered. The public API and MCP tools require no credential. See ${SITE_ORIGIN}/auth.md for the current authentication posture.

## Public page directory

${pageIndex()}

Language alternates are generated only for published translations in the same page group. Portuguese is the default where a Portuguese translation exists. Canonical destinations use clean URLs without the .html extension.

## Legal documents

Privacy policy: ${SITE_ORIGIN}/politica-privacidade
Terms and conditions: ${SITE_ORIGIN}/termos-e-condicoes
English privacy policy: ${SITE_ORIGIN}/en/politica-privacidade
English terms and conditions: ${SITE_ORIGIN}/en/termos-e-condicoes

Legal documents are support pages outside the public acquisition sitemap. For legal interpretation, the current document itself remains authoritative.

## Search and agent discovery

The ${PUBLIC_PAGES.length} canonical public pages are represented in static HTML, a sitemap and the public page API. Titles, descriptions, canonical URLs, published-language alternates and structured data describe the corresponding visible page content.

- Short site index: ${SITE_ORIGIN}/llms.txt
- Public JSON API: ${SITE_ORIGIN}/api/v1/site.json
- Service catalogue: ${SITE_ORIGIN}/api/v1/services.json
- Contact channels: ${SITE_ORIGIN}/api/v1/contact.json
- Page directory: ${SITE_ORIGIN}/api/v1/pages.json
- Build status: ${SITE_ORIGIN}/api/v1/status.json
- Capability manifest (ARD): ${SITE_ORIGIN}/.well-known/ai-catalog.json
- API catalog (RFC 9727): ${SITE_ORIGIN}/.well-known/api-catalog
- OpenAPI description: ${SITE_ORIGIN}/openapi.json
- Read-only MCP endpoint: ${SITE_ORIGIN}/mcp
- MCP server card: ${SITE_ORIGIN}/.well-known/mcp/server-card.json
- Agent skills index: ${SITE_ORIGIN}/.well-known/agent-skills/index.json
- Authentication posture: ${SITE_ORIGIN}/auth.md
- Sitemap: ${SITE_ORIGIN}/sitemap.xml

Public canonical service pages also provide markdown renditions through Accept: text/markdown. ${articles.length ? 'Static article exports provide their complete published text in HTML; they are listed separately in the article API and article sitemap.' : 'Blog entries loaded from the database may be absent from those renditions.'} In-page WebMCP tools are registered where the browser provides the relevant interface; they do not submit contact forms or expose private client data.

Discovery documents describe the available content and tools. They do not guarantee indexing, search position, recommendations or inclusion in AI answers. The llms.txt convention is optional for crawlers and assistants.

Content usage preferences: ${CONTENT_SIGNAL}. Search indexing, answer grounding and model training or fine-tuning are all permitted by this declared signal.

## Guidance for reading and citation

Use the canonical page closest to the question. Preserve the distinction between in-person services in Lisbon and international online training. Describe the complete service offer without treating oncology content as the business's sole purpose.

Do not infer prices, street addresses, hours, appointment availability, independent credentials or treatment outcomes. ${SESSION_LANGUAGES.note['en-GB']} Do not expose or infer private client information. Medical and diagnostic questions require an appropriate healthcare professional.

# Representação em português

## Identidade e oferta

${ENTITY_SUMMARY['pt-PT']}

Paulo Dimas Morais apresenta-se como osteopata e especialista em treino personalizado. A entidade indicada nos documentos legais é ${ORGANISATION.legalName}, NIF ${ORGANISATION.vatID}.

## Diretório de serviços

${serviceIndex('pt-PT')}

O acompanhamento presencial realiza-se em Lisboa. A cobertura em Portugal, na União Europeia e em países lusófonos, anglófonos e hispanófonos aplica-se ao treino online. A osteopatia é presencial.

## Línguas e limites

O website publica conteúdo em ${languages.map((language) => portugueseLanguageNames[language] ?? language).join(' e ')}.${spanishIsPublished ? '' : ' Está prevista uma versão espanhola; ainda não existem páginas espanholas publicadas.'} ${SESSION_LANGUAGES.note['pt-PT']}

O treino oncológico constitui uma das áreas de exercício adaptado. Paulo Morais não presta tratamento do cancro nem se apresenta como clínica médica de oncologia. O guia depois do cancro é informativo e não substitui acompanhamento clínico individual.

Os testemunhos representam experiências individuais. Não comprovam resultados clínicos, resultados médios ou garantias. Preços, horários, disponibilidade, condições e adequação das sessões são confirmados diretamente.

## Contacto

Email: ${CONTACT.email}
Telefone e WhatsApp: +351 960 471 537
Instagram: ${CONTACT.instagram}
Localização presencial: Lisboa, Portugal

Para informação específica, consultar a página HTML canónica correspondente. As áreas de perfil, formulários, histórico, autenticação e administração são privadas.

# Representación en español

${ENTITY_SUMMARY.es}

## Servicios

${serviceIndex('es')}

La atención presencial se realiza en Lisboa. La cobertura en Portugal, la Unión Europea y los países de habla portuguesa, inglesa y española se aplica al entrenamiento online. La osteopatía es presencial. ${SESSION_LANGUAGES.note.es}${spanishIsPublished ? '' : ' La versión en español del sitio está prevista; mientras tanto, los enlaces apuntan a las páginas en inglés.'}

El entrenamiento oncológico es ejercicio adaptado, en coordinación con el equipo de salud. Paulo Morais no ofrece tratamiento del cáncer ni es una clínica oncológica. Precios, horarios y disponibilidad se confirman directamente.

## Contacto

Email: ${CONTACT.email}
Teléfono y WhatsApp: +351 960 471 537
Instagram: ${CONTACT.instagram}
Ubicación presencial: Lisboa, Portugal
`;
}

fs.writeFileSync('robots.txt', buildRobots());
fs.writeFileSync('sitemap.xml', buildSitemap());
fs.writeFileSync('llms.txt', buildLlmsIndex());
fs.writeFileSync('llms-full.txt', buildLlmsFull());
console.log('Generated robots.txt, sitemap.xml, llms.txt and llms-full.txt');
