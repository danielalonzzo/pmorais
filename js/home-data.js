/**
 * Homepage integrations that should not compete with the critical render path.
 * YouTube is created only after a click; Firestore is imported only when a
 * visitor submits the contact form or approaches the testimonials section.
 */
(function () {
    'use strict';

    const FIREBASE_VERSION = '10.8.0';
    const FIREBASE_CONFIG = {
        apiKey: 'AIzaSyCROYGriQ-5RWiLVCRwGz9KaDUKE6zNR2w',
        authDomain: 'paulo-morais.firebaseapp.com',
        projectId: 'paulo-morais',
        storageBucket: 'paulo-morais.firebasestorage.app',
        messagingSenderId: '431406968000',
        appId: '1:431406968000:web:01e40cb3eb4044ddc69125'
    };

    const REVIEW_CAROUSEL_LIMIT = 12;

    let firestorePromise;

    function loadFirestore() {
        if (!firestorePromise) {
            const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
            firestorePromise = Promise.all([
                import(`${base}/firebase-app.js`),
                import(`${base}/firebase-firestore.js`)
            ]).then(([firebaseApp, firestore]) => {
                const app = firebaseApp.getApps().length
                    ? firebaseApp.getApp()
                    : firebaseApp.initializeApp(FIREBASE_CONFIG);
                return { db: firestore.getFirestore(app), firestore };
            });
        }
        return firestorePromise;
    }

    function initVideoFacades() {
        document.querySelectorAll('.video-facade').forEach((facade) => {
            facade.addEventListener('click', () => {
                const videoId = facade.dataset.youtubeId;
                if (!/^[\w-]{11}$/.test(videoId || '')) return;

                const iframe = document.createElement('iframe');
                const start = Number.parseInt(facade.dataset.start || '0', 10);
                const title = facade.getAttribute('aria-label') || 'YouTube video';
                iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=1&playsinline=1&rel=0&start=${Number.isFinite(start) ? start : 0}`;
                iframe.title = title.replace(/^(Reproduzir|Play)\s+/i, '');
                iframe.width = '480';
                iframe.height = '360';
                iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
                iframe.allowFullscreen = true;
                facade.replaceWith(iframe);
            }, { once: true });
        });
    }

    function initContactForm() {
        const form = document.getElementById('indexContactForm');
        if (!form) return;

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submitButton = form.querySelector('button[type="submit"]');
            const buttonText = submitButton.querySelector('.btn-text');
            const message = document.getElementById('contactFormMessage');
            const originalText = buttonText ? buttonText.textContent : submitButton.textContent;

            submitButton.disabled = true;
            if (buttonText) buttonText.textContent = 'A enviar…';
            message.hidden = true;
            message.style.display = 'none';

            try {
                if (!document.getElementById('privacy-consent').checked) {
                    throw new Error('privacy-consent');
                }

                const { db, firestore } = await loadFirestore();
                await firestore.addDoc(firestore.collection(db, 'contactos'), {
                    nome: document.getElementById('nome').value.trim(),
                    apelido: document.getElementById('apelido').value.trim(),
                    email: document.getElementById('email').value.trim(),
                    descricao: document.getElementById('descricao').value.trim(),
                    timestamp: firestore.serverTimestamp(),
                    page: '/'
                });

                message.textContent = 'Mensagem enviada com sucesso! Entraremos em contacto em breve.';
                message.className = 'form-message success text-green-500';
                form.reset();
            } catch (error) {
                message.textContent = error && error.message === 'privacy-consent'
                    ? 'Por favor, aceite a Política de Privacidade.'
                    : 'Erro ao enviar mensagem. Por favor, tente novamente.';
                message.className = 'form-message error text-red-500';
            } finally {
                message.hidden = false;
                message.style.display = 'block';
                submitButton.disabled = false;
                if (buttonText) buttonText.textContent = originalText;
            }
        });
    }

    function toDate(value) {
        if (value && typeof value.toDate === 'function') return value.toDate();
        const parsed = new Date(value || 0);
        return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
    }

    function addReviewCard(review, index, isEnglish, carousel, dotsContainer) {
        const card = document.createElement('div');
        card.className = 'testimonial-card-yellow';
        card.dataset.index = String(index);

        const content = document.createElement('div');
        content.className = 'testimonial-content';

        const name = document.createElement('h4');
        name.className = 'testimonial-name';
        const fallbackName = isEnglish ? 'Anonymous' : 'Anónimo';
        name.append(document.createTextNode(
            ((typeof review.userName === 'string' ? review.userName : fallbackName).trim() || fallbackName).toUpperCase()
        ));
        const badge = document.createElement('i');
        badge.dataset.lucide = 'badge-check';
        badge.setAttribute('aria-hidden', 'true');
        name.append(' ', badge);

        const role = document.createElement('p');
        role.className = 'testimonial-role';
        role.textContent = `${isEnglish ? 'CLIENT SINCE' : 'AVALIAÇÃO DE'} ${toDate(review.timestamp).getFullYear()}`;

        const text = document.createElement('p');
        text.className = 'testimonial-text';
        text.textContent = typeof review.text === 'string' ? review.text.slice(0, 1000) : '';

        content.append(name, role, text);
        card.append(content);
        carousel.insertBefore(card, carousel.querySelector('.testimonial-card-gold, .testimonial-card-yellow'));

        if (dotsContainer) {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'dot';
            dot.setAttribute('aria-label', `${isEnglish ? 'Show testimonial' : 'Mostrar testemunho'} ${index + 1}`);
            dot.setAttribute('aria-pressed', 'false');
            dotsContainer.prepend(dot);
        }
    }

    async function loadReviews() {
        const carousel = document.querySelector('.testimonial-carousel-wrapper');
        if (!carousel) return;

        try {
            const { db, firestore } = await loadFirestore();
            // The carousel only ever shows a handful of cards, so ask for the most
            // recent ones instead of every review ever written. timestamp is an ISO
            // string, which sorts correctly. Needs the composite index declared in
            // firestore.indexes.json.
            const snapshot = await firestore.getDocs(firestore.query(
                firestore.collection(db, 'reviews'),
                firestore.where('service', '==', 'treino'),
                firestore.where('hidden', '==', false),
                firestore.orderBy('timestamp', 'desc'),
                firestore.limit(REVIEW_CAROUSEL_LIMIT)
            ));
            const reviews = snapshot.docs
                .map((documentSnapshot) => documentSnapshot.data())
                .filter((review) => !review.isFromHTML)
                .sort((a, b) => toDate(b.timestamp) - toDate(a.timestamp));

            const dots = document.querySelector('.testimonial-pagination');
            const firstIndex = carousel.querySelectorAll('.testimonial-card-gold, .testimonial-card-yellow').length;
            const isEnglish = document.documentElement.lang.toLowerCase().startsWith('en');
            reviews.forEach((review, offset) => addReviewCard(review, firstIndex + offset, isEnglish, carousel, dots));

            if (typeof window.setupCarousel === 'function') window.setupCarousel();
            if (window.lucide) window.lucide.createIcons();
        } catch (_) {
            // Static testimonials remain available if the optional network request fails.
        }
    }

    function initLazyReviews() {
        const section = document.getElementById('testemunhos');
        if (!section) return;

        if (!('IntersectionObserver' in window)) return;
        const observer = new IntersectionObserver((entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) return;
            observer.disconnect();
            loadReviews();
        }, { rootMargin: '200px 0px' });
        observer.observe(section);
    }

    function init() {
        initVideoFacades();
        initContactForm();
        initLazyReviews();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
