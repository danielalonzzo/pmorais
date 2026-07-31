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
    return path;
}

function languageDestination(language, pathname) {
    const path = cleanPath(pathname);
    if (language === 'en') return LANGUAGE_ROUTES.get(path) || null;
    return REVERSE_LANGUAGE_ROUTES.get(path) || null;
}

window.toggleLanguage = function() {
    const currentPath = cleanPath(window.location.pathname);
    const isEnglish = currentPath.startsWith('/en/');
    const language = isEnglish ? 'pt' : 'en';
    let destination = languageDestination(language, currentPath) || (language === 'en' ? '/en/' : '/');
    localStorage.setItem('pm_lang_pref', language);
    
    // A static dev server has no rewrite rules, so clean URLs have to be mapped
    // back to real files. Template literals keep these paths out of reach of the
    // quoted-route rewriting in scripts/normalize-internal-urls.mjs.
    if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
        destination = destination.endsWith('/')
            ? `${destination}index.html`
            : `${destination}.html`;
    }
    window.location.href = `${destination}${window.location.search}${window.location.hash}`;
};
