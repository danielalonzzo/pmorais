/*
 * Developed by Elysium λ Development & Research
 * A European company
 */
import { auth, db } from './firebase-config.js?v=1.6.1';
import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    doc,
    getDoc,
    getDocs,
    collection,
    query,
    where,
    documentId
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const historyContent = document.getElementById('history-content');
const pageTitle = document.getElementById('page-title');
const filterBar = document.getElementById('history-filter');
const clientFilter = document.getElementById('history-client-filter');
const filterCount = document.getElementById('history-filter-count');

// Names come from the client (sign-up/profile), so they are escaped before
// going into innerHTML.
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[ch]));

const sessionsLabel = (n) => `${n} ${n === 1 ? 'session' : 'sessions'}`;

function renderHistory(items, isAdmin) {
    if (items.length === 0) {
        historyContent.innerHTML = `
            <div class="empty-history" style="text-align: center; padding: 100px; opacity: 0.5;">
                <i data-lucide="calendar"></i>
                <p>No records of past bookings yet.</p>
            </div>
        `;
    } else {
        historyContent.innerHTML = items.map(item => `
            <div class="history-item">
                <div class="history-main-info">
                    <span class="history-tag ${item.serviceType === 'osteopatia' ? 'tag-osteo' : 'tag-treino'}">
                        ${item.serviceType === 'osteopatia' ? 'Osteopathy' : 'Training'}
                    </span>
                    ${isAdmin ? `
                        <div class="history-user-info">
                            <span class="user-name">${escapeHtml(item.userName)}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="history-schedule-meta">
                    <div class="meta-item">
                        <i data-lucide="calendar"></i>
                        <span>${escapeHtml(item.date || '---')}</span>
                    </div>
                    <div class="meta-item">
                        <i data-lucide="clock"></i>
                        <span>${escapeHtml(item.time || '---')}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    if (window.lucide) window.lucide.createIcons();
}

// Client filter: one option per client (user_* document), only for clients with
// past sessions, so picking a name never yields an empty list.
function setupClientFilter(items) {
    const clients = new Map();
    items.forEach(item => {
        const entry = clients.get(item.clientId);
        if (entry) entry.count++;
        else clients.set(item.clientId, { name: item.clientName, count: 1 });
    });

    const sorted = [...clients.entries()].sort((a, b) =>
        a[1].name.localeCompare(b[1].name, 'en', { sensitivity: 'base' })
    );

    clientFilter.innerHTML = `<option value="">All clients (${items.length})</option>` +
        sorted.map(([id, c]) => `<option value="${escapeHtml(id)}">${escapeHtml(c.name)} (${c.count})</option>`).join('');

    const apply = () => {
        const selected = clientFilter.value;
        const visible = selected ? items.filter(item => item.clientId === selected) : items;
        filterCount.textContent = sessionsLabel(visible.length);
        renderHistory(visible, true);
    };

    clientFilter.addEventListener('change', apply);

    filterBar.hidden = false;
    apply();
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "perfil";
        return;
    }

    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        const isAdmin = userData?.role === 'admin' || userData?.role === 'root' || user.email === "pt@pmorais.pt";

        pageTitle.textContent = isAdmin ? "Global Booking History" : "Your History";

        let consolidatedHistory = [];

        if (isAdmin) {
            // Only the per-client documents hold history. Bounding the query by the
            // user_ prefix skips every week document (YYYY-MM-DD), which is roughly
            // half the collection and carries nothing this page renders.
            const allDocs = await getDocs(query(
                collection(db, "weekly_schedules"),
                where(documentId(), '>=', 'user_'),
                where(documentId(), '<=', 'user_')
            ));
            allDocs.forEach(docSnap => {
                const data = docSnap.data();
                // User booking docs have IDs starting with "user_"
                if (docSnap.id.startsWith('user_') && data.bookings && data.bookings.length > 0) {
                    const userName = data.name || data.email || "User";
                    data.bookings.forEach(booking => {
                        consolidatedHistory.push({
                            ...booking,
                            userName: booking.bookedName || userName,
                            clientId: docSnap.id,
                            clientName: userName
                        });
                    });
                }
            });
        } else {
            // Read user's own booking doc from weekly_schedules
            const bookingDoc = await getDoc(doc(db, "weekly_schedules", `user_${user.uid}`));
            if (bookingDoc.exists()) {
                consolidatedHistory = bookingDoc.data().bookings || [];
            }
        }

        if (consolidatedHistory.length > 0) {
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];

            // Filter: Admin sees everything before today
            const historyToDisplay = consolidatedHistory.filter(item => {
                if (isAdmin) return item.date < todayStr;
                return true;
            });

            // Sort most recent first
            historyToDisplay.sort((a, b) => {
                const dateA = a.date ? new Date(`${a.date}T${a.time || '00:00'}`) : new Date(0);
                const dateB = b.date ? new Date(`${b.date}T${b.time || '00:00'}`) : new Date(0);
                return dateB - dateA;
            });

            if (isAdmin && historyToDisplay.length > 0) {
                setupClientFilter(historyToDisplay);
            } else {
                renderHistory(historyToDisplay, isAdmin);
            }
        } else {
            historyContent.innerHTML = `
                <div class="empty-history" style="text-align: center; padding: 100px; opacity: 0.5;">
                    <i data-lucide="calendar-off"></i>
                    <p>The history is empty.</p>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
        }

    } catch (error) {
        console.error("Error loading history page:", error);
        if (historyContent) {
            historyContent.innerHTML = `<p style="color:red; text-align:center;">Error loading data.</p>`;
        }
    }
});
