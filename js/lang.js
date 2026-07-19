/*
 * Language detection and routing logic
 * Automatically detects Romance languages -> defaults to PT
 * Other languages -> defaults to EN
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

(function() {
    const romanceLangs = ['pt', 'es', 'fr', 'it', 'ro', 'ca', 'gl'];
    let preferredLang = localStorage.getItem('pm_lang_pref');

    if (!preferredLang) {
        const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase().split('-')[0];
        preferredLang = romanceLangs.includes(browserLang) ? 'pt' : 'en';
    }

    const currentPath = cleanPath(window.location.pathname);
    const isEnglish = currentPath.startsWith('/en/');
    const destination = preferredLang === 'en' && !isEnglish
        ? languageDestination('en', currentPath)
        : preferredLang === 'pt' && isEnglish
            ? languageDestination('pt', currentPath)
            : null;

    if (destination && destination !== currentPath) {
        window.location.replace(`${destination}${window.location.search}${window.location.hash}`);
    }
})();

window.toggleLanguage = function() {
    const currentPath = cleanPath(window.location.pathname);
    const isEnglish = currentPath.startsWith('/en/');
    const language = isEnglish ? 'pt' : 'en';
    const destination = languageDestination(language, currentPath) || (language === 'en' ? '/en/' : '/');
    localStorage.setItem('pm_lang_pref', language);
    window.location.href = `${destination}${window.location.search}${window.location.hash}`;
};
