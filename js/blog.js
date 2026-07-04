import { db } from './firebase-config.js';
import { collection, getDocs, doc, getDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const isEnglish = window.location.pathname.includes('/en/');
const langPrefix = isEnglish ? '_en' : '_pt';

export async function loadBlogPosts(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    try {
        container.innerHTML = `<div class="text-center w-100" style="padding: 100px 0; opacity: 0.5;">
            <i data-lucide="loader-2" class="spin" style="width: 40px; height: 40px;"></i>
            <p>${isEnglish ? 'Loading articles...' : 'A carregar artigos...'}</p>
        </div>`;
        if (window.lucide) window.lucide.createIcons();

        // Only fetch published posts
        const q = query(collection(db, "blog_posts"), where("published", "==", true), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        
        container.innerHTML = '';
        
        if (snapshot.empty) {
            container.innerHTML = `<p class="text-center" style="opacity: 0.7; padding: 50px 0;">${isEnglish ? 'No articles published yet.' : 'Ainda não existem artigos publicados.'}</p>`;
            return;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const title = isEnglish ? data.title_en : data.title_pt;
            const summary = isEnglish ? data.summary_en : data.summary_pt;
            const articleUrl = isEnglish ? `article.html?id=${data.slug || docSnap.id}` : `artigo.html?id=${data.slug || docSnap.id}`;
            const dateStr = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString(isEnglish ? 'en-US' : 'pt-PT', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
            
            // Only show if title exists for this language
            if (!title) return;

            const card = document.createElement('div');
            card.className = 'blog-card';
            card.innerHTML = `
                <a href="${articleUrl}" class="blog-card-link">
                    <div class="blog-card-img-wrapper">
                        <img src="${data.coverImageUrl || '../images/default-blog.jpg'}" alt="${title}" loading="lazy" onerror="this.src='${isEnglish ? '../' : ''}images/logo/logo_amarelo.png'">
                    </div>
                    <div class="blog-card-content">
                        <p class="blog-date">${dateStr}</p>
                        <h3>${title}</h3>
                        <p class="blog-summary">${summary}</p>
                        <span class="blog-read-more">${isEnglish ? 'Read more' : 'Ler mais'} <i data-lucide="arrow-right" style="width: 14px; height: 14px;"></i></span>
                    </div>
                </a>
            `;
            container.appendChild(card);
        });

        if (window.lucide) window.lucide.createIcons();
    } catch (error) {
        console.error("Error loading blog posts:", error);
        container.innerHTML = `<p class="text-center text-red" style="padding: 50px 0;">${isEnglish ? 'Error loading articles.' : 'Erro ao carregar artigos.'}</p>`;
    }
}

export async function loadSingleArticle(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('id');

    if (!slug) {
        container.innerHTML = `<p class="text-center text-red">${isEnglish ? 'Article not found.' : 'Artigo não encontrado.'}</p>`;
        return;
    }

    try {
        const docRef = doc(db, "blog_posts", slug);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists() || !docSnap.data().published) {
            container.innerHTML = `<p class="text-center text-red" style="padding: 100px 0; font-size: 1.2rem;">${isEnglish ? 'Article not found or unpublished.' : 'Artigo não encontrado ou não publicado.'}</p>`;
            return;
        }

        const data = docSnap.data();
        const title = isEnglish ? data.title_en : data.title_pt;
        const content = isEnglish ? data.content_en : data.content_pt;
        const dateStr = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString(isEnglish ? 'en-US' : 'pt-PT', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
        
        // Update Meta Tags dynamically for SEO (fallback if no Cloud Function SSR)
        document.title = `${title} - Paulo Morais`;
        document.querySelector('meta[name="description"]')?.setAttribute("content", isEnglish ? data.summary_en : data.summary_pt);
        
        container.innerHTML = `
            <div class="article-header text-center" style="margin-bottom: 40px;">
                <p class="article-date" style="color: var(--color-primary); font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">${dateStr}</p>
                <h1 class="premium-title" style="font-size: clamp(2rem, 5vw, 3.5rem); margin-bottom: 20px;">${title}</h1>
                <p style="opacity: 0.8; margin-bottom: 30px;">${isEnglish ? 'By Paulo Morais' : 'Por Paulo Morais'}</p>
            </div>
            
            ${data.coverImageUrl ? `<img src="${data.coverImageUrl}" alt="${title}" class="article-cover" style="width: 100%; max-height: 500px; object-fit: cover; border-radius: 20px; margin-bottom: 50px;">` : ''}
            
            <div class="article-body ql-editor" style="font-size: 1.1rem; line-height: 1.8; color: var(--color-text);">
                ${content}
            </div>
            
            <div class="article-footer" style="margin-top: 60px; padding-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between;">
                <a href="blog.html" class="btn btn-outline"><i data-lucide="arrow-left"></i> ${isEnglish ? 'Back to Blog' : 'Voltar ao Blog'}</a>
            </div>
        `;
        
        if (window.lucide) window.lucide.createIcons();
    } catch (error) {
        console.error("Error loading article:", error);
        container.innerHTML = `<p class="text-center text-red" style="padding: 100px 0;">${isEnglish ? 'Error loading article.' : 'Erro ao carregar artigo.'}</p>`;
    }
}
