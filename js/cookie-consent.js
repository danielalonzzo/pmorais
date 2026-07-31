/**
 * RGPD/ePrivacy consent. Analytics is not downloaded until the visitor opts in.
 */
(function () {
    'use strict';

    const CONSENT_KEY = 'pm_cookie_consent';
    const CONSENT_VERSION = '2.0';
    const GA_ID = 'G-GYWR102Y9N';
    const isEnglish = document.documentElement.lang.toLowerCase().startsWith('en');

    const copy = {
        pt: {
            title: 'Utilizamos cookies',
            body: 'Usamos cookies essenciais para o funcionamento do site e, com o seu consentimento, cookies analíticos para melhorar a sua experiência.',
            accept: 'Aceitar todos',
            reject: 'Rejeitar não essenciais',
            manage: 'Gerir preferências',
            modalTitle: 'Preferências de cookies',
            essential: 'Cookies essenciais',
            essentialDescription: 'Necessários para o funcionamento do site. Não podem ser desativados.',
            analytics: 'Cookies analíticos',
            analyticsDescription: 'Ajudam-nos a perceber como utiliza o site. Só são ativados com o seu consentimento.',
            save: 'Guardar preferências',
            close: 'Fechar preferências',
            privacyHref: '/politica-privacidade',
            privacy: 'Política de Privacidade'
        },
        en: {
            title: 'We use cookies',
            body: 'We use essential cookies for the website to function and, with your consent, analytics cookies to improve your experience.',
            accept: 'Accept all',
            reject: 'Reject non-essential',
            manage: 'Manage preferences',
            modalTitle: 'Cookie preferences',
            essential: 'Essential cookies',
            essentialDescription: 'Required for the website to function. They cannot be disabled.',
            analytics: 'Analytics cookies',
            analyticsDescription: 'Help us understand how you use the site. They are enabled only with your consent.',
            save: 'Save preferences',
            close: 'Close preferences',
            privacyHref: '/en/politica-privacidade',
            privacy: 'Privacy Policy'
        }
    };
    const text = isEnglish ? copy.en : copy.pt;

    function getConsent() {
        try {
            const consent = JSON.parse(localStorage.getItem(CONSENT_KEY));
            return consent && consent.version === CONSENT_VERSION ? consent : null;
        } catch (_) {
            return null;
        }
    }

    function saveConsent(analytics) {
        const consent = {
            version: CONSENT_VERSION,
            timestamp: new Date().toISOString(),
            essential: true,
            analytics: Boolean(analytics)
        };
        localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
        return consent;
    }

    function loadAnalytics() {
        if (document.getElementById('pm-ga-script')) return;

        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        window.gtag('consent', 'default', { analytics_storage: 'granted' });
        window.gtag('config', GA_ID, { anonymize_ip: true });

        const analyticsScript = document.createElement('script');
        analyticsScript.id = 'pm-ga-script';
        analyticsScript.async = true;
        analyticsScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
        analyticsScript.setAttribute('nonce', 'pmorais-2026');
        document.head.appendChild(analyticsScript);
    }

    function buildBanner() {
        const banner = document.createElement('section');
        banner.id = 'pm-cookie-banner';
        banner.setAttribute('aria-label', text.title);
        banner.innerHTML = `
            <div class="pm-cookie-inner">
                <div class="pm-cookie-text">
                    <p class="pm-cookie-title">${text.title}</p>
                    <p>${text.body} <a href="${text.privacyHref}" target="_blank" rel="noopener noreferrer">${text.privacy}</a>.</p>
                </div>
                <div class="pm-cookie-actions">
                    <button type="button" class="pm-btn pm-btn-accept" id="pm-accept-all">${text.accept}</button>
                    <button type="button" class="pm-btn pm-btn-reject" id="pm-reject-all">${text.reject}</button>
                    <button type="button" class="pm-btn pm-btn-manage" id="pm-manage">${text.manage}</button>
                </div>
            </div>`;
        return banner;
    }

    function buildModal() {
        const modal = document.createElement('div');
        modal.id = 'pm-cookie-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'pm-cookie-modal-title');
        modal.innerHTML = `
            <div class="pm-modal-box">
                <h2 id="pm-cookie-modal-title">${text.modalTitle}</h2>
                <div class="pm-pref-row">
                    <div class="pm-pref-label"><strong>${text.essential}</strong><span>${text.essentialDescription}</span></div>
                    <label class="pm-toggle">
                        <span class="sr-only">${text.essential}</span>
                        <input type="checkbox" checked disabled>
                        <span class="pm-toggle-slider" aria-hidden="true"></span>
                    </label>
                </div>
                <div class="pm-pref-row">
                    <div class="pm-pref-label"><strong>${text.analytics}</strong><span>${text.analyticsDescription}</span></div>
                    <label class="pm-toggle">
                        <span class="sr-only">${text.analytics}</span>
                        <input type="checkbox" id="pm-analytics-toggle">
                        <span class="pm-toggle-slider" aria-hidden="true"></span>
                    </label>
                </div>
                <div class="pm-modal-actions">
                    <button type="button" class="pm-btn pm-btn-reject pm-btn-close" id="pm-modal-close" aria-label="${text.close}">×</button>
                    <button type="button" class="pm-btn pm-btn-accept" id="pm-save-prefs">${text.save}</button>
                </div>
            </div>`;
        return modal;
    }

    function hideBanner() {
        const banner = document.getElementById('pm-cookie-banner');
        if (!banner) return;
        banner.classList.add('is-leaving');
        window.setTimeout(() => banner.remove(), 350);
    }

    function init() {
        const existing = getConsent();
        if (existing) {
            if (existing.analytics) loadAnalytics();
            return;
        }

        const banner = buildBanner();
        const modal = buildModal();
        document.body.append(banner, modal);

        document.getElementById('pm-accept-all').addEventListener('click', () => {
            saveConsent(true);
            loadAnalytics();
            hideBanner();
        });
        document.getElementById('pm-reject-all').addEventListener('click', () => {
            saveConsent(false);
            hideBanner();
        });
        document.getElementById('pm-manage').addEventListener('click', () => {
            modal.classList.add('open');
            document.getElementById('pm-analytics-toggle').focus();
        });
        document.getElementById('pm-modal-close').addEventListener('click', () => {
            modal.classList.remove('open');
            document.getElementById('pm-manage').focus();
        });
        document.getElementById('pm-save-prefs').addEventListener('click', () => {
            const analytics = document.getElementById('pm-analytics-toggle').checked;
            saveConsent(analytics);
            if (analytics) loadAnalytics();
            modal.remove();
            hideBanner();
        });
        modal.addEventListener('click', (event) => {
            if (event.target === modal) modal.classList.remove('open');
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && modal.classList.contains('open')) {
                modal.classList.remove('open');
                document.getElementById('pm-manage').focus();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
