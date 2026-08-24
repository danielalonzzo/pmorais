/*
 * WebMCP tool surface for pmorais.pt
 * Developed by Elysium λ Development & Research
 *
 * Exposes the site's read-only actions to an agent running in the browser,
 * per https://webmachinelearning.github.io/webmcp/. Every tool is a wrapper
 * around something a visitor can already do on the page: read the published
 * services, read the published contact channels, jump to the contact form, and
 * filter the article cards the blog has already rendered.
 *
 * Nothing here writes data, submits a form, or touches the authenticated
 * client area. The file is inert in browsers without navigator.modelContext.
 */
(function () {
    'use strict';

    const modelContext = typeof navigator !== 'undefined' ? navigator.modelContext : null;
    if (!modelContext) return;

    const isEnglish = (document.documentElement.lang || 'pt-PT').toLowerCase().startsWith('en');
    const API = '/api/v1';
    const controller = new AbortController();

    const text = (value) => ({ content: [{ type: 'text', text: value }] });
    const NO_INPUT = { type: 'object', properties: {}, additionalProperties: false };

    async function readJson(resource) {
        const response = await fetch(resource, {
            headers: { Accept: 'application/json' },
            credentials: 'omit',
            signal: controller.signal
        });
        if (!response.ok) throw new Error(`${resource} responded ${response.status}`);
        return response.json();
    }

    const localise = (value) => {
        if (!value || typeof value !== 'object') return value;
        return value[isEnglish ? 'en-GB' : 'pt-PT'] ?? value['en-GB'] ?? value['pt-PT'];
    };

    const TOOLS = [
        {
            name: 'list_services',
            description: 'List the services published by Paulo Morais (personal training, online training, adapted exercise in oncology, osteopathy), with how each is delivered and where it is described. No prices are published and none can be returned.',
            inputSchema: NO_INPUT,
            async execute() {
                const data = await readJson(`${API}/services.json`);
                const lines = data.services.map((service) => {
                    const constraints = service.constraints.length
                        ? `\n  Limits: ${service.constraints.join(' ')}`
                        : '';
                    return `- ${localise(service.name)} (${service.id})\n  ${localise(service.summary)}\n  Delivery: ${service.delivery.join(', ')} — ${service.area}\n  Page: ${localise(service.page)}${constraints}`;
                });
                return text([
                    lines.join('\n\n'),
                    '',
                    `Pricing: not published. ${data.pricingNote}`
                ].join('\n'));
            }
        },
        {
            name: 'get_contact_details',
            description: 'Return the public contact channels for Paulo Morais: email, telephone, WhatsApp, Instagram, and the URLs of the published contact forms. There is no booking API; a person arranges sessions directly.',
            inputSchema: NO_INPUT,
            async execute() {
                const data = await readJson(`${API}/contact.json`);
                return text([
                    `Email: ${data.email}`,
                    `Telephone / WhatsApp: ${data.telephone}`,
                    `Instagram: ${data.instagram}`,
                    `Location: ${data.locality}`,
                    `Contact forms: ${(localise(data.contactForms) || []).join(', ')}`,
                    `Client area (human sign-in only): ${localise(data.clientArea)}`,
                    '',
                    data.note
                ].join('\n'));
            }
        },
        {
            name: 'open_contact_form',
            description: 'Scroll the visitor to the contact form on the current page, or navigate to the page that has one. Only reveals the form — it never fills in or submits anything.',
            inputSchema: NO_INPUT,
            execute() {
                const section = document.getElementById('contacto');
                if (section) {
                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    return text(isEnglish
                        ? 'Scrolled to the contact form on this page. The visitor fills it in and submits it themselves.'
                        : 'A página foi deslocada até ao formulário de contacto. O preenchimento e o envio são feitos pela pessoa.');
                }
                const destination = isEnglish ? '/en/' : '/';
                window.location.assign(`${destination}#contacto`);
                return text(`No contact form on this page. Navigating to ${destination}#contacto.`);
            }
        }
    ];

    // The blog listing is rendered client-side, so this tool reads what the page
    // has already drawn rather than querying the content database directly.
    if (document.getElementById('blog-search-input') || document.querySelector('.blog-card')) {
        TOOLS.push({
            name: 'search_articles',
            description: 'Search the blog articles currently listed on this page by title, summary or category. Returns titles with their article URLs.',
            inputSchema: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Words to match against the article title, summary or category. Omit to list everything on the page.'
                    },
                    limit: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 50,
                        description: 'Maximum number of articles to return. Defaults to 10.'
                    }
                },
                additionalProperties: false
            },
            execute({ query = '', limit = 10 } = {}) {
                const needle = String(query).trim().toLowerCase();
                const cards = [...document.querySelectorAll('.blog-card')];
                if (!cards.length) {
                    return text(isEnglish
                        ? 'No articles have finished loading on this page yet.'
                        : 'Ainda não há artigos carregados nesta página.');
                }

                const matches = cards
                    .map((card) => ({
                        title: card.querySelector('h3')?.textContent?.trim() ?? '',
                        summary: card.querySelector('.blog-summary')?.textContent?.trim() ?? '',
                        category: card.querySelector('.badge-category')?.textContent?.trim() ?? '',
                        date: card.querySelector('.blog-date')?.textContent?.trim() ?? '',
                        url: card.querySelector('.blog-card-link')?.href ?? ''
                    }))
                    .filter((article) => !needle
                        || `${article.title} ${article.summary} ${article.category}`.toLowerCase().includes(needle))
                    .slice(0, Math.max(1, Math.min(50, Number(limit) || 10)));

                if (!matches.length) {
                    return text(isEnglish
                        ? `No article on this page matches "${query}".`
                        : `Nenhum artigo desta página corresponde a "${query}".`);
                }

                return text(matches
                    .map((article) => `- ${article.title}${article.category ? ` [${article.category}]` : ''}${article.date ? ` — ${article.date}` : ''}\n  ${article.summary}\n  ${article.url}`)
                    .join('\n\n'));
            }
        });
    }

    // registerTool is the current shape of the API; provideContext is the
    // earlier one. Register with whichever this browser implements.
    try {
        if (typeof modelContext.registerTool === 'function') {
            for (const tool of TOOLS) modelContext.registerTool(tool, { signal: controller.signal });
        } else if (typeof modelContext.provideContext === 'function') {
            modelContext.provideContext({ tools: TOOLS });
        }
    } catch (error) {
        console.warn('[webmcp] tool registration failed', error);
    }

    window.addEventListener('pagehide', () => controller.abort(), { once: true });
})();
