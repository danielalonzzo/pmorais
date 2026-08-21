import { auth, db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    setDoc,
    query, 
    where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { buildGuestClientId } from './guest-clients.js';

// [SEC-03] Conditional logger — silent in production
const _isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const logger = { log: (...a) => _isDev && console.log(...a), warn: (...a) => console.warn(...a), error: (...a) => console.error(...a) };


const ADMIN_EMAIL = "pt@pmorais.pt";
const profilesGrid = document.getElementById('profiles-grid');
const modal = document.getElementById('modal-details');
const modalName = document.getElementById('modal-name');
const modalContainer = document.getElementById('modal-data-container');
const btnCloseModal = document.getElementById('btn-close-modal');
const guestModal = document.getElementById('modal-guest');
const guestForm = document.getElementById('form-guest');
const guestTitle = document.getElementById('modal-guest-title');
const guestFeedback = document.getElementById('guest-feedback');
const profilesCount = document.getElementById('profiles-count');

let currentAdminUid = null;

// Check Auth & Admin
onAuthStateChanged(auth, async (user) => {
    try {
        if (!user) {
            logger.log("No user found, redirecting...");
            window.location.href = 'perfil';
            return;
        }

        logger.log("User authenticated:", user.email);

        // Verify Admin Role in Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        logger.log("User data from Firestore:", userData);

        if (userData?.role !== 'admin' && userData?.role !== 'root' && user.email !== ADMIN_EMAIL) {
            alert("Acesso restrito a administradores.");
            window.location.href = 'perfil';
            return;
        }

        // If Admin, load profiles
        currentAdminUid = user.uid;
        loadProfiles();
    } catch (err) {
        console.error("Auth/Admin check error:", err);
        profilesGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: red;">Erro de autenticação/permissão: ${err.message}</p>`;
    }
});

async function loadProfiles() {
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        profilesGrid.innerHTML = "";
        
        const users = [];
        querySnapshot.forEach((doc) => {
            users.push({ id: doc.id, ...doc.data() });
        });

        // Filter out admins and Paulo himself
        const clients = users.filter(u => u.role !== 'admin' && u.role !== 'root' && u.email !== ADMIN_EMAIL).sort((a,b) => (a.name || "").localeCompare(b.name || ""));

        if (clients.length === 0) {
            profilesGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; opacity: 0.5;">Nenhum aluno registado.</p>`;
            return;
        }

        const semConta = clients.filter(u => u.hasAccount === false).length;
        if (profilesCount) {
            profilesCount.textContent = semConta > 0
                ? `${clients.length} cliente(s) — ${semConta} sem conta.`
                : `${clients.length} cliente(s).`;
        }

        clients.forEach(userData => {
            const isDeact = userData.isDeactivated ? '<span style="display:inline-block; margin-top:8px; font-size:0.7rem; background:var(--color-danger, #ef4444); color:#fff; padding:3px 8px; border-radius:4px; font-weight:bold; letter-spacing:1px; text-transform:uppercase;">Conta Desativada</span>' : '';
            // Clientes sem conta não têm email — o contacto é o telemóvel.
            const semContaBadge = userData.hasAccount === false
                ? '<span class="badge-sem-conta">Utilizador sem conta</span>'
                : '';
            const card = document.createElement('div');
            card.className = 'user-card';
            card.innerHTML = `
                <div>
                    <h4></h4>
                    <p></p>
                    ${semContaBadge}
                    ${isDeact}
                </div>
                <div class="card-footer-link">
                    VER FICHA COMPLETA <i data-lucide="external-link" style="width: 14px;"></i>
                </div>
            `;
            card.querySelector('h4').textContent = userData.name || "Sem Nome";
            card.querySelector('p').textContent = userData.email || userData.phone || "—";

            card.onclick = () => showUserDetails(userData);
            profilesGrid.appendChild(card);
        });

        if (window.lucide) window.lucide.createIcons();

    } catch (error) {
        console.error("Error loading profiles:", error);
        let errorMsg = error.message;
        if (error.code === 'permission-denied') {
            errorMsg = "Permissão negada. Verifique se a sua conta tem privilégios de administrador no Firestore.";
        }
        profilesGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center;">
                <p style="color: #ff6b6b; font-weight: 600;">Ocorreu um erro ao carregar os dados.</p>
                <p style="opacity: 0.7; font-size: 0.9rem;">${errorMsg}</p>
            </div>
        `;
    }
}

async function showUserDetails(data) {
    const semConta = data.hasAccount === false;
    modalName.innerHTML = escapeHtml(data.name || "Sem Nome")
        + (semConta ? ' <span class="badge-sem-conta" style="vertical-align:middle; margin-left:10px; margin-top:0;">Utilizador sem conta</span>' : '')
        + (data.isDeactivated ? ' <span style="font-size:0.8rem; background:var(--color-danger, #ef4444); color:#fff; padding:3px 8px; border-radius:4px; vertical-align:middle; margin-left:10px;">CONTA DESATIVADA PELO UTILIZADOR</span>' : '');
    modalContainer.innerHTML = "";

    if (semConta) {
        const editRow = document.createElement('div');
        editRow.style.cssText = 'display:flex; justify-content:flex-end; margin-bottom:20px;';
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'btn btn-outline';
        editBtn.innerHTML = '<i data-lucide="pencil" style="width:16px;"></i> Editar';
        editBtn.onclick = () => {
            modal.classList.remove('active');
            openGuestModal(data);
        };
        editRow.appendChild(editBtn);
        modalContainer.appendChild(editRow);
    }

    const details = [
        { label: "Email", value: semConta ? "— (sem conta)" : data.email },
        { label: "Telemóvel", value: data.phone || "---" },
        { label: "Data de Nascimento", value: data.birthdate || "---" },
        { label: "Idade", value: data.age ? `${data.age} anos` : "---" },
        { label: "Peso", value: data.weight ? `${data.weight} kg` : "---" },
        { label: "Altura", value: data.height ? `${data.height} cm` : "---" },
        { label: "Massa Gorda", value: data.fatMass ? `${data.fatMass} %` : "---" },
        { label: "Massa Muscular", value: data.muscleMass ? `${data.muscleMass} kg` : "---" },
        { label: "Problemas de Saúde", value: data.healthIssues || "---" },
        { label: "Limitações Físicas", value: data.physicalLimits || "---" }
    ];

    details.forEach(item => {
        const div = document.createElement('div');
        div.className = 'detail-group';
        div.innerHTML = `
            <span class="detail-label"></span>
            <span class="detail-value"></span>
        `;
        div.querySelector('.detail-label').textContent = item.label;
        div.querySelector('.detail-value').textContent = item.value;
        modalContainer.appendChild(div);
    });

    if (data.observations) {
        const obsBox = document.createElement('div');
        obsBox.className = 'observations-box';
        obsBox.innerHTML = `
            <span class="observations-title">Observações</span>
            <p style="margin: 0; line-height: 1.6; opacity: 0.8;"></p>
        `;
        obsBox.querySelector('p').textContent = data.observations;
        modalContainer.appendChild(obsBox);
    }

    // Booking History Section — read from weekly_schedules/user_{uid}
    try {
        const bookingDoc = await getDoc(doc(db, "weekly_schedules", `user_${data.id}`));
        if (bookingDoc.exists()) {
            const bookings = bookingDoc.data().bookings || [];
            if (bookings.length > 0) {
                const historyBox = document.createElement('div');
                historyBox.className = 'history-box';
                
                // Sort history by date/time (most recent first)
                const sortedHistory = [...bookings].sort((a, b) => {
                    const dateA = a.date ? new Date(`${a.date}T${a.time || '00:00'}`) : new Date(0);
                    const dateB = b.date ? new Date(`${b.date}T${b.time || '00:00'}`) : new Date(0);
                    return dateB - dateA;
                });

                historyBox.innerHTML = `
                    <span class="history-title">Histórico de Reservas <i data-lucide="history" style="width:16px;"></i></span>
                    <div class="history-list">
                        ${sortedHistory.map(item => `
                            <div class="history-item">
                                <div class="history-main-info">
                                    <span class="history-tag ${item.serviceType === 'osteopatia' ? 'tag-osteo' : 'tag-treino'}">
                                        ${item.serviceType === 'osteopatia' ? 'Osteopatia' : 'Treino'}
                                    </span>
                                </div>
                                
                                <div class="history-schedule-meta">
                                    <div class="meta-item">
                                        <i data-lucide="calendar"></i>
                                        <span>${item.date || '---'}</span>
                                    </div>
                                    <div class="meta-item">
                                        <i data-lucide="clock"></i>
                                        <span>${item.time || '---'}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                modalContainer.appendChild(historyBox);
            }
        }
    } catch (e) {
        console.warn("Could not load booking history for user", e);
    }

    modal.classList.add('active');
    if (window.lucide) window.lucide.createIcons();
}

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = String(value == null ? '' : value);
    return div.innerHTML;
}

// ===================================================================
// Clientes sem conta — criar e editar
// ===================================================================
// São documentos de `users` sem utilizador de Firebase Auth. O id vem de
// buildGuestClientId(), a mesma função usada pelo script de carga inicial
// (functions/seed-clientes-sem-conta.js), por isso gravar o mesmo nome e
// telemóvel actualiza a ficha em vez de criar uma segunda.

let editingGuestId = null;

function setGuestFeedback(message, isError) {
    if (!guestFeedback) return;
    guestFeedback.textContent = message || '';
    guestFeedback.classList.toggle('error', isError === true);
}

function openGuestModal(existing) {
    editingGuestId = existing ? existing.id : null;
    if (guestTitle) {
        guestTitle.textContent = existing ? 'Editar cliente sem conta' : 'Novo cliente sem conta';
    }
    document.getElementById('guest-name').value = existing?.name || '';
    document.getElementById('guest-phone').value = existing?.phone || '';
    document.getElementById('guest-notes').value = existing?.observations || '';
    setGuestFeedback('');
    guestModal.classList.add('active');
    if (window.lucide) window.lucide.createIcons();
    document.getElementById('guest-name').focus();
}

function closeGuestModal() {
    guestModal.classList.remove('active');
    editingGuestId = null;
}

document.getElementById('btn-new-guest')?.addEventListener('click', () => openGuestModal(null));
document.getElementById('btn-close-guest')?.addEventListener('click', closeGuestModal);
document.getElementById('btn-cancel-guest')?.addEventListener('click', closeGuestModal);

guestForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('guest-name').value.trim();
    const phone = document.getElementById('guest-phone').value.trim();
    const observations = document.getElementById('guest-notes').value.trim();

    if (!name) return setGuestFeedback('Indique o nome do cliente.', true);
    if (phone.replace(/\D/g, '').length < 6) return setGuestFeedback('Indique um telemóvel válido.', true);

    const saveBtn = document.getElementById('btn-save-guest');
    saveBtn.disabled = true;
    setGuestFeedback('A guardar...');

    try {
        // Ao editar mantemos o id original: mudá-lo criaria uma segunda ficha e
        // desligaria o histórico guardado em weekly_schedules/user_{id}.
        const id = editingGuestId || buildGuestClientId(name, phone);

        const payload = {
            name,
            phone,
            observations,
            email: '',
            role: 'client',
            hasAccount: false,
            isDeactivated: false,
            updatedAt: new Date().toISOString()
        };
        if (!editingGuestId) {
            payload.profileCompleted = false;
            payload.createdAt = new Date().toISOString();
            payload.lastActivityAt = new Date().toISOString();
            payload.createdBy = currentAdminUid || 'admin';
        }

        await setDoc(doc(db, 'users', id), payload, { merge: true });

        setGuestFeedback('Guardado.');
        closeGuestModal();
        loadProfiles();
    } catch (err) {
        console.error('Erro ao guardar cliente sem conta:', err);
        setGuestFeedback(
            err.code === 'permission-denied'
                ? 'Permissão negada. Confirme que as regras do Firestore foram publicadas.'
                : `Erro ao guardar: ${err.message}`,
            true
        );
    } finally {
        saveBtn.disabled = false;
    }
});

// Modal closing
if (btnCloseModal) {
    btnCloseModal.onclick = () => modal.classList.remove('active');
}

window.onclick = (event) => {
    if (event.target == modal) {
        modal.classList.remove('active');
    }
    if (event.target == guestModal) {
        closeGuestModal();
    }
}
