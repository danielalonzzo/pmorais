/*
 * Developed by Elysium λ Development & Research
 * A European company
 */
(function() {
    try {
        const sysAction = sessionStorage.getItem('sys_action');
        if (sysAction) {
            sessionStorage.removeItem('sys_action');
            const isLogout = sysAction === 'logout';
            const loadingText = isLogout ? (window.location.pathname.includes('/en/') ? "Logging out..." : "A terminar sessão...") : (window.location.pathname.includes('/en/') ? "Updating..." : "A atualizar...");

            if (document.body) {
                showSystemUpdateLoader(loadingText);
                window.addEventListener('load', () => {
                    setTimeout(() => {
                        const overlay = document.querySelector('.sys-update-overlay');
                        if (overlay) {
                            overlay.style.opacity = '0';
                            setTimeout(() => {
                                overlay.remove();
                                document.body.classList.add('loaded');
                            }, 300);
                        }
                    }, 500);
                });
            }
        }
    } catch (e) {}
})();

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    } else {
        console.warn('Lucide library not loaded');
    }

    // Toggle "Leave a review" CTA based on auth state
    const reviewCta = document.getElementById('leave-review-cta');
    if (reviewCta) {
        if (localStorage.getItem('pm_is_logged_in') === 'true') {
            reviewCta.style.display = 'block';
        } else {
            reviewCta.style.display = 'none';
        }
    }

    // Header Scroll Effect
    const header = document.getElementById('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Mobile Menu Toggle
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            mobileToggle.classList.toggle('active');

            // Icon switching
            const icon = mobileToggle.querySelector('i, svg');
            if (icon) {
                if (mobileToggle.classList.contains('active')) {
                    icon.setAttribute('data-lucide', 'x');
                } else {
                    icon.setAttribute('data-lucide', 'menu');
                }
                lucide.createIcons();
            }
        });

        // Keyboard Accessibility
        mobileToggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                mobileToggle.click();
            }
        });

        // Close menu when a link is clicked
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                mobileToggle.classList.remove('active');
                const icon = mobileToggle.querySelector('i, svg');
                if (icon) {
                    icon.setAttribute('data-lucide', 'menu');
                    lucide.createIcons();
                }
            });
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                window.scrollTo({
                    top: target.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Reveal animations on scroll
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('section:not(.about-yellow-section)').forEach(section => {
        section.classList.add('reveal');
        observer.observe(section);
    });

    // --- Testimonial Carousel System ---
    let _carouselTimer = null;
    window.setupCarousel = () => {
        const testimonials = document.querySelectorAll('.testimonial-card-gold, .testimonial-card-yellow');
        const paginations = document.querySelectorAll('.testimonial-pagination');

        if (testimonials.length === 0) return;

        let currentIndex = 0;
        const speed = 6000;

        // Clear any previous timer from a prior initialisation
        if (_carouselTimer) clearInterval(_carouselTimer);

        const updateUI = (index) => {
            // Update Cards
            testimonials.forEach((card, i) => {
                card.classList.toggle('active', i === index);
            });

            // Update All Dots in all pagination bars found
            document.querySelectorAll('.dot').forEach((dot, i) => {
                // If the dot belongs to a bar that should have 'X' dots, we need to be careful
                // For simplicity, we match the index within its own pagination container
                const dotsInThisBar = dot.parentElement.querySelectorAll('.dot');
                const dotIdx = Array.from(dotsInThisBar).indexOf(dot);
                dot.classList.toggle('active', dotIdx === index);
                dot.setAttribute('aria-pressed', String(dotIdx === index));
            });
        };

        const goToNext = () => {
            currentIndex = (currentIndex + 1) % testimonials.length;
            updateUI(currentIndex);
        };

        const goToPrev = () => {
            currentIndex = (currentIndex - 1 + testimonials.length) % testimonials.length;
            updateUI(currentIndex);
        };

        const startTimer = () => {
            clearInterval(_carouselTimer);
            _carouselTimer = setInterval(goToNext, speed);
        };

        // Initialize
        updateUI(0);
        startTimer();

        // Event Listeners for Dots — re-attach by cloning to avoid duplicate listeners
        paginations.forEach(p => {
            const dots = p.querySelectorAll('.dot');
            dots.forEach((dot, i) => {
                const freshDot = dot.cloneNode(true);
                dot.parentNode.replaceChild(freshDot, dot);
                freshDot.addEventListener('click', () => {
                    currentIndex = i;
                    updateUI(currentIndex);
                    startTimer(); // Reset timer on interaction
                });
            });
        });

        // Touch / Swipe Support
        let touchStartX = 0;
        let touchEndX = 0;

        const handleGesture = () => {
            const swipeThreshold = 50; // Minimum distance (px) for a valid swipe
            if (touchEndX < touchStartX - swipeThreshold) {
                // Swiped Left - Next
                goToNext();
                startTimer();
            }
            if (touchEndX > touchStartX + swipeThreshold) {
                // Swiped Right - Previous
                goToPrev();
                startTimer();
            }
        };

        const containers = document.querySelectorAll('.testimonial-carousel-wrapper, .testimonials-right');
        containers.forEach(container => {
            // Pause on Hover
            container.addEventListener('mouseenter', () => clearInterval(_carouselTimer));
            container.addEventListener('mouseleave', startTimer);

            // Touch events
            container.addEventListener('touchstart', e => {
                touchStartX = e.changedTouches[0].screenX;
                // Optionally pause timer on manual touch
                clearInterval(_carouselTimer);
            }, { passive: true });

            container.addEventListener('touchend', e => {
                touchEndX = e.changedTouches[0].screenX;
                handleGesture();
            }, { passive: true });
        });
    };

    // Expose for dynamic reviews to re-initialise after appending new cards
    window.initTestimonialCarousel = setupCarousel;

    window.setupCarousel();



    // Force Video Autoplay (Robustness for Large Files)
    const autoPlayVideos = document.querySelectorAll('.video-auto-play');
    autoPlayVideos.forEach(video => {
        video.play().catch(error => {
            console.warn("Autoplay was prevented:", error);
            // Retry on interaction or muted
            video.muted = true;
            video.play().catch(e => console.error("Retry failed:", e));
        });
    });

    // Parallax Effect for Osteopatia Statistics
    const parallaxSection = document.querySelector('.osteopatia-parallax-section');
    const parallaxBg = document.querySelector('.parallax-bg');

    if (parallaxSection && parallaxBg) {
        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const scrolled = window.scrollY;
                    const sectionTop = parallaxSection.offsetTop;
                    const sectionHeight = parallaxSection.offsetHeight;
                    const windowHeight = window.innerHeight;

                    // Only calculate if section is in view
                    if (scrolled + windowHeight > sectionTop && scrolled < sectionTop + sectionHeight) {
                        // Calculate relative scroll position
                        const distance = scrolled - sectionTop;

                        // Move the background element using transform
                        // Speed 0.3 ensures visible but smooth movement
                        const speed = 0.3;
                        const yPos = distance * speed;

                        // Apply transform (Inverted effect)
                        parallaxBg.style.transform = `translate3d(0, ${-yPos}px, 0)`;
                    }
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    // --- Preloader Dismissal Logic ---
    const preloader = document.getElementById('preloader');
    if (preloader) {
        let preloaderDismissed = false;
        const dismissPreloader = () => {
            if (preloaderDismissed) return;
            preloaderDismissed = true;
            document.body.classList.add('loaded');
            preloader.style.opacity = '0';
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 500);
        };

        // This file is deferred, so by the time it runs the DOM is parsed and the
        // render-blocking CSS is applied — the page is ready to look at. Waiting for
        // `load` instead held the overlay until every image, font and third-party
        // script had finished, or until the 2s fallback fired.
        requestAnimationFrame(dismissPreloader);

        // Backstops, in case this file is ever loaded without defer.
        window.addEventListener('load', dismissPreloader);
        setTimeout(dismissPreloader, 2000);
    }

    // --- Social FAB Toggle (Mobile & Tablets) ---
    const fabContainer = document.querySelector('.fab-container');
    const fabTrigger = document.querySelector('.fab-trigger');

    if (fabTrigger && fabContainer) {
        fabTrigger.addEventListener('click', (e) => {
            // Expand range to include Tablets (iPad Pro up to 1366px)
            if (window.innerWidth <= 1400) {
                e.preventDefault();
                e.stopPropagation();
                fabContainer.classList.toggle('active');
                fabTrigger.setAttribute('aria-expanded', String(fabContainer.classList.contains('active')));
            }
        });

        // Close FAB when clicking anywhere else
        document.addEventListener('click', () => {
            fabContainer.classList.remove('active');
            fabTrigger.setAttribute('aria-expanded', 'false');
        });

        // Prevent closing when clicking the options themselves
        const fabOptions = document.querySelector('.fab-options');
        if (fabOptions) {
            fabOptions.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }

    // Gallery carousel desactivado — galería usa grid nativo en mobile
});

// --- LANGUAGE SWITCHER LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    const langSwitcherLinks = document.querySelectorAll('.footer-lang-switcher a');
    langSwitcherLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (link.classList.contains('active')) return;

            const targetLang = link.textContent.trim().toLowerCase();
            const currentPath = window.location.pathname;
            const isEnPage = currentPath.includes('/en/') || currentPath.endsWith('/en');

            if (targetLang === 'pt' && isEnPage) {
                localStorage.setItem('pm_lang_pref', 'pt');
                let newPath = currentPath.replace(/\/en\//, '/').replace(/\/en$/, '/');
                if (newPath === '') newPath = '/';
                window.location.href = newPath + window.location.search + window.location.hash;
            } else if (targetLang === 'en' && !isEnPage) {
                localStorage.setItem('pm_lang_pref', 'en');
                let newPath;
                if (currentPath === '/' || currentPath === '') {
                    newPath = '/en/';
                } else {
                    newPath = '/en' + currentPath;
                }
                window.location.href = newPath + window.location.search + window.location.hash;
            }
        });
    });
});

/* ── Oncologia Section — Reveal on Scroll ── */
(function () {
    const oncologiaRevealObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                }
            });
        },
        { threshold: 0.12 }
    );

    document.querySelectorAll('.oncologia-section .reveal').forEach((el) => {
        oncologiaRevealObserver.observe(el);
    });
})();

/* ── Oncologia Lightbox Modal ── */
(function () {
    const trigger = document.getElementById('trigger-oncologia-modal');
    const lightbox = document.getElementById('oncologia-lightbox');
    const lightboxImg = document.getElementById('oncologia-lightbox-img');
    const closeBtn = document.querySelector('.oncologia-lightbox-close');

    if (!trigger || !lightbox || !lightboxImg || !closeBtn) return;

    // Open lightbox
    const openLightbox = () => {
        const imgElement = trigger.querySelector('img');
        if (!imgElement) return;

        lightboxImg.src = imgElement.src;
        lightbox.style.display = 'flex';
        // Small timeout to allow browser to trigger transition
        setTimeout(() => {
            lightbox.classList.add('active');
            closeBtn.focus();
        }, 10);
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden'; // Disable page scrolling
    };

    trigger.addEventListener('click', openLightbox);
    trigger.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openLightbox();
        }
    });

    // Close lightbox functions
    const closeLightbox = () => {
        lightbox.classList.remove('active');
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = ''; // Enable page scrolling
        setTimeout(() => {
            lightbox.style.display = 'none';
            lightboxImg.src = '';
            trigger.focus();
        }, 300);
    };

    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeLightbox();
    });

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target === lightboxImg) {
            closeLightbox();
        }
    });

    // Support escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });
})();

/* ── System Info Modal (Footer Version) ── */
(function() {
    // Determine current version from the footer or hardcode it based on the user's request
    const versionSpan = document.querySelector('.crafted-text span');
    let appVersion = '1.5.6 (Build 2026-07)'; // default fallback
    if (versionSpan) {
        // Attempt to extract version
        const vText = versionSpan.textContent.trim();
        if (vText) appVersion = vText + ' (Build 2026-07)';

        // Make span clickable
        versionSpan.style.cursor = 'pointer';
        versionSpan.style.textDecoration = 'underline';
        versionSpan.title = 'Ver información del sistema';

        versionSpan.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showSystemInfoModal();
        });
    }

    function showSystemInfoModal() {
        // Check if modal already exists
        let modal = document.getElementById('system-info-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'system-info-modal';
            modal.className = 'system-info-modal';

            // Detect Language
            const isEn = window.location.pathname.includes('/en/') || window.location.pathname.endsWith('/en');

            const i18n = {
                pt: {
                    title: "INFORMAÇÃO DO SISTEMA",
                    softwareSpecs: "ESPECIFICAÇÕES DE SOFTWARE",
                    interfaceVer: "Versão da Interface",
                    updateBtn: "Actualizar",
                    buildComp: "Compilação (Build)",
                    productLic: "Licença de Produto",
                    secCompliance: "SEGURANÇA E CONFORMIDADE",
                    privacyDir: "Diretiva de Privacidade",
                    secInfra: "Infraestrutura de Segurança",
                    terms: "Termos e Condições",
                    privacyPol: "Política de Privacidade",
                    viewDoc: "Ver documento",
                    corpInfo: "INFORMAÇÃO CORPORATIVA",
                    org: "Organização",
                    webPortal: "Portal Web",
                    supportChannel: "Canal de Suporte",
                    techSupport: "Canal de Suporte Técnico",
                    softAttr: "ATRIBUIÇÕES DE SOFTWARE",
                    iconEco: "Ecossistema de Ícones",
                    devBy: 'Desenvolvido por <a href="https://elysiumdr.eu" target="_blank" rel="noopener noreferrer" class="sys-link" style="color: inherit; text-decoration: underline;">Elysium λ Development & Research</a>.',
                    rights: "© 2026 Consciênciavaliativa Unipessoal Lda. Todos os direitos reservados.",
                    sysSettings: "AJUSTES DO SISTEMA",
                    autoTheme: "Mudança Automática de Tema",
                    themeLightStart: "Hora Início Tema Claro",
                    themeDarkStart: "Hora Início Tema Escuro",
                    sysLanguage: "Idioma do Sistema",
                    sysRegion: "Região do Utilizador",
                    langPT: "Português",
                    langEN: "Inglês",
                    regPT: "Portugal",
                    regBR: "Brasil",
                    regUK: "Reino Unido",
                    regUS: "Estados Unidos",
                    regOth: "Outro"
                },
                en: {
                    title: "SYSTEM INFORMATION",
                    softwareSpecs: "SOFTWARE SPECIFICATIONS",
                    interfaceVer: "Interface Version",
                    updateBtn: "Update",
                    buildComp: "Build Compilation",
                    productLic: "Product Licence",
                    secCompliance: "SECURITY & COMPLIANCE",
                    privacyDir: "Privacy Directive",
                    secInfra: "Security Infrastructure",
                    terms: "Terms & Conditions",
                    privacyPol: "Privacy Policy",
                    viewDoc: "View document",
                    corpInfo: "CORPORATE INFORMATION",
                    org: "Organisation",
                    webPortal: "Web Portal",
                    supportChannel: "Support Channel",
                    techSupport: "Technical Support Channel",
                    softAttr: "SOFTWARE ATTRIBUTIONS",
                    iconEco: "Icon Ecosystem",
                    devBy: 'Developed by <a href="https://elysiumdr.eu" target="_blank" rel="noopener noreferrer" class="sys-link" style="color: inherit; text-decoration: underline;">Elysium λ Development & Research</a>.',
                    rights: "© 2026 Consciênciavaliativa Unipessoal Lda. All rights reserved.",
                    sysSettings: "SYSTEM SETTINGS",
                    autoTheme: "Automatic Theme Switch",
                    themeLightStart: "Light Theme Start Time",
                    themeDarkStart: "Dark Theme Start Time",
                    sysLanguage: "System Language",
                    sysRegion: "User Region",
                    langPT: "Portuguese",
                    langEN: "English",
                    regPT: "Portugal",
                    regBR: "Brazil",
                    regUK: "United Kingdom",
                    regUS: "United States",
                    regOth: "Other"
                }
            };

            const t = isEn ? i18n.en : i18n.pt;
            const termsLink = isEn ? '/en/termos-e-condicoes' : '/termos-e-condicoes';
            const privacyLink = isEn ? '/en/politica-privacidade' : '/politica-privacidade';

            const isLight = document.body.classList.contains('light-mode');
            const logoFile = isLight ? 'paulo_morais-08.png' : 'logo_amarelo_alpha.png';
            const logoPath = isEn ? '../images/logo/' + logoFile : 'images/logo/' + logoFile;

            // Dynamic Build Date based on last modified time
            const lastModDate = new Date(document.lastModified);
            const buildDate = !isNaN(lastModDate.getTime())
                ? lastModDate.getFullYear() + '-' + String(lastModDate.getMonth() + 1).padStart(2, '0')
                : '2026-07';

            modal.innerHTML = `
                <div class="system-info-content-ios">
                    <div class="sys-header">
                        <span class="system-info-close-ios"><i data-lucide="x"></i></span>
                        <div class="sys-logo"><img src="${logoPath}" alt="Paulo Morais" class="logo-img"></div>
                        <h1>Paulo Morais</h1>
                        <div class="sys-subtitle">${t.title}</div>
                    </div>

                    <div class="sys-scroll-area">
                        <div class="sys-group">
                            <div class="sys-group-title">${t.softwareSpecs}</div>
                            <div class="sys-card">
                                <div class="sys-row" style="align-items: center;">
                                    <span class="sys-label">${t.interfaceVer}</span>
                                    <div style="display: flex; align-items: center; gap: 12px;">
                                        <span class="sys-value" style="margin: 0;">${appVersion.split(' ')[0]}</span>
                                        <button onclick="window.forceUpdateVersion()" style="background: transparent; border: 1px solid var(--color-primary); color: var(--color-primary); border-radius: 6px; padding: 3px 10px; font-size: 0.7rem; cursor: pointer; transition: opacity 0.3s ease; white-space: nowrap;">${t.updateBtn}</button>
                                    </div>
                                </div>
                                <div class="sys-row">
                                    <span class="sys-label">${t.buildComp}</span>
                                    <span class="sys-value">${buildDate}</span>
                                </div>
                                <div class="sys-row">
                                    <span class="sys-label">${t.productLic}</span>
                                    <span class="sys-value">ELY-6QU2-HYL4-UER4</span>
                                </div>
                            </div>
                        </div>

                        <div class="sys-group">
                            <div class="sys-group-title">${t.sysSettings}</div>
                            <div class="sys-card">
                                <div class="sys-row" style="align-items: center;">
                                    <span class="sys-label">${t.autoTheme}</span>
                                    <label class="sys-toggle-switch">
                                        <input type="checkbox" id="sys-auto-theme-toggle">
                                        <span class="sys-slider"></span>
                                    </label>
                                </div>
                                <div class="sys-row" style="align-items: center;">
                                    <span class="sys-label">${t.themeLightStart}</span>
                                    <input type="time" id="sys-light-time" class="sys-select" style="padding: 2px 5px; width: 100px;">
                                </div>
                                <div class="sys-row" style="align-items: center;">
                                    <span class="sys-label">${t.themeDarkStart}</span>
                                    <input type="time" id="sys-dark-time" class="sys-select" style="padding: 2px 5px; width: 100px;">
                                </div>
                                <div class="sys-row" style="align-items: center;">
                                    <span class="sys-label">${t.sysLanguage}</span>
                                    <select id="sys-lang-select" class="sys-select">
                                        <option value="pt">${t.langPT}</option>
                                        <option value="en">${t.langEN}</option>
                                    </select>
                                </div>
                                <div class="sys-row" style="align-items: center;">
                                    <span class="sys-label">${t.sysRegion}</span>
                                    <select id="sys-region-select" class="sys-select">
                                        <option value="PT">${t.regPT}</option>
                                        <option value="BR">${t.regBR}</option>
                                        <option value="UK">${t.regUK}</option>
                                        <option value="US">${t.regUS}</option>
                                        <option value="Other">${t.regOth}</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div class="sys-group">
                            <div class="sys-group-title">${t.secCompliance}</div>
                            <div class="sys-card">
                                <div class="sys-row">
                                    <span class="sys-label">${t.privacyDir}</span>
                                    <span class="sys-value">Cookie Consent v1.0 Compliant</span>
                                </div>
                                <div class="sys-row">
                                    <span class="sys-label">${t.secInfra}</span>
                                    <span class="sys-value">CSP Level 3 Implemented</span>
                                </div>
                                <div class="sys-row">
                                    <span class="sys-label">${t.terms}</span>
                                    <a href="${termsLink}" class="sys-link">${t.viewDoc}</a>
                                </div>
                                <div class="sys-row">
                                    <span class="sys-label">${t.privacyPol}</span>
                                    <a href="${privacyLink}" class="sys-link">${t.viewDoc}</a>
                                </div>
                            </div>
                        </div>

                        <div class="sys-group">
                            <div class="sys-group-title">${t.corpInfo}</div>
                            <div class="sys-card">
                                <div class="sys-row">
                                    <span class="sys-label">${t.org}</span>
                                    <span class="sys-value">Consciênciavaliativa Unipessoal Lda.</span>
                                </div>
                                <div class="sys-row">
                                    <span class="sys-label">${t.webPortal}</span>
                                    <a href="https://pmorais.pt" target="_blank" rel="noopener noreferrer" class="sys-link">pmorais.pt</a>
                                </div>
                                <div class="sys-row">
                                    <span class="sys-label">${t.supportChannel}</span>
                                    <a href="mailto:pt@pmorais.pt" class="sys-link">pt@pmorais.pt</a>
                                </div>
                                <div class="sys-row">
                                    <span class="sys-label">${t.techSupport}</span>
                                    <a href="mailto:daniel.morales@elysiumdr.eu" class="sys-link">daniel.morales@elysiumdr.eu</a>
                                </div>
                            </div>
                        </div>

                        <div class="sys-group">
                            <div class="sys-group-title">${t.softAttr}</div>
                            <div class="sys-card">
                                <div class="sys-row">
                                    <span class="sys-label">${t.iconEco}</span>
                                    <span class="sys-value">Lucide Icons v0.460.0</span>
                                </div>
                            </div>
                        </div>

                        <div class="sys-footer">
                            ${t.devBy}<br>
                            ${t.rights}
                        </div>
                    </div>
                </div>
            `;

            // Add Styles
            const style = document.createElement('style');
            style.textContent = `
                .system-info-modal {
                    position: fixed;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(5px);
                    -webkit-backdrop-filter: blur(5px);
                    z-index: 9999;
                    display: none;
                    justify-content: center;
                    align-items: center;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                .system-info-modal.active {
                    display: flex;
                    opacity: 1;
                }
                .system-info-content-ios {
                    background: var(--color-bg, #0B0B0B);
                    width: 100%;
                    max-width: 650px;
                    height: 90vh;
                    max-height: 850px;
                    border-radius: 14px;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    font-family: var(--font-body, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif);
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    overflow: hidden;
                    color: var(--color-text, #ffffff);
                    border: 1px solid rgba(255,255,255,0.1);
                }
                body.light-mode .system-info-content-ios {
                    border: 1px solid rgba(0,0,0,0.1);
                    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
                }
                .system-info-close-ios {
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    cursor: pointer;
                    color: var(--color-text-dim, #cccccc);
                    background: var(--color-surface, #111111);
                    border-radius: 50%;
                    padding: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s, color 0.2s;
                    border: 1px solid rgba(255,255,255,0.1);
                }
                body.light-mode .system-info-close-ios {
                    background: #e5e5ea;
                    border: none;
                    color: #8e8e93;
                }
                .system-info-close-ios:hover {
                    color: var(--color-text, #ffffff);
                    background: rgba(255,255,255,0.1);
                }
                body.light-mode .system-info-close-ios:hover {
                    background: #d1d1d6;
                    color: #000;
                }
                .system-info-close-ios svg {
                    width: 20px;
                    height: 20px;
                }
                .sys-header {
                    padding: 40px 20px 20px;
                    text-align: center;
                    background: var(--color-bg, #0B0B0B);
                    flex-shrink: 0;
                }
                .sys-logo {
                    margin-bottom: 15px;
                }
                .sys-logo img {
                    width: 70px;
                    height: auto;
                    display: block;
                    margin: 0 auto;
                }
                body.light-mode .sys-logo img {
                    /* If logo needs to be fully dark on light mode, invert and brightness(0) could be used */
                    /* filter: invert(1) brightness(0); */
                }
                .sys-header h1 {
                    font-size: 24px;
                    font-weight: 600;
                    margin: 0 0 4px 0;
                    color: var(--color-text, #ffffff);
                    font-family: var(--font-heading, inherit);
                }
                .sys-subtitle {
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--color-text-dim, #cccccc);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .sys-scroll-area {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0 20px 40px;
                }
                .sys-group {
                    margin-top: 24px;
                }
                .sys-group-title {
                    font-size: 13px;
                    color: var(--color-text-dim, #cccccc);
                    margin-bottom: 8px;
                    margin-left: 16px;
                    text-transform: uppercase;
                }
                .sys-card {
                    background: var(--color-surface, #111111);
                    border-radius: 10px;
                    overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.05);
                }
                body.light-mode .sys-card {
                    background: #ffffff;
                    border: 1px solid rgba(0,0,0,0.1);
                }
                .sys-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 14px 16px;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    font-size: 15px;
                }
                body.light-mode .sys-row {
                    border-bottom: 1px solid rgba(0,0,0,0.1);
                }
                .sys-row:last-child {
                    border-bottom: none;
                }
                .sys-label {
                    color: var(--color-text, #ffffff);
                }
                .sys-value {
                    color: var(--color-text-dim, #cccccc);
                    text-align: right;
                }
                .sys-link {
                    color: var(--color-primary, #E6AE17);
                    text-decoration: none;
                }
                .sys-link:hover {
                    text-decoration: underline;
                    color: var(--color-primary-hover, #d5a015);
                }
                .sys-toggle-switch {
                    position: relative;
                    display: inline-block;
                    width: 46px;
                    height: 24px;
                    margin-left: 10px;
                }
                .sys-toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .sys-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background-color: var(--color-surface, #111111);
                    transition: .4s;
                    border-radius: 24px;
                    border: 1px solid rgba(255,255,255,0.2);
                }
                body.light-mode .sys-slider {
                    background-color: #e5e5ea;
                    border: 1px solid rgba(0,0,0,0.1);
                }
                .sys-slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 2px;
                    bottom: 2px;
                    background-color: #fff;
                    transition: .4s;
                    border-radius: 50%;
                }
                body.light-mode .sys-slider:before {
                    background-color: #fff;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                }
                input:checked + .sys-slider {
                    background-color: var(--color-primary, #E6AE17);
                    border-color: var(--color-primary, #E6AE17);
                }
                input:checked + .sys-slider:before {
                    transform: translateX(22px);
                }
                .sys-select {
                    background: var(--color-bg, #0B0B0B);
                    color: var(--color-text, #ffffff);
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 6px;
                    padding: 4px 8px;
                    font-size: 14px;
                    outline: none;
                    cursor: pointer;
                }
                body.light-mode .sys-select {
                    background: #ffffff;
                    color: #000;
                    border: 1px solid rgba(0,0,0,0.2);
                }
                .sys-footer {
                    margin-top: 40px;
                    text-align: center;
                    font-size: 12px;
                    color: var(--color-text-dim, #cccccc);
                    line-height: 1.5;
                }
                /* Scrollbar for modal */
                .sys-scroll-area::-webkit-scrollbar {
                    width: 6px;
                }
                .sys-scroll-area::-webkit-scrollbar-track {
                    background: transparent;
                }
                .sys-scroll-area::-webkit-scrollbar-thumb {
                    background: var(--color-surface, #333);
                    border-radius: 4px;
                }
                body.light-mode .sys-scroll-area::-webkit-scrollbar-thumb {
                    background: #c7c7cc;
                }
                @media (max-width: 600px) {
                    .system-info-content-ios {
                        height: 100vh;
                        max-height: 100vh;
                        border-radius: 0;
                        border: none;
                    }
                }
            `;
            document.head.appendChild(style);
            document.body.appendChild(modal);

            // --- System Settings Initialization ---
            const autoThemeToggle = modal.querySelector('#sys-auto-theme-toggle');
            const lightTimeInput = modal.querySelector('#sys-light-time');
            const darkTimeInput = modal.querySelector('#sys-dark-time');
            const langSelect = modal.querySelector('#sys-lang-select');
            const regionSelect = modal.querySelector('#sys-region-select');

            // 1. Theme Auto Mode
            if (window.getThemeAutoMode) {
                autoThemeToggle.checked = window.getThemeAutoMode();
                autoThemeToggle.addEventListener('change', function() {
                    window.setThemeAutoMode(this.checked);
                });
            }
            // 2. Theme Schedule
            if (window.getThemeSchedule) {
                const schedule = window.getThemeSchedule();
                lightTimeInput.value = schedule.lightStart;
                darkTimeInput.value = schedule.darkStart;
                const updateSchedule = () => {
                    window.setThemeSchedule(lightTimeInput.value, darkTimeInput.value);
                };
                lightTimeInput.addEventListener('change', updateSchedule);
                darkTimeInput.addEventListener('change', updateSchedule);
            }
            // 3. Language
            const currentLang = window.location.pathname.includes('/en/') ? 'en' : 'pt';
            langSelect.value = currentLang;
            langSelect.addEventListener('change', function() {
                const selectedLang = this.value;
                if (selectedLang !== currentLang && typeof window.toggleLanguage === 'function') {
                    window.toggleLanguage();
                }
            });
            // 4. Region
            const currentRegion = localStorage.getItem('user_region') || 'PT';
            regionSelect.value = currentRegion;
            regionSelect.addEventListener('change', function() {
                localStorage.setItem('user_region', this.value);
            });
            // --------------------------------------

            // Re-initialize Lucide Icons for the new close icon
            if (typeof lucide !== 'undefined') {
                lucide.createIcons({
                    root: modal
                });
            }

            // Close events
            const closeBtn = modal.querySelector('.system-info-close-ios');
            closeBtn.addEventListener('click', closeSystemInfoModal);

            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    closeSystemInfoModal();
                }
            });

            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && modal.classList.contains('active')) {
                    closeSystemInfoModal();
                }
            });
        }

        // Show modal
        modal.style.display = 'flex';
        // Force reflow
        void modal.offsetWidth;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSystemInfoModal() {
        const modal = document.getElementById('system-info-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    }
})();
// System Update Loader
function showSystemUpdateLoader(text) {
    return new Promise(resolve => {
        try {
            const isEn = window.location.pathname.includes('/en/');
            const imgPath = isEn ? '../images/logo/logo_bw_loading.png' : 'images/logo/logo_bw_loading.png';

            const overlay = document.createElement('div');
            overlay.className = 'sys-update-overlay';

            overlay.innerHTML = `
                <div class="sys-update-logo-wrapper">
                    <img src="${imgPath}" alt="Loading..." class="sys-update-logo">
                    <div class="sys-update-shimmer" id="sys-update-shimmer-mask"></div>
                </div>
                <div class="sys-update-progress-container">
                    <div class="sys-update-progress-bar" id="update-progress-bar"></div>
                </div>
                <div class="sys-update-text">${text}</div>
            `;

            document.body.appendChild(overlay);

            const shimmerMask = document.getElementById('sys-update-shimmer-mask');
            if (shimmerMask) {
                shimmerMask.style.webkitMaskImage = `url('${imgPath}')`;
                shimmerMask.style.maskImage = `url('${imgPath}')`;
            }

            // Trigger reflow and fade in
            overlay.offsetHeight;
            overlay.style.opacity = '1';

            setTimeout(() => {
                const bar = document.getElementById('update-progress-bar');
                if (bar) bar.style.width = '100%';
            }, 50);
        } catch (err) {
            console.error("Error displaying update loader:", err);
        }

        // Always resolve after 2 seconds to ensure the loader duration
        setTimeout(() => { resolve(); }, 2000);
    });
}

// Global function to force update version and clear caches
window.forceUpdateVersion = async function(isLogout = false) {
    try {
        // Show loading overlay
        const loadingText = isLogout ? "A terminar sessão..." : "A atualizar...";
        await showSystemUpdateLoader(loadingText);

        // Trigger explicit Firebase signout if auth.js is loaded
        if (typeof window.forceFirebaseLogout === 'function') {
            try { await window.forceFirebaseLogout(); } catch(e) {}
        }
        window.dispatchEvent(new Event('force-firebase-logout'));

        // Clear cookies completely for all paths
        document.cookie.split(";").forEach(function(c) {
            const cookieName = c.replace(/^ +/, "").split("=")[0];
            document.cookie = cookieName + "=;expires=" + new Date().toUTCString() + ";path=/";
            document.cookie = cookieName + "=;expires=" + new Date().toUTCString() + ";path=/;domain=" + window.location.hostname;
        });

        // Clear local storage & session storage
        localStorage.clear();
        sessionStorage.clear();

        // Pass a flag to indicate we just performed an update/logout
        sessionStorage.setItem('sys_action', isLogout ? 'logout' : 'update');

        // Helper to delete IndexedDB
        const deleteDB = (name) => new Promise((resolve) => {
            try {
                const req = window.indexedDB.deleteDatabase(name);
                req.onsuccess = resolve;
                req.onerror = resolve;
                req.onblocked = resolve;
            } catch (e) { resolve(); }
        });

        // Clear all IndexedDB databases (this clears Firebase auth state, offline data, etc.)
        if (window.indexedDB) {
            let dbsToDelete = ['firebaseLocalStorageDb', 'firebase-heartbeat-database', 'firebase-installations-database'];
            if (window.indexedDB.databases) {
                try {
                    const dbs = await window.indexedDB.databases();
                    dbs.forEach(db => { if (db.name && !dbsToDelete.includes(db.name)) dbsToDelete.push(db.name); });
                } catch(e) { console.error("Error listing IndexedDBs:", e); }
            }

            await Promise.all(dbsToDelete.map(name => deleteDB(name)));
        }

        // Clear Service Worker Caches
        if ('caches' in window) {
            try {
                const names = await caches.keys();
                await Promise.all(names.map(name => caches.delete(name)));
            } catch(e) { console.error("Error clearing caches:", e); }
        }

        // Unregister service workers
        if ('serviceWorker' in navigator) {
            try {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(reg => reg.unregister()));
            } catch(e) { console.error("Error unregistering service workers:", e); }
        }

        // Hard reload
        setTimeout(() => {
            window.location.reload(true);
        }, 300);

    } catch (e) {
        console.error('Error clearing caches:', e);
        window.location.reload(true);
    }
};

// Local dev fix: append html extension to internal extensionless links when running on localhost
if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
    document.addEventListener('click', function(e) {
        const a = e.target.closest('a');
        if (a && a.getAttribute('href') && a.getAttribute('href').startsWith('/')) {
            let href = a.getAttribute('href');
            const ext = ['.h', 'tml'].join('');
            if (href.includes(ext) || href.includes('#') || href.includes('?')) return;
            e.preventDefault();
            if (href.endsWith('/')) {
                window.location.href = href + 'index' + ext;
            } else {
                window.location.href = href + ext;
            }
        }
    });
}
