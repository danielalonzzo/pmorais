/*
 * Cuidados pós-tratamento oncológico: interações.
 *
 * Este ficheiro não contém texto de interface: todo o copy (PT e EN) vive no HTML
 * e nos data-attributes, por isso as páginas /en/ carregam esta mesma cópia
 * (../js/sobrevivencia.js) e nunca ficam dessincronizadas.
 *
 * Sem JavaScript o conteúdo continua legível (tudo está no DOM); a classe
 * `sv-js` só é aplicada quando este ficheiro corre e é ela que ativa os
 * estados "escondido até ao clique" definidos em css/style.css.
 */
(() => {
    'use strict';

    const root = document.documentElement;
    root.classList.add('sv-js');

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const $ = (selector, ctx = document) => ctx.querySelector(selector);
    const $$ = (selector, ctx = document) => Array.from(ctx.querySelectorAll(selector));

    /* ── Descoberta: que cuidados já foram abertos nesta sessão ─────────────
     * sessionStorage (e não localStorage) de propósito: guarda apenas ids de
     * peças e desaparece ao fechar o separador. Nada de saúde persiste. */
    const FOUND_KEY = 'sv_found';
    const TOTAL = 5;

    const readFound = () => {
        try {
            const value = JSON.parse(sessionStorage.getItem(FOUND_KEY) || '[]');
            return Array.isArray(value) ? value : [];
        } catch (error) {
            return [];
        }
    };

    const writeFound = (list) => {
        try {
            sessionStorage.setItem(FOUND_KEY, JSON.stringify(list));
        } catch (error) {
            /* modo privado / storage bloqueado: a peça funciona na mesma */
        }
    };

    const progressEls = $$('[data-sv-progress]');

    const renderProgress = () => {
        const found = readFound();
        const count = found.length;
        $$('[data-sv-card]').forEach((card) => card.classList.toggle('is-found', found.includes(card.dataset.svCard)));
        progressEls.forEach((el) => {
            el.classList.toggle('is-complete', count >= TOTAL);
            $$('.sv-pdots i', el).forEach((dot, index) => dot.classList.toggle('is-on', index < count));
            const text = $('.sv-ptext', el);
            const template = count >= TOTAL ? el.dataset.done : el.dataset.tpl;
            if (text && template) text.textContent = template.replace('{n}', String(count));
        });
    };

    const markFound = (id) => {
        if (!id) return;
        const found = readFound();
        if (found.includes(id)) return;
        found.push(id);
        writeFound(found);
        renderProgress();
    };

    /* Qualquer clique num botão dentro de uma peça conta como "descoberta" */
    $$('[data-sv-piece]').forEach((piece) => {
        piece.addEventListener('click', (event) => {
            if (!event.target.closest('button, [role="tab"]')) return;
            piece.classList.add('is-touched');
            markFound(piece.dataset.svPiece);
        });
    });

    renderProgress();

    /* ── Entrada em vista: desenha traços, arranca pulsos, conta números ──── */
    const formatNumber = (value, separator) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, separator);

    const countUp = (el) => {
        const target = Number(el.dataset.to) || 0;
        const separator = el.dataset.sep || '';
        if (reduceMotion) {
            el.textContent = formatNumber(target, separator);
            return;
        }
        const duration = 1300;
        const start = performance.now();
        const tick = (now) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = formatNumber(Math.round(target * eased), separator);
            if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    };

    const watcher = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const el = entry.target;
            el.classList.toggle('is-inview', entry.isIntersecting);
            if (!entry.isIntersecting) return;
            el.classList.add('is-drawn');
            if (!el.dataset.svCounted) {
                el.dataset.svCounted = '1';
                $$('.sv-count[data-to]', el).forEach(countUp);
            }
        });
    }, { threshold: 0.2 });

    $$('.sv-watch').forEach((el) => watcher.observe(el));

    /* ── Utilitário: mostrar um painel dentro de um grupo (empilhados) ────── */
    const showPanel = (scope, id) => {
        $$('.sv-panel', scope).forEach((panel) => panel.classList.toggle('is-active', panel.id === id));
    };

    /* ── Jornada → constelação dos 5 cuidados ─────────────────────────────── */
    $$('[data-sv="journey"]').forEach((journey) => {
        const core = $('.sv-core', journey);
        const stars = $('.sv-constellation', journey);
        if (!core || !stars) return;

        const setOpen = (open) => {
            core.setAttribute('aria-expanded', String(open));
            stars.classList.toggle('is-open', open);
            journey.classList.toggle('is-open', open);
            if (open) {
                window.setTimeout(() => {
                    stars.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
                }, 380);
            }
        };

        core.addEventListener('click', () => setOpen(core.getAttribute('aria-expanded') !== 'true'));
    });

    /* ── Mapa do corpo (efeitos tardios) ──────────────────────────────────── */
    $$('[data-sv="hotspots"]').forEach((map) => {
        const buttons = $$('.sv-hotspot', map);
        const idle = $('.sv-panel[data-idle]', map);
        const idleId = idle ? idle.id : '';

        const show = (id) => {
            showPanel(map, id);
            buttons.forEach((button) => {
                const on = button.getAttribute('aria-controls') === id;
                button.setAttribute('aria-pressed', String(on));
                button.classList.toggle('is-active', on);
            });
        };

        buttons.forEach((button) => {
            button.addEventListener('click', () => {
                const alreadyOpen = button.getAttribute('aria-pressed') === 'true';
                show(alreadyOpen ? idleId : button.getAttribute('aria-controls'));
            });
        });

        show(idleId);
    });

    /* ── Pedras que giram (emoções) ───────────────────────────────────────── */
    $$('[data-sv="flip"]').forEach((group) => {
        $$('.sv-stone', group).forEach((stone) => {
            const front = $('.sv-face--front', stone);
            const back = $('.sv-face--back', stone);

            stone.addEventListener('click', () => {
                const flipped = !stone.classList.contains('is-flipped');
                stone.classList.toggle('is-flipped', flipped);
                stone.setAttribute('aria-pressed', String(flipped));
                if (front) front.setAttribute('aria-hidden', String(flipped));
                if (back) back.setAttribute('aria-hidden', String(!flipped));
                const cell = stone.closest('.sv-stone-cell');
                if (cell) cell.classList.add('is-seen');
            });
        });
    });

    /* ── Anel dos 150 minutos (exercício) ─────────────────────────────────── */
    $$('[data-sv="ring"]').forEach((ring) => {
        const goal = Number(ring.dataset.goal) || 150;
        const minuteButtons = $$('.sv-act[data-min]', ring);
        const strengthButton = $('.sv-act[data-strength]', ring);
        const number = $('.sv-ring-num', ring);
        let shown = 0;
        let numberFrame = 0;

        const animateNumber = (from, to) => {
            if (!number) return;
            cancelAnimationFrame(numberFrame);
            if (reduceMotion) {
                number.textContent = String(to);
                return;
            }
            const start = performance.now();
            const tick = (now) => {
                const t = Math.min((now - start) / 600, 1);
                const eased = 1 - Math.pow(1 - t, 3);
                number.textContent = String(Math.round(from + (to - from) * eased));
                if (t < 1) numberFrame = requestAnimationFrame(tick);
            };
            numberFrame = requestAnimationFrame(tick);
        };

        const update = () => {
            const total = minuteButtons.reduce(
                (sum, button) => sum + (button.getAttribute('aria-pressed') === 'true' ? Number(button.dataset.min) : 0),
                0
            );
            ring.style.setProperty('--sv-p', String(Math.min(total / goal, 1)));
            animateNumber(shown, total);
            shown = total;
            ring.classList.toggle('is-complete', total >= goal);
        };

        const toggle = (button) => {
            button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
        };

        minuteButtons.forEach((button) => {
            button.addEventListener('click', () => {
                toggle(button);
                update();
            });
        });

        if (strengthButton) {
            strengthButton.addEventListener('click', () => {
                toggle(strengthButton);
                ring.classList.toggle('has-strength', strengthButton.getAttribute('aria-pressed') === 'true');
            });
        }

        update();
    });

    /* ── Escudo das 4 vacinas (proteção) ──────────────────────────────────── */
    $$('[data-sv="shield"]').forEach((shield) => {
        const buttons = $$('.sv-vac', shield);
        /* Sem um painel ativo, os painéis escondidos ocupam espaço vazio */
        const idle = $('.sv-panel[data-idle]', shield);
        if (idle) showPanel(shield, idle.id);

        buttons.forEach((button) => {
            button.addEventListener('click', () => {
                const on = button.getAttribute('aria-pressed') !== 'true';
                button.setAttribute('aria-pressed', String(on));
                const state = $('.sv-vac-state', button);
                if (state) state.textContent = on ? state.dataset.on : state.dataset.off;
                $$(`.sv-q[data-q="${button.dataset.q}"], .sv-q-ico[data-q="${button.dataset.q}"]`, shield)
                    .forEach((part) => part.classList.toggle('is-lit', on));
                showPanel(shield, button.getAttribute('aria-controls'));
                shield.classList.toggle('is-complete', buttons.every((b) => b.getAttribute('aria-pressed') === 'true'));
            });
        });

        /* Clicar diretamente no quadrante do escudo equivale a clicar no botão */
        $$('.sv-q-hit', shield).forEach((hit) => {
            hit.addEventListener('click', () => {
                const button = $(`.sv-vac[data-q="${hit.dataset.q}"]`, shield);
                if (button) button.click();
            });
        });
    });

    /* ── Separadores (pasta do plano de sobrevivência), padrão ARIA tabs ──── */
    $$('[data-sv="tabs"]').forEach((folder) => {
        const tabs = $$('[role="tab"]', folder);
        const panels = $$('[role="tabpanel"]', folder);

        const select = (tab, focus) => {
            tabs.forEach((item) => {
                const on = item === tab;
                item.setAttribute('aria-selected', String(on));
                item.tabIndex = on ? 0 : -1;
            });
            panels.forEach((panel) => panel.classList.toggle('is-active', panel.id === tab.getAttribute('aria-controls')));
            if (focus) tab.focus();
        };

        tabs.forEach((tab, index) => {
            tab.addEventListener('click', () => select(tab, false));
            tab.addEventListener('keydown', (event) => {
                let next = null;
                if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
                else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
                else if (event.key === 'Home') next = 0;
                else if (event.key === 'End') next = tabs.length - 1;
                if (next === null) return;
                event.preventDefault();
                select(tabs[next], true);
            });
        });
    });

    /* ── Folha do plano para imprimir (em branco; nada é guardado nem enviado) */
    $$('[data-sv-print]').forEach((button) => {
        button.addEventListener('click', () => {
            document.body.classList.add('sv-printing');
            window.print();
        });
    });
    window.addEventListener('afterprint', () => document.body.classList.remove('sv-printing'));

    /* ── Ligações de outras páginas (#efeitos-tardios, #emocoes…) ─────────── */
    const flashTarget = () => {
        const id = decodeURIComponent(window.location.hash.slice(1));
        if (!id) return;
        const target = document.getElementById(id);
        if (!target || !target.matches('.sv-section, .sv-ring-wrap, [data-sv-piece]')) return;
        target.classList.remove('is-target');
        void target.offsetWidth; // reinicia a animação se o utilizador voltar a clicar
        target.classList.add('is-target');
        window.setTimeout(() => target.classList.remove('is-target'), 2200);
    };

    window.addEventListener('hashchange', flashTarget);
    window.addEventListener('load', () => window.setTimeout(flashTarget, 600));
})();
