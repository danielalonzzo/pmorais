/*
 * Language routing logic.
 *
 * Language changes are always initiated by the visitor. Automatically
 * redirecting from the canonical URL based on navigator.language caused a
 * second full page load, confused crawlers and made performance measurements
 * depend on the browser locale.
 */

const LANGUAGE_ROUTES = new Map([
    ['/', '/en/'],
    ['/osteopatia', '/en/osteopatia'],
    ['/sobre-mim', '/en/sobre-mim'],
    ['/blog', '/en/blog'],
    ['/treino-oncologico', '/en/oncology-training'],
    ['/treino-em-grupo', '/en/group-training'],
    ['/treino-online', '/en/online-training'],
    ['/artigo', '/en/article'],
    ['/perfil', '/en/perfil'],
    ['/perfis', '/en/perfis'],
    ['/formulario', '/en/formulario'],
    ['/historico', '/en/historico'],
    ['/politica-privacidade', '/en/politica-privacidade'],
    ['/termos-e-condicoes', '/en/termos-e-condicoes'],
    ['/desinscrever', '/en/desinscrever'],
    ['/auth-action', '/en/auth-action']
]);

const REVERSE_LANGUAGE_ROUTES = new Map([...LANGUAGE_ROUTES].map(([pt, en]) => [en, pt]));

function cleanPath(pathname) {
    let path = pathname.replace(/\.html$/, '');
    if (path === '/index' || path === '') path = '/';
    if (path === '/en' || path === '/en/index') path = '/en/';
    if (path === '/es' || path === '/es/index') path = '/es/';
    return path;
}

function languageDestination(language, pathname) {
    const path = cleanPath(pathname);
    // Public pages declare every published translation in the generated head.
    // This also handles Spanish when real translated pages are registered.
    const alternate = [...document.querySelectorAll('link[rel="alternate"][hreflang]')]
        .find(link => link.hreflang === language || link.hreflang.startsWith(`${language}-`));
    if (alternate) return new URL(alternate.href).pathname;
    if (language === 'en') return LANGUAGE_ROUTES.get(path) || null;
    return REVERSE_LANGUAGE_ROUTES.get(path) || null;
}

// Equivalent visible section IDs differ between the PT and EN pages.
// Keep shared anchors, and translate the known localized section names.
const LANGUAGE_FRAGMENTS = [
    { pt: 'treino-personalizado', en: 'personal-training' },
    { pt: 'servicos', en: 'services' },
    { pt: 'perguntas', en: 'questions' }
];

function languageFragment(language, hash) {
    if (!hash) return '';
    const fragment = hash.slice(1);
    const equivalent = LANGUAGE_FRAGMENTS.find(group => Object.values(group).includes(fragment));
    return equivalent ? (equivalent[language] ? `#${equivalent[language]}` : '') : hash;
}

window.toggleLanguage = function() {
    const currentPath = cleanPath(window.location.pathname);
    const current = currentPath.startsWith('/en/') ? 'en' : currentPath.startsWith('/es/') ? 'es' : 'pt';
    // Public pages list every published translation in the head, so the globe
    // cycles PT, EN and, once it is published, ES without a hardcoded list.
    const published = [...new Set([...document.querySelectorAll('link[rel="alternate"][hreflang]')]
        .map(link => link.hreflang.split('-')[0])
        .filter(code => code !== 'x'))];
    const order = published.length > 1 ? published : ['pt', 'en'];
    const language = order[(order.indexOf(current) + 1) % order.length];
    let destination = languageDestination(language, currentPath) || ({ en: '/en/', es: '/es/' }[language] ?? '/');
    localStorage.setItem('pm_lang_pref', language);
    
    // A static dev server has no rewrite rules, so clean URLs have to be mapped
    // back to real files. Template literals keep these paths out of reach of the
    // quoted-route rewriting in scripts/normalize-internal-urls.mjs.
    if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
        destination = destination.endsWith('/')
            ? `${destination}index.html`
            : `${destination}.html`;
    }
    window.location.href = `${destination}${window.location.search}${languageFragment(language, window.location.hash)}`;
};
