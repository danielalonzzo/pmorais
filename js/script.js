/*
 * Developed by Elysium λ Development & Research
 * A European company
 */
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

    // Preloader Logic with YouTube API integration for Hero Video
    const preloader = document.getElementById('preloader');
    const heroIframe = document.getElementById('hero-video-iframe');
    let preloaderDismissed = false;

    function dismissPreloader() {
        if (preloaderDismissed || !preloader) return;
        preloaderDismissed = true;
        document.body.classList.add('loaded');
        setTimeout(() => {
            preloader.style.display = 'none';
        }, 500);
    }

    // Fallback: forcefully remove preloader after 8 seconds if anything fails
    const fallbackTimer = setTimeout(dismissPreloader, 8000);

    if (preloader && heroIframe) {
        // Dynamically load the YouTube Iframe API
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        // Global callback for YouTube API
        window.onYouTubeIframeAPIReady = function () {
            // Initial Hero Video
            if (document.getElementById('hero-video-iframe')) {
                player = new YT.Player('hero-video-iframe', {
                    events: {
                        'onReady': function (event) {
                            try {
                                event.target.setPlaybackQuality('hd1080');
                                event.target.mute();
                                event.target.playVideo();
                            } catch (e) { }
                        },
                        'onStateChange': function (event) {
                            // When video starts playing (state 1 = PLAYING)
                            if (event.data === 1) { // YT.PlayerState.PLAYING 
                                setTimeout(() => {
                                    clearTimeout(fallbackTimer);
                                    dismissPreloader();
                                }, 1500);
                            }
                        }
                    }
                });
            }

            // Final Hero CTA Video (Footer)
            if (document.getElementById('hero-cta-video-iframe')) {
                player2 = new YT.Player('hero-cta-video-iframe', {
                    events: {
                        'onReady': function (event) {
                            try {
                                event.target.setPlaybackQuality('hd1080');
                                event.target.mute();
                                event.target.playVideo();
                            } catch (e) { }
                        },
                        'onStateChange': function (event) {
                            // Optional tracking or logic for CTA video
                        }
                    }
                });
            }
        };
    } else {
        // Standard behavior for pages without the hero video
        window.addEventListener('load', () => {
            setTimeout(() => {
                clearTimeout(fallbackTimer);
                dismissPreloader();
            }, 500);
        });
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
            }
        });

        // Close FAB when clicking anywhere else
        document.addEventListener('click', () => {
            fabContainer.classList.remove('active');
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
    trigger.addEventListener('click', () => {
        const imgElement = trigger.querySelector('img');
        if (!imgElement) return;
        
        lightboxImg.src = imgElement.src;
        lightbox.style.display = 'flex';
        // Small timeout to allow browser to trigger transition
        setTimeout(() => {
            lightbox.classList.add('active');
        }, 10);
        document.body.style.overflow = 'hidden'; // Disable page scrolling
    });

    // Close lightbox functions
    const closeLightbox = () => {
        lightbox.classList.remove('active');
        document.body.style.overflow = ''; // Enable page scrolling
        setTimeout(() => {
            lightbox.style.display = 'none';
            lightboxImg.src = '';
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

