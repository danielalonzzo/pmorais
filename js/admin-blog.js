import { auth, db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    doc, 
    getDoc,
    setDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const ADMIN_EMAIL = "pt@pmorais.pt";
const blogGrid = document.getElementById('blog-grid');
const modal = document.getElementById('modal-post');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnNewPost = document.getElementById('btn-new-post');
const postForm = document.getElementById('post-form');

// Initialize Quill editors
let quillPT, quillEN;

function initEditors() {
    const toolbarOptions = [
        [{ 'header': [2, 3, 4, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote', 'code-block'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'color': [] }, { 'background': [] }],
        ['link', 'image', 'video'],
        ['clean']
    ];
    
    quillPT = new Quill('#editor-pt', {
        theme: 'snow',
        modules: { toolbar: toolbarOptions },
        placeholder: 'Escreve aqui o conteúdo em Português...'
    });
    
    quillEN = new Quill('#editor-en', {
        theme: 'snow',
        modules: { toolbar: toolbarOptions },
        placeholder: 'Write the English content here...'
    });
}

// Check Auth & Admin
onAuthStateChanged(auth, async (user) => {
    try {
        if (!user) {
            window.location.href = 'perfil.html';
            return;
        }

        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        if (userData?.role !== 'admin' && user.email !== ADMIN_EMAIL) {
            alert("Acesso restrito a administradores.");
            window.location.href = 'perfil.html';
            return;
        }

        // Init editors and load posts
        initEditors();
        loadPosts();
        setupEventListeners();
    } catch (err) {
        console.error("Auth check error:", err);
        blogGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: red;">Erro: ${err.message}</p>`;
    }
});

async function loadPosts() {
    try {
        blogGrid.innerHTML = '<div class="text-center w-100" style="grid-column: 1/-1; padding: 50px 0;"><i data-lucide="loader-2" class="spin" style="width: 40px; height: 40px;"></i><p>A carregar artigos...</p></div>';
        if (window.lucide) window.lucide.createIcons();

        const q = query(collection(db, "blog_posts"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        blogGrid.innerHTML = "";
        
        if (querySnapshot.empty) {
            blogGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; opacity: 0.7;">Ainda não existem artigos. Cria o teu primeiro artigo!</p>`;
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const card = document.createElement('div');
            card.className = 'post-card';
            
            const statusClass = data.published ? 'published' : 'draft';
            const statusText = data.published ? 'Publicado' : 'Rascunho';
            
            card.innerHTML = `
                <img src="${data.coverImageUrl || 'images/default-blog.jpg'}" alt="Capa" loading="lazy" onerror="this.src='images/logo/logo_amarelo.png'">
                <h3>${data.title_pt}</h3>
                <p class="status ${statusClass}"><i data-lucide="${data.published ? 'check-circle' : 'edit-3'}" style="width:14px;height:14px;margin-bottom:-2px;"></i> ${statusText}</p>
                <div class="post-actions">
                    <button class="btn-edit" data-id="${docSnap.id}"><i data-lucide="edit-2"></i> Editar</button>
                    <button class="btn-delete" data-id="${docSnap.id}"><i data-lucide="trash-2"></i> Apagar</button>
                </div>
            `;
            blogGrid.appendChild(card);
        });

        if (window.lucide) window.lucide.createIcons();
        
        // Attach events to buttons
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => editPost(e.currentTarget.dataset.id));
        });
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => deletePost(e.currentTarget.dataset.id));
        });

    } catch (error) {
        console.error("Error loading posts:", error);
        blogGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: red;">Erro ao carregar artigos.</p>`;
    }
}

function setupEventListeners() {
    btnNewPost.addEventListener('click', () => {
        postForm.reset();
        document.getElementById('post-id').value = '';
        quillPT.root.innerHTML = '';
        quillEN.root.innerHTML = '';
        document.getElementById('modal-title').textContent = 'Novo Artigo';
        modal.classList.add('active');
    });

    btnCloseModal.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('btn-save-post');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> A Guardar...';
        if (window.lucide) window.lucide.createIcons();

        try {
            const id = document.getElementById('post-id').value;
            const slug = document.getElementById('post-slug').value.trim().toLowerCase();
            const isNew = !id;
            const docId = isNew ? slug : id;
            
            if (isNew && !slug) {
                throw new Error("Slug é obrigatório");
            }

            const postData = {
                slug: slug,
                title_pt: document.getElementById('title-pt').value,
                title_en: document.getElementById('title-en').value,
                summary_pt: document.getElementById('summary-pt').value,
                summary_en: document.getElementById('summary-en').value,
                content_pt: quillPT.root.innerHTML,
                content_en: quillEN.root.innerHTML,
                coverImageUrl: document.getElementById('post-cover').value,
                published: document.getElementById('post-published').checked,
                updatedAt: serverTimestamp()
            };

            if (isNew) {
                // Check if slug exists
                const existingDoc = await getDoc(doc(db, "blog_posts", docId));
                if (existingDoc.exists()) {
                    throw new Error("Já existe um artigo com este Slug. Escolhe outro.");
                }
                postData.createdAt = serverTimestamp();
                postData.author = "Paulo Morais";
                postData.views = 0;
            }

            await setDoc(doc(db, "blog_posts", docId), postData, { merge: true });
            
            modal.classList.remove('active');
            loadPosts();
            
        } catch (error) {
            console.error("Error saving post:", error);
            alert("Erro: " + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i data-lucide="save"></i> Guardar Artigo';
            if (window.lucide) window.lucide.createIcons();
        }
    });
}

async function editPost(id) {
    try {
        const docSnap = await getDoc(doc(db, "blog_posts", id));
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            document.getElementById('post-id').value = id;
            document.getElementById('post-slug').value = data.slug || id;
            document.getElementById('post-cover').value = data.coverImageUrl || '';
            document.getElementById('title-pt').value = data.title_pt || '';
            document.getElementById('title-en').value = data.title_en || '';
            document.getElementById('summary-pt').value = data.summary_pt || '';
            document.getElementById('summary-en').value = data.summary_en || '';
            document.getElementById('post-published').checked = data.published || false;
            
            quillPT.root.innerHTML = data.content_pt || '';
            quillEN.root.innerHTML = data.content_en || '';
            
            document.getElementById('modal-title').textContent = 'Editar Artigo';
            modal.classList.add('active');
        }
    } catch (error) {
        console.error("Error fetching post:", error);
        alert("Erro ao abrir artigo para edição.");
    }
}

async function deletePost(id) {
    if (confirm("Tens a certeza absoluta que queres apagar este artigo? Esta ação é irreversível.")) {
        try {
            await deleteDoc(doc(db, "blog_posts", id));
            loadPosts();
        } catch (error) {
            console.error("Error deleting post:", error);
            alert("Erro ao apagar artigo.");
        }
    }
}
