export const SITE_ORIGIN = 'https://pmorais.pt';
export const LAST_MODIFIED = '2026-07-19';
export const ASSET_VERSION = '2.0.0';

export const PUBLIC_PAGES = [
  {
    file: 'index.html',
    path: '/',
    language: 'pt-PT',
    alternatePath: '/en/',
    title: 'Treino Personalizado e Osteopatia | Paulo Morais · Lisboa',
    description: 'Treino personalizado, treino online e osteopatia em Lisboa. Paulo Morais — personal trainer com mais de 20 anos de experiência. Treino adaptado a si, acessível e eficaz.',
    ogType: 'website',
    priority: '1.0'
  },
  {
    file: 'osteopatia.html',
    path: '/osteopatia',
    language: 'pt-PT',
    alternatePath: '/en/osteopatia',
    title: 'Osteopatia Lisboa · Alívio de Dores e Mobilidade | Paulo Morais',
    description: 'Osteopatia em Lisboa com Paulo Morais: acompanhamento personalizado para alívio de dores, melhoria da mobilidade e bem-estar, com uma abordagem manual integrativa.',
    ogType: 'website',
    priority: '0.9'
  },
  {
    file: 'sobre-mim.html',
    path: '/sobre-mim',
    language: 'pt-PT',
    alternatePath: '/en/sobre-mim',
    title: 'Sobre Paulo Morais · Personal Trainer e Osteopata em Lisboa',
    description: 'Conheça Paulo Morais, personal trainer e técnico de osteopatia em Lisboa com mais de 20 anos de experiência em treino personalizado, recuperação e exercício oncológico.',
    ogType: 'profile',
    priority: '0.8'
  },
  {
    file: 'blog.html',
    path: '/blog',
    language: 'pt-PT',
    alternatePath: '/en/blog',
    title: 'Blog de Treino, Osteopatia e Bem-Estar | Paulo Morais',
    description: 'Artigos de Paulo Morais sobre treino personalizado, osteopatia, exercício em oncologia, recuperação, saúde e bem-estar.',
    ogType: 'website',
    priority: '0.7'
  },
  {
    file: 'en/index.html',
    path: '/en/',
    language: 'en-GB',
    alternatePath: '/',
    title: 'Personal Training and Osteopathy | Paulo Morais · Lisbon',
    description: 'Personal training, online coaching and osteopathy in Lisbon. Paulo Morais brings more than 20 years of experience to accessible, effective and individual support.',
    ogType: 'website',
    priority: '1.0'
  },
  {
    file: 'en/osteopatia.html',
    path: '/en/osteopatia',
    language: 'en-GB',
    alternatePath: '/osteopatia',
    title: 'Osteopathy in Lisbon · Pain Relief and Mobility | Paulo Morais',
    description: 'Osteopathy in Lisbon with Paulo Morais: personalised support for pain relief, improved mobility and wellbeing through an integrated manual approach.',
    ogType: 'website',
    priority: '0.9'
  },
  {
    file: 'en/sobre-mim.html',
    path: '/en/sobre-mim',
    language: 'en-GB',
    alternatePath: '/sobre-mim',
    title: 'About Paulo Morais · Personal Trainer and Osteopath in Lisbon',
    description: 'Meet Paulo Morais, a personal trainer and osteopathy practitioner in Lisbon with more than 20 years of experience in personalised training, recovery and oncology exercise.',
    ogType: 'profile',
    priority: '0.8'
  },
  {
    file: 'en/blog.html',
    path: '/en/blog',
    language: 'en-GB',
    alternatePath: '/blog',
    title: 'Training, Osteopathy and Wellbeing Blog | Paulo Morais',
    description: 'Articles by Paulo Morais about personal training, osteopathy, oncology exercise, recovery, health and wellbeing.',
    ogType: 'website',
    priority: '0.7'
  }
];

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
  '/en/perfis'
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
