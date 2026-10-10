export const SITE_ORIGIN = 'https://pmorais.pt';
export const LAST_MODIFIED = '2026-10-10';
export const ASSET_VERSION = '1.7.1';

// Add a fully translated /es/ page with a matching translationKey to activate
// Spanish hreflang in HTML, sitemaps and discovery. Unpublished URLs stay absent.
export const LOCALES = {
  'pt-PT': { hreflang: 'pt', ogLocale: 'pt_PT', home: '/', published: true },
  'en-GB': { hreflang: 'en', ogLocale: 'en_GB', home: '/en/', published: true },
  'es': { hreflang: 'es', ogLocale: 'es_ES', home: '/es/', published: false }
};

// Reserved Spanish URLs, one per translationKey. When a page is translated,
// add it to PUBLIC_PAGES with language 'es' and this exact path, and set
// LOCALES.es.published to true. check-seo rejects any other Spanish slug, and
// hreflang, sitemaps, llms.txt, the API and JSON-LD pick the page up from there.
export const PLANNED_SPANISH_PATHS = {
  'home': '/es/',
  'osteopathy': '/es/osteopatia',
  // Personal training lives on the about page (/sobre-mim#treino-personalizado).
  'about': '/es/sobre-mi',
  'blog': '/es/blog',
  'oncology-training': '/es/entrenamiento-oncologico',
  'group-training': '/es/entrenamiento-en-grupo',
  'online-training': '/es/entrenamiento-online'
};

export const PUBLIC_PAGES = [
  {
    "file": "index.html",
    "translationKey": "home",
    "path": "/",
    "language": "pt-PT",
    "alternatePath": "/en/",
    "title": "Paulo Morais | Personal Trainer e Osteopata em Lisboa",
    "description": "Treino personalizado, privado e em grupo, osteopatia e treino oncológico em Lisboa. Treino online para Portugal, União Europeia e países lusófonos, anglófonos e hispanófonos.",
    "ogType": "website",
    "priority": "1.0"
  },
  {
    "file": "osteopatia.html",
    "translationKey": "osteopathy",
    "path": "/osteopatia",
    "language": "pt-PT",
    "alternatePath": "/en/osteopatia",
    "title": "Osteopata em Lisboa | Osteopatia com Paulo Morais",
    "description": "Sessões de osteopatia em Lisboa com Paulo Morais. Avaliação individual e abordagem manual orientada para mobilidade, postura, conforto e bem-estar.",
    "ogType": "website",
    "priority": "0.9"
  },
  {
    "file": "sobre-mim.html",
    "translationKey": "about",
    "path": "/sobre-mim",
    "language": "pt-PT",
    "alternatePath": "/en/sobre-mim",
    "title": "Personal Trainer em Lisboa | Sobre Paulo Morais",
    "description": "Conheça Paulo Morais, personal trainer e osteopata em Lisboa com mais de 20 anos de experiência. Treino individual e privado, adaptado aos objetivos e à rotina.",
    "ogType": "profile",
    "priority": "0.9"
  },
  {
    "file": "blog.html",
    "translationKey": "blog",
    "path": "/blog",
    "language": "pt-PT",
    "alternatePath": "/en/blog",
    "title": "Blog de Treino, Osteopatia e Exercício Oncológico | Paulo Morais",
    "description": "Artigos de Paulo Morais sobre treino personalizado, osteopatia, exercício em oncologia, recuperação, saúde e bem-estar.",
    "ogType": "website",
    "priority": "0.7"
  },
  {
    "file": "treino-oncologico.html",
    "translationKey": "oncology-training",
    "path": "/treino-oncologico",
    "language": "pt-PT",
    "alternatePath": "/en/oncology-training",
    "title": "Treino Oncológico em Lisboa e Online | Paulo Morais",
    "description": "Exercício adaptado e treino depois do cancro em Lisboa e online, com Paulo Morais e coordenação com a equipa de saúde. Inclui guia de sobrevivência.",
    "ogType": "website",
    "priority": "0.8"
  },
  {
    "file": "en/index.html",
    "translationKey": "home",
    "path": "/en/",
    "language": "en-GB",
    "alternatePath": "/",
    "title": "Paulo Morais | Personal Trainer & Osteopath in Lisbon",
    "description": "Personal, private and group training, osteopathy and cancer exercise in Lisbon. Online coaching for Portugal, the EU and Portuguese-, English- and Spanish-speaking countries.",
    "ogType": "website",
    "priority": "1.0"
  },
  {
    "file": "en/osteopatia.html",
    "translationKey": "osteopathy",
    "path": "/en/osteopatia",
    "language": "en-GB",
    "alternatePath": "/osteopatia",
    "title": "Osteopath in Lisbon | Osteopathy with Paulo Morais",
    "description": "Osteopathy sessions in Lisbon with Paulo Morais. Individual assessment and a manual approach focused on mobility, posture, comfort and wellbeing.",
    "ogType": "website",
    "priority": "0.9"
  },
  {
    "file": "en/sobre-mim.html",
    "translationKey": "about",
    "path": "/en/sobre-mim",
    "language": "en-GB",
    "alternatePath": "/sobre-mim",
    "title": "Personal Trainer in Lisbon | About Paulo Morais",
    "description": "Meet Paulo Morais, a personal trainer and osteopath in Lisbon with more than 20 years of experience. Private, one-to-one training adapted to your goals and routine.",
    "ogType": "profile",
    "priority": "0.9"
  },
  {
    "file": "en/blog.html",
    "translationKey": "blog",
    "path": "/en/blog",
    "language": "en-GB",
    "alternatePath": "/blog",
    "title": "Training, Osteopathy & Cancer Exercise Blog | Paulo Morais",
    "description": "Articles by Paulo Morais about personal training, osteopathy, oncology exercise, recovery, health and wellbeing.",
    "ogType": "website",
    "priority": "0.7"
  },
  {
    "file": "en/oncology-training.html",
    "translationKey": "oncology-training",
    "path": "/en/oncology-training",
    "language": "en-GB",
    "alternatePath": "/treino-oncologico",
    "title": "Cancer Exercise in Lisbon & Online | Paulo Morais",
    "description": "Adapted exercise and post-cancer training in Lisbon and online with Paulo Morais, coordinated with the healthcare team. Includes a survivorship guide.",
    "ogType": "website",
    "priority": "0.8"
  },
  {
    "file": "treino-em-grupo.html",
    "translationKey": "group-training",
    "path": "/treino-em-grupo",
    "language": "pt-PT",
    "alternatePath": "/en/group-training",
    "title": "Treino em Grupo em Lisboa | Paulo Morais",
    "description": "Treino em pequenos grupos em Lisboa com Paulo Morais. Exercício acompanhado, adaptado à condição física e aos objetivos de cada participante.",
    "ogType": "website",
    "priority": "0.9"
  },
  {
    "file": "treino-online.html",
    "translationKey": "online-training",
    "path": "/treino-online",
    "language": "pt-PT",
    "alternatePath": "/en/online-training",
    "title": "Treino Online e Personal Trainer Virtual | Paulo Morais",
    "description": "Treino personalizado online com Paulo Morais, a partir de Lisboa, para Portugal, União Europeia e países lusófonos, anglófonos e hispanófonos.",
    "ogType": "website",
    "priority": "0.9"
  },
  {
    "file": "en/group-training.html",
    "translationKey": "group-training",
    "path": "/en/group-training",
    "language": "en-GB",
    "alternatePath": "/treino-em-grupo",
    "title": "Small Group Training in Lisbon | Paulo Morais",
    "description": "Small group training in Lisbon with Paulo Morais. Supervised exercise adapted to each participant’s physical condition and individual goals.",
    "ogType": "website",
    "priority": "0.9"
  },
  {
    "file": "en/online-training.html",
    "translationKey": "online-training",
    "path": "/en/online-training",
    "language": "en-GB",
    "alternatePath": "/treino-online",
    "title": "Online Personal Trainer & Virtual Coaching | Paulo Morais",
    "description": "Online personal training with Paulo Morais for Portugal, the European Union, Portuguese-speaking, English-speaking and Spanish-speaking countries.",
    "ogType": "website",
    "priority": "0.9"
  }
];

export function localizedPages(page, pages = PUBLIC_PAGES) {
  // A reserved locale is not a published translation. Both the locale and
  // the individual translated page must be registered before advertising it.
  return pages.filter((candidate) => candidate.translationKey === page.translationKey
    && LOCALES[candidate.language]?.published);
}

export function pageAlternates(page, pages = PUBLIC_PAGES) {
  const translations = localizedPages(page, pages);
  const fallback = translations.find((candidate) => candidate.language === 'pt-PT') ?? translations[0];
  return translations.map((candidate) => ({
    language: LOCALES[candidate.language]?.hreflang ?? candidate.language,
    path: candidate.path
  })).concat(fallback ? [{ language: 'x-default', path: fallback.path }] : []);
}

// Fail before rewriting any HTML when a future translation or service page
// introduces a conflicting URL, an unpublished locale or an invalid canonical.
export function assertPublicPages(pages = PUBLIC_PAGES) {
  const seenFiles = new Set();
  const seenPaths = new Set();
  const seenTranslations = new Set();
  for (const page of pages) {
    const label = page.file ?? page.path ?? 'Public page';
    if (!LOCALES[page.language]?.published) throw new Error(`${label}: locale ${page.language} is not published`);
    if (!page.translationKey || !page.file || !page.title || !page.description) throw new Error(`${label}: incomplete SEO metadata`);
    if (!page.path?.startsWith('/') || page.path.startsWith('//') || /[?#]|\.html$/i.test(page.path)) {
      throw new Error(`${label}: expected a clean, on-site canonical path`);
    }
    if (page.language === 'es' && PLANNED_SPANISH_PATHS[page.translationKey] !== page.path) {
      throw new Error(`${label}: Spanish URL must match its reserved translation path`);
    }
    const translation = `${page.translationKey}:${page.language}`;
    if (seenFiles.has(page.file) || seenPaths.has(page.path) || seenTranslations.has(translation)) {
      throw new Error(`${label}: duplicate file, canonical path or translation`);
    }
    seenFiles.add(page.file);
    seenPaths.add(page.path);
    seenTranslations.add(translation);
  }
}

export const PRIVATE_ROUTES = [
  '/admin-blog',
  '/auth-action',
  '/desinscrever',
  '/formulario',
  '/historico',
  '/perfil',
  '/perfis',
  '/en/auth-action',
  '/en/desinscrever',
  '/en/formulario',
  '/en/historico',
  '/en/perfil',
  '/en/perfis',
  // Spanish workflow routes are blocked as soon as the Spanish site goes live.
  ...(LOCALES.es.published ? [
    '/es/auth-action',
    '/es/desinscrever',
    '/es/formulario',
    '/es/historico',
    '/es/perfil',
    '/es/perfis'
  ] : [])
];

export const AI_CRAWLERS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'GoogleOther',
  'CCBot',
  'Applebot',
  'Applebot-Extended',
  'Amazonbot',
  'Bytespider',
  'cohere-ai',
  'MistralAI-User',
  'meta-externalagent',
  'meta-externalfetcher'
];

export const NON_PUBLIC_DESCRIPTIONS = {
  'admin-blog.html': 'Área reservada para gestão editorial do blog de Paulo Morais.',
  'artigo.html': 'Leitor de artigos sobre treino, osteopatia, saúde e bem-estar de Paulo Morais.',
  'auth-action.html': 'Área segura para confirmação de email e recuperação da conta Paulo Morais.',
  'desinscrever.html': 'Gestão da subscrição de comunicações de Paulo Morais.',
  'formulario.html': 'Área reservada de formulários de contacto de Paulo Morais.',
  'historico.html': 'Área reservada para consulta do histórico de marcações.',
  'perfil.html': 'Área de cliente para autenticação, marcações e gestão do acompanhamento.',
  'perfis.html': 'Área reservada para gestão de perfis de alunos.',
  'politica-privacidade.html': 'Política de privacidade do website e dos serviços de Paulo Morais.',
  'termos-e-condicoes.html': 'Termos e condições de utilização do website e dos serviços de Paulo Morais.',
  'en/article.html': 'Article reader for Paulo Morais content about training, osteopathy, health and wellbeing.',
  'en/auth-action.html': 'Secure area for email confirmation and Paulo Morais account recovery.',
  'en/desinscrever.html': 'Manage subscriptions to communications from Paulo Morais.',
  'en/formulario.html': 'Reserved contact forms area for Paulo Morais clients.',
  'en/historico.html': 'Reserved area for viewing booking history.',
  'en/perfil.html': 'Client area for sign-in, bookings and support management.',
  'en/perfis.html': 'Reserved area for student profile management.',
  'en/politica-privacidade.html': 'Privacy policy for the Paulo Morais website and services.',
  'en/termos-e-condicoes.html': 'Terms and conditions for use of the Paulo Morais website and services.'
};
