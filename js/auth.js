/*
 * Developed by Elysium λ Development & Research
 * A European company
 */
// Import the functions you need from the SDKs you need
import { auth, db } from './firebase-config.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    doc,
    setDoc,
    getDoc,
    getDocs,
    collection,
    updateDoc,
    serverTimestamp,
    addDoc,
    query,
    where,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { initCalendarMode } from './calendar.js';

// UI Elements & State Management
document.addEventListener('DOMContentLoaded', () => {
    // Check if we are on the profile page
    if (!document.querySelector('.auth-card-container')) return;

    // Remove auto-focus from any field on load (prevents browser auto-selection)
    setTimeout(() => {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
            document.activeElement.blur();
        }
    }, 500); // 500ms delay to ensure browser finishes its "auto-focus" logic

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const authCard = document.getElementById('auth-card');
    const userDashboard = document.getElementById('user-dashboard');

    // Toggle between Login and Register tabs
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');

    if (tabLogin && tabRegister) {
        tabLogin.addEventListener('click', () => {
            switchTab('login');
        });

        tabRegister.addEventListener('click', () => {
            switchTab('register');
        });
    }

    function switchTab(tab) {
        if (tab === 'login') {
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        } else {
            tabRegister.classList.add('active');
            tabLogin.classList.remove('active');
            registerForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
        }
    }

    // Monitor Auth State
    onAuthStateChanged(auth, async (user) => {
        if (window.isReactivating) return;
        if (user) {
            // Show the dashboard immediately — do NOT wait for Firestore reads
            localStorage.setItem('pm_is_logged_in', 'true');
            if (window.injectPwaInstallButton) window.injectPwaInstallButton();
            if (window.maybeAutoShowPwaTutorial) window.maybeAutoShowPwaTutorial();

            authCard.classList.add('hidden');
            userDashboard.classList.remove('hidden');

            const ADMIN_EMAIL = "pt@pmorais.pt";
            const userEmail = user.email ? user.email.toLowerCase().trim() : "no-email";
            const isAdminEmail = userEmail === ADMIN_EMAIL.toLowerCase();

            const btnShowProfiles = document.getElementById('btn-show-profiles');
            const btnShowForms = document.getElementById('btn-show-forms');
            const btnStartBooking = document.getElementById('btn-start-booking');

            if (isAdminEmail) {
                if (btnShowProfiles) {
                    btnShowProfiles.classList.remove('hidden');
                    btnShowProfiles.onclick = () => window.location.href = 'perfis.html';
                }
                const btnShowReviews = document.getElementById('btn-show-reviews');
                if (btnShowReviews) btnShowReviews.classList.add('hidden');

                const btnAdminReviews = document.getElementById('btn-admin-reviews');
                if (btnAdminReviews) btnAdminReviews.classList.remove('hidden');
                if (btnShowForms) {
                    btnShowForms.classList.remove('hidden');
                    btnShowForms.onclick = () => window.location.href = 'formulario.html';
                }
                if (btnStartBooking) {
                    const span = btnStartBooking.querySelector('.btn-text');
                    if (span) span.textContent = 'Gestão de Agenda';
                    else btnStartBooking.textContent = 'Gestão de Agenda';
                }
                const previewSectionImmediate = document.getElementById('dashboard-preview-section');
                if (previewSectionImmediate) previewSectionImmediate.classList.remove('hidden');
            }

            const dashboardActionsImmediate = document.getElementById('dashboard-main-actions');
            if (dashboardActionsImmediate) dashboardActionsImmediate.classList.remove('hidden');

            // Deactivation check and full profile load run AFTER the UI is already visible
            (async () => {
                try {
                    const checkSnap = await getDoc(doc(db, "users", user.uid));
                    if (checkSnap.exists() && checkSnap.data().isDeactivated) {
                        await signOut(auth);
                        alert("A sua conta está desativada. Para reativá-la, por favor faça um novo registo com os mesmos dados.");
                        return;
                    }
                } catch(e) {
                    console.warn("Could not check deactivated status", e);
                }

                const userData = await loadUserProfile(user);

                // Check if user should be prompted to leave a review
                if (typeof checkReviewPrompt === 'function' && !isAdminEmail) {
                    checkReviewPrompt(user);
                }

                const isCompleted = !!userData?.profileCompleted;

                // Check for booking parameter and auto-trigger wizard for clients
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('booking') === 'true') {
                    if (!isAdminEmail && btnStartBooking) {
                        if (isCompleted) {
                            setTimeout(() => {
                                btnStartBooking.click();
                                const newUrl = window.location.pathname;
                                window.history.replaceState({}, document.title, newUrl);
                            }, 500);
                        } else {
                            sessionStorage.setItem('pendingBooking', 'true');
                            const newUrl = window.location.pathname;
                            window.history.replaceState({}, document.title, newUrl);
                        }
                    }
                }

                // Initialize Calendar System depending on Role and Profile Completion
                initCalendarMode(user, db, userData?.role, isCompleted);
            })();
        } else {
            // User is signed out
            localStorage.setItem('pm_is_logged_in', 'false');
            const pwaBtn = document.getElementById('pwa-install-btn');
            if (pwaBtn) pwaBtn.remove();

            console.log('User signed out');
            authCard.classList.remove('hidden');
            userDashboard.classList.add('hidden');
            // Reset wizard state
            const profileWizard = document.getElementById('profile-wizard');
            const dashboardActions = document.getElementById('dashboard-main-actions');
            if (profileWizard) profileWizard.classList.add('hidden');
            if (dashboardActions) dashboardActions.classList.remove('hidden');
        }
    });

    // Login Event
    // ===== Helper: show inline form error =====
    function showFormError(elementId, message) {
        const el = document.getElementById(elementId);
        if (!el) return;
        el.textContent = message;
        el.style.display = message ? 'block' : 'none';
    }

    // Login Event
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            showFormError('login-error', '');
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            if (!email || !password) {
                showFormError('login-error', 'Por favor, preencha o email e a palavra-passe.');
                return;
            }

            try {
                const loginBtn = document.getElementById('btn-login');
                if (loginBtn) {
                    loginBtn.disabled = true;
                    loginBtn.textContent = "A entrar...";
                }
                await signInWithEmailAndPassword(auth, email, password);
            } catch (error) {
                showFormError('login-error', translateError(error.code));
                const loginBtn = document.getElementById('btn-login');
                if (loginBtn) {
                    loginBtn.disabled = false;
                    loginBtn.textContent = "Entrar";
                }
            }
        });
    }

    // Register Event
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            showFormError('register-error', '');
            const name = document.getElementById('reg-name').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;
            const consentHealth = document.getElementById('reg-consent-health');
            const consentTerms = document.getElementById('reg-consent-terms');

            if (!name || !email || !password) {
                showFormError('register-error', 'Por favor, preencha todos os campos.');
                return;
            }
            if (consentHealth && !consentHealth.checked) {
                showFormError('register-error', 'Deve consentir o tratamento dos seus dados de saúde para continuar (Art. 9º RGPD).');
                return;
            }
            if (consentTerms && !consentTerms.checked) {
                showFormError('register-error', 'Deve aceitar os Termos e Condições para continuar.');
                return;
            }

            try {
                const registerBtn = document.getElementById('btn-register');
                if (registerBtn) {
                    registerBtn.disabled = true;
                    registerBtn.textContent = "A criar conta...";
                }
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Save additional user data to Firestore
                await setDoc(doc(db, "users", user.uid), {
                    name: name,
                    email: email,
                    role: "client",
                    profileCompleted: false,
                    isDeactivated: false,
                    consentHealthData: true,         // RGPD Art. 9 — explicit health data consent
                    consentHealthDataAt: new Date().toISOString(),
                    consentTerms: true,
                    consentTermsAt: new Date().toISOString(),
                    createdAt: new Date().toISOString()
                });
            } catch (error) {
                if (error.code === 'auth/email-already-in-use') {
                    try {
                        window.isReactivating = true;
                        const userCredential = await signInWithEmailAndPassword(auth, email, password);
                        const checkUser = userCredential.user;
                        const docRef = doc(db, "users", checkUser.uid);
                        const docSnap = await getDoc(docRef);
                        
                        if (docSnap.exists() && docSnap.data().isDeactivated) {
                            await updateDoc(docRef, { isDeactivated: false });
                            showFormError('register-error', 'A sua conta foi reativada com sucesso! Será redirecionado...');
                            window.location.reload();
                            return;
                        } else {
                            await signOut(auth);
                            window.isReactivating = false;
                            showFormError('register-error', 'Este email já está registado e a conta está ativa. Por favor, inicie sessão.');
                        }
                    } catch (loginErr) {
                        window.isReactivating = false;
                        showFormError('register-error', 'Este email já está registado. Se for o seu, inicie sessão ou recupere a palavra-passe.');
                    }
                } else {
                    showFormError('register-error', translateError(error.code));
                }
                const registerBtn = document.getElementById('btn-register');
                if (registerBtn) {
                    registerBtn.disabled = false;
                    registerBtn.textContent = "Criar Conta";
                }
            }
        });
    }

    // Forgot Password
    const forgotLink = document.querySelector('.forgot-link');
    if (forgotLink) {
        forgotLink.addEventListener('click', async (e) => {
            e.preventDefault();
            showFormError('login-error', '');
            const email = document.getElementById('login-email').value;
            if (!email) {
                showFormError('login-error', 'Por favor, introduza o seu email no campo acima primeiro.');
                return;
            }

            try {
                const actionCodeSettings = {
                    url: 'https://pmorais.pt/auth-action',
                    handleCodeInApp: false
                };
                await sendPasswordResetEmail(auth, email, actionCodeSettings);
                showFormError('login-error', '✅ Email de recuperação enviado! Verifique a sua caixa de entrada.');
            } catch (error) {
                showFormError('login-error', 'Erro ao enviar email: ' + translateError(error.code));
            }
        });
    }

    // Logout Event
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
            } catch (error) {
                console.error("Logout error:", error);
            }
        });
    }

    // Profile Wizard Logic
    const btnShowWizard = document.getElementById('btn-show-wizard');
    const btnCancelWizard = document.getElementById('btn-cancel-wizard');
    const profileWizard = document.getElementById('profile-wizard');
    const dashboardActions = document.getElementById('dashboard-main-actions');
    const dashboardPreviewSection = document.getElementById('dashboard-preview-section');
    const profileForm = document.getElementById('profile-form');

    if (btnShowWizard) {
        btnShowWizard.addEventListener('click', () => {
            profileWizard.classList.remove('hidden');
            dashboardActions.classList.add('hidden');
            
            const tutorialCheckbox = document.getElementById('prof-tutorial-seen');
            if (tutorialCheckbox) {
                const clientSeen = localStorage.getItem('pm_booking_tutorial_seen') === 'true';
                const adminSeen = localStorage.getItem('pm_admin_tutorial_seen') === 'true';
                tutorialCheckbox.checked = clientSeen || adminSeen;
            }

            const pwaTutorialCheckbox = document.getElementById('pwa-tutorial-seen');
            if (pwaTutorialCheckbox) {
                pwaTutorialCheckbox.checked = localStorage.getItem('pm_pwa_tutorial_dismissed') === 'true';
            }

            // Scroll to the wizard
            setTimeout(() => {
                profileWizard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        });
    }

    if (btnCancelWizard) {
        btnCancelWizard.addEventListener('click', () => {
            profileWizard.classList.add('hidden');
            dashboardActions.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    const btnDeactivateAccount = document.getElementById('btn-deactivate-account');
    if (btnDeactivateAccount) {
        btnDeactivateAccount.addEventListener('click', async () => {
            const confirmDeactivation = confirm("Tem a certeza que deseja desativar a sua conta? Não poderá iniciar sessão novamente até realizar um novo registo.");
            if (confirmDeactivation) {
                const user = auth.currentUser;
                if (user) {
                    try {
                        await updateDoc(doc(db, "users", user.uid), {
                            isDeactivated: true
                        });
                        alert("Conta desativada com sucesso.");
                        await signOut(auth);
                        window.location.reload();
                    } catch (error) {
                        console.error("Erro ao desativar conta:", error);
                        alert("Ocorreu um erro ao desativar a sua conta.");
                    }
                }
            }
        });
    }

    // Booking Wizard / Admin Manager Logic
    const btnStartBooking = document.getElementById('btn-start-booking');
    const bookingWizardSection = document.getElementById('booking-wizard-section');
    // (dashboardActions and dashboardPreviewSection already declared above)
    
    if (btnStartBooking) {
        btnStartBooking.addEventListener('click', () => {
            // Determine if admin by checking button
            const isAdmin = document.getElementById('btn-show-profiles') && !document.getElementById('btn-show-profiles').classList.contains('hidden');
            const targetSection = isAdmin ? document.getElementById('admin-calendar-section') : document.getElementById('booking-wizard-section');
            
            if (targetSection) targetSection.classList.remove('hidden');
            if (dashboardActions) dashboardActions.classList.add('hidden');
            if (dashboardPreviewSection) dashboardPreviewSection.classList.add('hidden');
            
            if (!isAdmin && window.goToStep) window.goToStep(1); // Reset wizard
            if (isAdmin && window.openAdminBookingWizard) window.openAdminBookingWizard();
            
            // Show tutorial for first-time client bookings
            if (!isAdmin && window.maybeShowBookingTutorial) {
                window.maybeShowBookingTutorial();
            }
            
            // Show tutorial for first-time admin agenda management
            if (isAdmin && window.maybeShowAdminTutorial) {
                window.maybeShowAdminTutorial();
            }
            
            setTimeout(() => {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        });
    }

    // Global function to close booking wizard
    window.closeBookingWizard = function() {
        // Refresh the page to ensure the dashboard data is updated
        location.reload();
    };

    if (profileForm) {
        // Handle conditional validation for Observations
        const healthIssuesSelect = document.getElementById('prof-health-issues');
        const physicalLimitsSelect = document.getElementById('prof-physical-limits');
        const birthdateInput = document.getElementById('prof-birthdate');
        const ageDisplay = document.getElementById('prof-age-display');
        const obsHint = document.getElementById('obs-hint');
        const obsLabel = document.getElementById('label-obs');

        const calculateAge = (birthday) => {
            const ageDifMs = Date.now() - new Date(birthday).getTime();
            const ageDate = new Date(ageDifMs);
            return Math.abs(ageDate.getUTCFullYear() - 1970);
        };

        if (birthdateInput) {
            birthdateInput.addEventListener('change', () => {
                if (birthdateInput.value) {
                    const age = calculateAge(birthdateInput.value);
                    ageDisplay.textContent = `(${age} anos)`;
                } else {
                    ageDisplay.textContent = "";
                }
            });
        }

        const phoneInput = document.getElementById('prof-phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                let value = e.target.value;
                if (!value.startsWith('+')) {
                    e.target.value = '+351 ' + value.replace(/^\D+/g, '');
                }
            });
        }

        const updateObsState = () => {
            const hasIssues = healthIssuesSelect.value === 'sim' || physicalLimitsSelect.value === 'sim';
            if (hasIssues) {
                obsLabel.textContent = "Observações *";
                obsHint.classList.remove('hidden');
            } else {
                obsLabel.textContent = "Observações";
                obsHint.classList.add('hidden');
            }
        };

        if (healthIssuesSelect) healthIssuesSelect.addEventListener('change', updateObsState);
        if (physicalLimitsSelect) physicalLimitsSelect.addEventListener('change', updateObsState);

        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = auth.currentUser;
            if (!user) return;

            const birthdate = birthdateInput.value;
            const age = birthdate ? calculateAge(birthdate) : null;
            const phone = document.getElementById('prof-phone').value;
            const weight = document.getElementById('prof-weight').value;
            const height = document.getElementById('prof-height').value;
            const fatMass = document.getElementById('prof-fat').value;
            const muscleMass = document.getElementById('prof-muscle').value;
            const healthIssues = healthIssuesSelect.value;
            const physicalLimits = physicalLimitsSelect.value;
            const observations = document.getElementById('prof-obs').value;

            // Mandatory Validation
            if (!birthdate || !weight || !height || !healthIssues || !physicalLimits) {
                alert("Por favor, preencha todos os campos obrigatórios (*)");
                return;
            }

            // Conditional Validation for Observations
            if ((healthIssues === 'sim' || physicalLimits === 'sim') && !observations.trim()) {
                alert("Por favor, descreva os seus problemas de saúde o limitações nas Observações.");
                document.getElementById('prof-obs').focus();
                return;
            }

            const tutorialCheckbox = document.getElementById('prof-tutorial-seen');
            if (tutorialCheckbox) {
                if (tutorialCheckbox.checked) {
                    localStorage.setItem('pm_booking_tutorial_seen', 'true');
                    localStorage.setItem('pm_admin_tutorial_seen', 'true');
                } else {
                    localStorage.removeItem('pm_booking_tutorial_seen');
                    localStorage.removeItem('pm_admin_tutorial_seen');
                }
            }

            const pwaTutorialCheckbox = document.getElementById('pwa-tutorial-seen');
            if (pwaTutorialCheckbox) {
                if (pwaTutorialCheckbox.checked) {
                    localStorage.setItem('pm_pwa_tutorial_dismissed', 'true');
                } else {
                    localStorage.removeItem('pm_pwa_tutorial_dismissed');
                }
            }

            try {
                await setDoc(doc(db, "users", user.uid), {
                    birthdate,
                    age,
                    phone,
                    weight,
                    height,
                    fatMass,
                    muscleMass,
                    healthIssues,
                    physicalLimits,
                    observations,
                    profileCompleted: true,
                    updatedAt: new Date().toISOString()
                }, { merge: true });

                alert("Perfil actualizado com sucesso!");
                const updatedData = await loadUserProfile(user);
                // Refresh calendar state
                initCalendarMode(user, db, updatedData?.role, updatedData?.profileCompleted);
                window.scrollTo({ top: 0, behavior: 'smooth' });

                if (sessionStorage.getItem('pendingBooking') === 'true') {
                    sessionStorage.removeItem('pendingBooking');
                    const btnStartBooking = document.getElementById('btn-start-booking');
                    if (btnStartBooking) {
                        setTimeout(() => {
                            btnStartBooking.click();
                        }, 500);
                    }
                }
            } catch (error) {
                console.error("Error updating profile:", error);
                alert("Erro ao actualizar o perfil.");
            }
        });

        // Initialize tutorial checkbox on load
        const tutorialCheckbox = document.getElementById('prof-tutorial-seen');
        if (tutorialCheckbox) {
            const clientSeen = localStorage.getItem('pm_booking_tutorial_seen') === 'true';
            const adminSeen = localStorage.getItem('pm_admin_tutorial_seen') === 'true';
            // Mark checked if EITHER one is seen (handles both roles intuitively)
            tutorialCheckbox.checked = clientSeen || adminSeen;
        }

        const pwaTutorialCheckbox = document.getElementById('pwa-tutorial-seen');
        if (pwaTutorialCheckbox) {
            pwaTutorialCheckbox.checked = localStorage.getItem('pm_pwa_tutorial_dismissed') === 'true';
        }
    }
});

async function loadUserProfile(user) {
    const userWelcome = document.getElementById('user-welcome');
    
    // Form fields - fetch them inside to ensure they are current
    const profName = document.getElementById('prof-name');
    const profEmail = document.getElementById('prof-email');
    const profBirthdate = document.getElementById('prof-birthdate');
    const profAgeDisplay = document.getElementById('prof-age-display');
    const profPhone = document.getElementById('prof-phone');
    const profWeight = document.getElementById('prof-weight');
    const profHeight = document.getElementById('prof-height');
    const profFat = document.getElementById('prof-fat');
    const profMuscle = document.getElementById('prof-muscle');
    const profHealth = document.getElementById('prof-health-issues');
    const profPhysical = document.getElementById('prof-physical-limits');
    const profObs = document.getElementById('prof-obs');
    const obsLabel = document.getElementById('label-obs');
    const obsHint = document.getElementById('obs-hint');

    const calculateAge = (birthday) => {
        const ageDifMs = Date.now() - new Date(birthday).getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    // Preliminary population from Auth object (faster)
    if (profEmail) profEmail.value = user.email || "";
    if (profName && user.displayName) profName.value = user.displayName;

    if (userWelcome) {
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                userWelcome.textContent = `Olá, ${data.name || user.displayName || user.email}!`;

                // Populate Fields from Firestore (Source of truth)
                if (profName) profName.value = data.name || user.displayName || "";
                if (profEmail) profEmail.value = data.email || user.email || "";
                
                if (profBirthdate && data.birthdate) {
                    profBirthdate.value = data.birthdate;
                    // Update age display
                    if (profAgeDisplay) {
                        const age = calculateAge(data.birthdate);
                        profAgeDisplay.textContent = `(${age} anos)`;
                    }
                    // If profile is already completed, lock the birthdate
                    if (data.profileCompleted) {
                        profBirthdate.readOnly = true;
                    }
                }
                
                if (profPhone && data.phone) profPhone.value = data.phone;
                if (profWeight && data.weight) profWeight.value = data.weight;
                if (profHeight && data.height) profHeight.value = data.height;
                if (profFat && data.fatMass) profFat.value = data.fatMass;
                if (profMuscle && data.muscleMass) profMuscle.value = data.muscleMass;
                if (profHealth && data.healthIssues) profHealth.value = data.healthIssues;
                if (profPhysical && data.physicalLimits) profPhysical.value = data.physicalLimits;
                if (profObs && data.observations) profObs.value = data.observations;

                // Update observation hint after loading
                if (obsLabel && obsHint) {
                    const hasIssues = data.healthIssues === 'sim' || data.physicalLimits === 'sim';
                    if (hasIssues) {
                        obsLabel.textContent = "Observações *";
                        obsHint.classList.remove('hidden');
                    }
                }

                const calendarSection = document.getElementById('calendar-section');
                const adminCalendarSection = document.getElementById('admin-calendar-section');
                const dashboardActions = document.getElementById('dashboard-main-actions');
                const profileWizard = document.getElementById('profile-wizard');
                const cancelWizardBtn = document.getElementById('btn-cancel-wizard');

                const btnShowProfiles = document.getElementById('btn-show-profiles');
                const btnShowForms = document.getElementById('btn-show-forms');
                const userEmail = user.email ? user.email.toLowerCase().trim() : "no-email";
                const isAdminEmail = userEmail === "pt@pmorais.pt";
                const isAdmin = (data && data.role && data.role.toLowerCase() === 'admin') || isAdminEmail;

                console.log("CRITICAL ADMIN CHECK", { 
                    rawEmail: user.email,
                    processedEmail: "[" + userEmail + "]", 
                    isAdminEmail, 
                    isAdmin,
                    firestoreRole: data?.role 
                });

                if (isAdmin) {
                    // AUTO-FIX: Ensure Paulo has the admin role in Firestore if he's the owner
                    if (data.role !== 'admin' && isAdminEmail) {
                        // Non-blocking auto-fix
                        setDoc(doc(db, "users", user.uid), { role: 'admin' }, { merge: true })
                            .then(() => console.log("Admin role auto-fixed for Paulo in Firestore."))
                            .catch(e => console.warn("Could not auto-fix admin role. Possibly rules restricted.", e));
                    }

                    if (calendarSection) calendarSection.classList.add('hidden');
                    if (adminCalendarSection) adminCalendarSection.classList.add('hidden'); // HIDDEN by default now, shown via button
                    if (dashboardActions) dashboardActions.classList.remove('hidden');
                    if (profileWizard) profileWizard.classList.add('hidden');
                    if (btnShowProfiles) {
                        btnShowProfiles.classList.remove('hidden');
                        btnShowProfiles.onclick = () => window.location.href = 'perfis.html';
                    }
                    if (btnShowForms) {
                        btnShowForms.classList.remove('hidden');
                        btnShowForms.onclick = () => window.location.href = 'formulario.html';
                    }
                    
                    const btnStartBooking = document.getElementById('btn-start-booking');
                    if (btnStartBooking) btnStartBooking.innerHTML = '<i data-lucide="calendar"></i> <span class="btn-text">Gestão da Agenda</span>';
                    
                    // Robust admin dashboard preview — catch errors so section stays visible
                    try {
                        await loadDashboardPreview(true, user, data);
                    } catch (previewError) {
                        console.error("Error loading admin dashboard preview:", previewError);
                        const fallbackList = document.getElementById('preview-list');
                        const fallbackSection = document.getElementById('dashboard-preview-section');
                        if (fallbackSection) fallbackSection.classList.remove('hidden');
                        if (fallbackList) fallbackList.innerHTML = '<p class="color-text-dim text-center" style="padding: 20px; margin: 0;">Erro ao carregar dados da agenda. Tente recarregar a página.</p>';
                    }
                    
                } else if (data.profileCompleted) {
                    if (calendarSection) calendarSection.classList.add('hidden');
                    if (adminCalendarSection) adminCalendarSection.classList.add('hidden');
                    if (dashboardActions) dashboardActions.classList.remove('hidden');
                    if (profileWizard) profileWizard.classList.add('hidden');
                    if (cancelWizardBtn) cancelWizardBtn.classList.remove('hidden');
                    
                    loadDashboardPreview(false, user, data);
                } else {
                    // Profile NOT completed and is client
                    if (calendarSection) calendarSection.classList.add('hidden');
                    if (adminCalendarSection) adminCalendarSection.classList.add('hidden');
                    if (dashboardActions) dashboardActions.classList.add('hidden');
                    if (profileWizard) profileWizard.classList.remove('hidden');
                    if (cancelWizardBtn) cancelWizardBtn.classList.add('hidden'); // Hide cancel if mandatory
                    
                    const previewSection = document.getElementById('dashboard-preview-section');
                    if (previewSection) previewSection.classList.add('hidden');
                }

                // If profile is already completed, change button text
                const btnShowWizard = document.getElementById('btn-show-wizard');
                if (data.profileCompleted && btnShowWizard) {
                    const wizardText = btnShowWizard.querySelector('.btn-text');
                    if (wizardText) {
                        wizardText.textContent = 'Editar Perfil';
                    } else {
                        btnShowWizard.textContent = 'Editar Perfil';
                    }
                }
                return data;
            } else {
                console.log("No user document found. Checking if admin...");
                const ADMIN_EMAIL_CHECK = "pt@pmorais.pt";
                const userEmailLower = user.email ? user.email.toLowerCase().trim() : "";
                
                if (userEmailLower === ADMIN_EMAIL_CHECK.toLowerCase()) {
                    // Admin with no Firestore doc yet — create it and show dashboard
                    console.log("Admin with no doc - creating and showing dashboard");
                    userWelcome.textContent = `Olá, Paulo!`;
                    
                    const dashboardActionsEl = document.getElementById('dashboard-main-actions');
                    const profileWizardEl = document.getElementById('profile-wizard');
                    if (dashboardActionsEl) dashboardActionsEl.classList.remove('hidden');
                    if (profileWizardEl) profileWizardEl.classList.add('hidden');

                    const btnShowProfiles = document.getElementById('btn-show-profiles');
                    const btnShowForms = document.getElementById('btn-show-forms');
                    if (btnShowProfiles) { btnShowProfiles.classList.remove('hidden'); btnShowProfiles.onclick = () => window.location.href = 'perfis.html'; }
                    if (btnShowForms) { btnShowForms.classList.remove('hidden'); btnShowForms.onclick = () => window.location.href = 'formulario.html'; }
                    
                    // Create minimal admin doc
                    try {
                        await setDoc(doc(db, "users", user.uid), { name: "Paulo Morais", email: user.email, role: 'admin', profileCompleted: true, createdAt: new Date().toISOString() });
                    } catch(e) { console.warn("Could not create admin doc", e); }
                    
                    // Robust admin dashboard preview for no-doc case
                    try {
                        await loadDashboardPreview(true, user, { role: 'admin', profileCompleted: true });
                    } catch (previewError) {
                        console.error("Error loading admin preview (no-doc):", previewError);
                        const fallbackList = document.getElementById('preview-list');
                        const fallbackSection = document.getElementById('dashboard-preview-section');
                        if (fallbackSection) fallbackSection.classList.remove('hidden');
                        if (fallbackList) fallbackList.innerHTML = '<p class="color-text-dim text-center" style="padding: 20px; margin: 0;">Erro ao carregar dados da agenda.</p>';
                    }
                    return { role: 'admin', profileCompleted: true };
                }
                
                // Regular client with no doc — show profile wizard
                userWelcome.textContent = `Olá, ${user.displayName || user.email}!`;
                if (profName && user.displayName) profName.value = user.displayName;
                if (profEmail) profEmail.value = user.email || "";

                const calendarSection = document.getElementById('calendar-section');
                const adminCalendarSection = document.getElementById('admin-calendar-section');
                const dashboardActions = document.getElementById('dashboard-main-actions');
                const profileWizard = document.getElementById('profile-wizard');
                const cancelWizardBtn = document.getElementById('btn-cancel-wizard');

                if (calendarSection) calendarSection.classList.add('hidden');
                if (adminCalendarSection) adminCalendarSection.classList.add('hidden');
                if (dashboardActions) dashboardActions.classList.add('hidden');
                if (profileWizard) profileWizard.classList.remove('hidden');
                if (cancelWizardBtn) cancelWizardBtn.classList.add('hidden');
                return null;
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            // Even on error, ensure admin preview stays visible if admin was detected
            const userEmailFallback = user.email ? user.email.toLowerCase().trim() : "";
            if (userEmailFallback === "pt@pmorais.pt") {
                console.log("Firestore error but admin detected — keeping preview visible");
                const fallbackSection = document.getElementById('dashboard-preview-section');
                const fallbackActions = document.getElementById('dashboard-main-actions');
                if (fallbackSection) fallbackSection.classList.remove('hidden');
                if (fallbackActions) fallbackActions.classList.remove('hidden');
                const fallbackList = document.getElementById('preview-list');
                if (fallbackList) fallbackList.innerHTML = '<p class="color-text-dim text-center" style="padding: 20px; margin: 0;">Erro de conexão à base de dados. Tente recarregar.</p>';
            }
            return null;
        }
    }
    return null;
}

// Error Message Translation Helper
function translateError(code) {
    switch (code) {
        case 'auth/user-not-found':
            return 'Utilizador não encontrado. Verifique o email.';
        case 'auth/wrong-password':
            return 'Palavra-passe incorrecta.';
        case 'auth/invalid-credential':
            return 'Email ou palavra-passe incorretos.';
        case 'auth/email-already-in-use':
            return 'Este email já está a ser utilizado.';
        case 'auth/invalid-email':
            return 'Email inválido.';
        case 'auth/weak-password':
            return 'A palavra-passe é demasiado fraca (mínimo 6 caracteres).';
        case 'auth/popup-closed-by-user':
            return 'A janela de login foi fechada antes de completar o processo.';
        default:
            return 'Ocorreu um erro inesperado. Tente novamente.';
    }
}

// --- ADMIN WIZARD FIREBASE HOOKS --- //
window.saveAdminWizardSchedule = async function(slotsMap, weekId) {
    try {
        const docRef = doc(db, "weekly_schedules", weekId);
        
        // Preserve existing bookings!
        const existingSnap = await getDoc(docRef);
        if (existingSnap.exists()) {
            const existingData = existingSnap.data();
            Object.keys(existingData.slots || {}).forEach(k => {
                const existingSlot = existingData.slots[k];
                // Preserve personal bookings
                if (existingSlot.status === 'booked') {
                    slotsMap[k] = existingSlot;
                }
                // Preserve group bookings that have users
                if (existingSlot.serviceType === 'grupal' && existingSlot.bookedUsers && existingSlot.bookedUsers.length > 0) {
                    slotsMap[k] = existingSlot;
                }
            });
        }
        
        await setDoc(docRef, {
            publishedDate: new Date().toISOString(),
            publishedByAdmin: true,
            slots: slotsMap
        }, { merge: true });
        
        alert("Semana publicada com sucesso no sistema!");
        window.location.reload();
    } catch (e) {
        console.error("Erro ao guardar na base de dados:", e);
        alert("Erro ao publicar: " + e.message);
    }
};

window.resendWeeklyBroadcast = async function(weekId) {
    try {
        const docRef = doc(db, "weekly_schedules", weekId);
        await updateDoc(docRef, {
            forceBroadcast: serverTimestamp()
        });
        alert("Aviso de agenda reenviado com sucesso!");
    } catch (e) {
        console.error("Erro ao reenviar aviso:", e);
        alert("Ocorreu um erro ao reenviar o aviso.");
    }
};

window.loadAdminWizardSchedule = async function(weekId, callback) {
    try {
        const docRef = doc(db, "weekly_schedules", weekId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data();
            callback(data.slots || {}, data.publishedByAdmin === true);
        } else {
            callback({}, false);
        }
    } catch (e) {
        console.error("Erro ao carregar dados:", e);
        callback({}, false);
    }
};

window.submitWizardBooking = async function(payload, durationSlots) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");
        
        // Fetch user profile name as priority fallback
        let realName = payload.clientName || user.displayName;
        if (!realName) {
            try {
                const userProfile = await getDoc(doc(db, "users", user.uid));
                if (userProfile.exists()) {
                    realName = userProfile.data().name;
                }
            } catch (e) {
                console.warn("Could not fetch user profile name:", e);
            }
        }
        if (!realName) realName = user.email; // Final fallback
        
        // Group selections by weekId
        const weeks = {};
        payload.selections.forEach(sel => {
            const dateObj = new Date(sel.isoDate);
            const dayOfWeek = dateObj.getDay();
            dateObj.setDate(dateObj.getDate() - dayOfWeek);
            const weekYear = dateObj.getFullYear();
            const weekMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
            const weekDay = String(dateObj.getDate()).padStart(2, '0');
            const weekId = `${weekYear}-${weekMonth}-${weekDay}`;
            
            if (!weeks[weekId]) weeks[weekId] = [];
            weeks[weekId].push(sel);
        });
        
        const historyToAdd = [];
        
        // Process each week
        for (const weekId of Object.keys(weeks)) {
            const docRef = doc(db, "weekly_schedules", weekId);
            const snap = await getDoc(docRef);
            let slots = snap.exists() ? (snap.data().slots || {}) : {};
            
            // Build nested slots object for proper Firestore structure
            const slotsToMerge = {};
            
            for (const sel of weeks[weekId]) {
                const baseTimeStr = sel.time;
                const [hStr, mStr] = baseTimeStr.split(':');
                let h = parseInt(hStr);
                let m = parseInt(mStr);
                
                let groupFull = false;
                
                for (let i = 0; i < durationSlots; i++) {
                    const timeStr = `${h.toString().padStart(2,'0')}:${m === 0 ? '00' : '30'}`;
                    const slotId = `${sel.isoDate}T${timeStr}`;
                    
                    const existingSlot = slots[slotId] || {};
                    
                    // Check if user already has a booking in this slot (prevent double-booking)
                    if (existingSlot.status === 'booked' && existingSlot.bookedBy === user.uid) {
                        throw new Error(`Já tem uma reserva às ${timeStr} no dia ${sel.dateStr}. Não é possível reservar dois serviços na mesma hora.`);
                    }
                    
                    if (payload.modality === 'tr_online') {
                        // Online is group based
                        const users = existingSlot.bookedUsers || [];
                        if (users.length >= 10) {
                            groupFull = true;
                            break;
                        }
                        
                        // Check if user is already in this group slot
                        if (users.some(u => u.uid === user.uid)) {
                            throw new Error(`Já está inscrito na aula online às ${timeStr} no dia ${sel.dateStr}.`);
                        }
                        
                        // Add this user
                        const newUsers = [...users];
                        newUsers.push({ uid: user.uid, name: realName });
                        
                        slotsToMerge[slotId] = {
                            status: 'booked',
                            serviceType: 'grupal',
                            bookedUsers: newUsers,
                            bookedCount: newUsers.length,
                            clientNotes: payload.notes || ''
                        };
                    } else {
                        // Personal or Osteopatia
                        if (existingSlot.status === 'booked' || existingSlot.status === 'blocked') {
                            throw new Error(`Slot de ${sel.dateStr} às ${timeStr} já não está disponível.`);
                        }
                        
                        let sType = 'treino_personalizado';
                        if (payload.category === 'osteopatia') sType = 'osteopatia';
                        
                        slotsToMerge[slotId] = {
                            status: 'booked',
                            serviceType: sType,
                            bookedBy: user.uid,
                            bookedName: realName,
                            clientNotes: payload.notes || ''
                        };
                    }
                    
                    // Increment 30 mins
                    m += 30;
                    if (m >= 60) {
                        h += 1;
                        m = 0;
                    }
                }
                
                if (groupFull) throw new Error(`A aula online de ${sel.dateStr} às ${sel.time} já está cheia.`);
                
                // Add to history list
                let sType = payload.category === 'osteopatia' ? 'osteopatia' : 'treino';
                if (payload.modality === 'tr_online') sType = 'grupal';
                
                historyToAdd.push({
                    id: `bk_${Date.now()}_${Math.floor(Math.random()*10000)}`,
                    date: sel.isoDate,
                    time: sel.time,
                    serviceType: sType,
                    serviceName: payload.serviceName,
                    bookedName: realName,
                    status: 'booked',
                    clientNotes: payload.notes || '',
                    createdAt: new Date().toISOString()
                });
            }
            
            // Save week updates using proper nested structure
            if (Object.keys(slotsToMerge).length > 0) {
                await setDoc(docRef, { slots: slotsToMerge }, { merge: true });
            }
        }
        
        // Save to user booking history in weekly_schedules collection
        const bookingDocRef = doc(db, "weekly_schedules", `user_${user.uid}`);
        const bookingSnap = await getDoc(bookingDocRef);
        const existingBookings = bookingSnap.exists() ? (bookingSnap.data().bookings || []) : [];
        
        historyToAdd.forEach(h => existingBookings.push(h));
        
        const safePayload = JSON.parse(JSON.stringify({
            uid: user.uid,
            name: realName || "Utilizador",
            email: user.email || "",
            bookings: existingBookings
        }));
        await setDoc(bookingDocRef, safePayload, { merge: true });
        
        return true;
    } catch (e) {
        console.error("Booking error:", e);
        throw e;
    }
};

window.cancelClientBooking = async function(bookingId, isoDate, startTime, serviceType) {
    if (!confirm("Tem a certeza que pretende desmarcar esta sessão?")) return;

    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Não autenticado");

        // 1. Calculate duration slots
        let durationSlots = 1;
        if (serviceType === 'osteopatia') durationSlots = 2;
        if (serviceType === 'grupal' || serviceType === 'treino_grupo' || serviceType === 'treino_online' || serviceType === 'online') durationSlots = 2;
        if (serviceType === 'treino') durationSlots = 2; // All treinos are now 60 min

        // 2. Calculate weekId
        const dateObj = new Date(isoDate);
        const dayOfWeek = dateObj.getDay();
        dateObj.setDate(dateObj.getDate() - dayOfWeek);
        const weekYear = dateObj.getFullYear();
        const weekMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
        const weekDay = String(dateObj.getDate()).padStart(2, '0');
        const weekId = `${weekYear}-${weekMonth}-${weekDay}`;

        // 3. Update global weekly_schedules/{weekId}
        const docRef = doc(db, "weekly_schedules", weekId);
        const snap = await getDoc(docRef);
        let slotsToMerge = {};

        if (snap.exists()) {
            const currentSlots = snap.data().slots || {};
            let [hStr, mStr] = startTime.split(':');
            let h = parseInt(hStr);
            let m = parseInt(mStr);

            for (let i = 0; i < durationSlots; i++) {
                const timeStr = `${h.toString().padStart(2,'0')}:${m === 0 ? '00' : '30'}`;
                const slotId = `${isoDate}T${timeStr}`;

                if (currentSlots[slotId]) {
                    if (serviceType === 'grupal' || serviceType === 'treino_grupo' || serviceType === 'treino_online' || serviceType === 'online') {
                        // Remove user from bookedUsers
                        const users = currentSlots[slotId].bookedUsers || [];
                        const newUsers = users.filter(u => u.uid !== user.uid);
                        
                        if (newUsers.length === 0) {
                            slotsToMerge[slotId] = {
                                status: 'available',
                                serviceType: 'available',
                                bookedUsers: [],
                                bookedCount: 0
                            };
                        } else {
                            slotsToMerge[slotId] = {
                                status: 'booked',
                                serviceType: 'grupal',
                                bookedUsers: newUsers,
                                bookedCount: newUsers.length
                            };
                        }
                    } else {
                        // For personal/osteo, free the slot completely
                        slotsToMerge[slotId] = {
                            status: 'available',
                            serviceType: 'available',
                            bookedBy: null,
                            bookedName: null
                        };
                    }
                }

                m += 30;
                if (m >= 60) {
                    h += 1;
                    m = 0;
                }
            }
            if (Object.keys(slotsToMerge).length > 0) {
                await setDoc(docRef, { slots: slotsToMerge }, { merge: true });
            }
        }

        // 4. Update user's personal booking list in weekly_schedules/user_{uid}
        const bookingDocRef = doc(db, "weekly_schedules", `user_${user.uid}`);
        const bookingSnap = await getDoc(bookingDocRef);
        if (bookingSnap.exists()) {
            let userBookings = bookingSnap.data().bookings || [];
            for (let b of userBookings) {
                if (b.id === bookingId) {
                    b.status = 'cancelled';
                    b.updatedAt = new Date().toISOString();
                }
            }
            await setDoc(bookingDocRef, { bookings: userBookings }, { merge: true });
        }

        alert("Sessão desmarcada com sucesso.");
        // Refresh UI
        window.location.reload();

    } catch (e) {
        console.error("Cancel booking error:", e);
        alert("Erro ao desmarcar sessão: " + e.message);
    }
};

async function loadDashboardPreview(isAdmin, user, data) {
    console.log("--- DASHBOARD PREVIEW START ---");
    console.log("isAdmin parameter:", isAdmin);
    console.log("User email:", user.email);
    console.log("Firestore Data:", data);
    const listEl = document.getElementById('preview-list');
    const titleEl = document.getElementById('preview-title');
    const previewSection = document.getElementById('dashboard-preview-section');
    const userDashboard = document.getElementById('user-dashboard');
    
    if (!listEl || !previewSection) {
        console.error("Critical dashboard elements missing");
        return;
    }
    
    // Ensure dashboard is visible
    if (userDashboard) userDashboard.classList.remove('hidden');
    previewSection.classList.remove('hidden');
    listEl.innerHTML = '<p class="color-text-dim text-center" style="padding: 20px; margin: 0;">A carregar dados...</p>';
    
    if (!isAdmin) {
        if (titleEl) {
            titleEl.textContent = "As Suas Próximas Sessões";
            titleEl.className = "preview-title";
        }
        
        // Read bookings from weekly_schedules/user_{uid}
        let userBookings = [];
        try {
            const bookingDocRef = doc(db, "weekly_schedules", `user_${user.uid}`);
            const bookingSnap = await getDoc(bookingDocRef);
            if (bookingSnap.exists()) {
                userBookings = bookingSnap.data().bookings || [];
            }
        } catch (e) {
            console.warn("Could not load user bookings from weekly_schedules:", e);
        }
        
        const now = new Date();
        now.setHours(0,0,0,0);
        
        const upcoming = userBookings.filter(h => {
            if (!h.date) return false;
            const bDate = new Date(h.date);
            return bDate >= now && h.status === 'booked';
        }).sort((a,b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
        
        if (upcoming.length === 0) {
            listEl.innerHTML = `
                <p class="color-text-dim text-center" style="padding: 20px; margin: 0;">Sem sessões agendadas para breve.</p>
            `;
            return;
        }
        
        listEl.innerHTML = '';
        upcoming.forEach(b => {
            const item = document.createElement('div');
            item.className = 'preview-item';
            
            let sName = 'Treino';
            let sClass = 'badge-treino';
            if (b.serviceType === 'grupal' || b.serviceType === 'treino_grupo') { sName = 'Online'; sClass = 'badge-grupal'; }
            if (b.serviceType === 'osteopatia') { sName = 'Osteopatia'; sClass = 'badge-osteo'; }
            if (b.serviceType === 'treino_online' || b.serviceType === 'online') { sName = 'Online'; sClass = 'badge-online'; }
            
            item.innerHTML = `
                <div class="preview-item-info">
                    <strong>${b.date}</strong>
                    <span>às ${b.time}</span>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 5px;">
                    <div class="preview-badge ${sClass}">
                        ${sName}
                    </div>
                    <button class="btn btn-sm btn-outline" style="padding: 2px 8px; font-size: 0.75rem;" onclick="window.cancelClientBooking('${b.id}', '${b.date}', '${b.time}', '${b.serviceType}')">Cancelar</button>
                </div>
            `;
            listEl.appendChild(item);
        });
        
    } else {
        // ------ ADMIN BRANCH — Read from all user booking docs ------
        if (titleEl) {
            titleEl.innerHTML = '<i data-lucide="calendar-days" style="width:18px;height:18px;"></i><span>Próximos Clientes</span>';
            titleEl.style.display = 'flex';
            titleEl.style.alignItems = 'center';
            titleEl.style.gap = '8px';
        }

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        try {
            // Read ALL documents from weekly_schedules collection
            const allDocs = await getDocs(collection(db, "weekly_schedules"));
            const upcomingAdmin = [];

            allDocs.forEach(docSnap => {
                // Only process user booking documents (ID starts with "user_")
                if (!docSnap.id.startsWith('user_')) return;
                
                const data = docSnap.data();
                const bookings = data.bookings || [];
                
                bookings.forEach(b => {
                    if (!b.date || b.status !== 'booked') return;
                    const bDate = new Date(b.date);
                    if (bDate < now) return; // Skip past bookings
                    
                    upcomingAdmin.push({
                        name: b.bookedName || data.name || data.email || 'Cliente',
                        date: b.date,
                        time: b.time || '---',
                        type: b.serviceType
                    });
                });
            });

            // Sort by date and time
            upcomingAdmin.sort((a, b) => {
                const dtA = new Date(`${a.date}T${a.time || '00:00'}`);
                const dtB = new Date(`${b.date}T${b.time || '00:00'}`);
                return dtA - dtB;
            });

            if (upcomingAdmin.length === 0) {
                listEl.innerHTML = '<p class="color-text-dim text-center" style="padding: 20px; margin: 0;">Sem clientes agendados para breve.</p>';
            } else {
                listEl.innerHTML = '';
                upcomingAdmin.forEach(b => {
                    const item = document.createElement('div');
                    item.className = 'preview-item';
                    
                    let sName = 'Treino';
                    let sClass = 'badge-treino';
                    if (b.type === 'grupal') { sName = 'Online'; sClass = 'badge-grupal'; }
                    if (b.type === 'osteopatia') { sName = 'Osteopatia'; sClass = 'badge-osteo'; }

                    // Format date for display (YYYY-MM-DD → DD/MM)
                    let dateDisplay = b.date;
                    if (b.date && b.date.includes('-')) {
                        const [, mm, dd] = b.date.split('-');
                        dateDisplay = `${dd}/${mm}`;
                    }

                    item.innerHTML = `
                        <div class="preview-item-info">
                            <div style="display:flex; flex-direction:column;">
                                <strong style="color:var(--color-primary);">${b.name}</strong>
                                <span style="font-size:0.8rem; color:var(--color-text-dim);">${dateDisplay} às ${b.time}</span>
                            </div>
                        </div>
                        <div class="preview-badge ${sClass}">
                            ${sName}
                        </div>
                    `;
                    listEl.appendChild(item);
                });
            }
        } catch (e) {
            console.error("Error loading admin list:", e);
            listEl.innerHTML = `<p style="color:#c00; text-align:center; padding:20px;">Erro ao carregar lista.</p>`;
        }
    }
    
    if (window.lucide) window.lucide.createIcons();
}

// ==========================================
// ====== REVIEWS SYSTEM (CLIENT & ADMIN) ===
// ==========================================

let currentReviewTab = 'treino';
let newReviewRating = 5;

function initializeReviewEvents() {
    // Star rating interaction
    const stars = document.querySelectorAll('#new-review-rating i');
    stars.forEach(star => {
        star.addEventListener('click', (e) => {
            const val = parseInt(e.currentTarget.getAttribute('data-val'));
            newReviewRating = val;
            updateStarsUI();
        });
    });
}

function updateStarsUI() {
    const stars = document.querySelectorAll('#new-review-rating i');
    stars.forEach(star => {
        const val = parseInt(star.getAttribute('data-val'));
        if (val <= newReviewRating) {
            star.style.color = '#E6AE17';
            star.style.fill = '#E6AE17';
        } else {
            star.style.color = '#ddd';
            star.style.fill = 'none';
        }
    });
}

window.closeReviews = function() {
    document.getElementById('client-reviews-section').classList.add('hidden');
    document.getElementById('admin-reviews-section').classList.add('hidden');
    document.getElementById('dashboard-main-actions').classList.remove('hidden');
    const previewSection = document.getElementById('dashboard-preview-section');
    if (previewSection) previewSection.classList.remove('hidden');
};

// Open client reviews panel
window.openClientReviews = function() {
    hideAllDashboardSections();
    const section = document.getElementById('client-reviews-section');
    if (section) section.classList.remove('hidden');
    window.switchReviewTab('treino');
};

// Open admin reviews panel
window.openAdminReviews = function() {
    hideAllDashboardSections();
    const section = document.getElementById('admin-reviews-section');
    if (section) {
        section.classList.remove('hidden');
        window.loadAdminReviews('treino');
    }
};

// Back to lobby
window.backToLobby = function() {
    hideAllDashboardSections();
    const actions = document.getElementById('dashboard-main-actions');
    if (actions) actions.classList.remove('hidden');
    const preview = document.getElementById('dashboard-preview-section');
    if (preview) preview.classList.remove('hidden');
};

window.switchReviewTab = function(service) {
    currentReviewTab = service;
    const isPt = document.documentElement.lang !== 'en';

    // Update segmented control UI
    const tabTreino = document.getElementById('tab-review-treino');
    const tabOsteo = document.getElementById('tab-review-osteo');
    if (tabTreino) tabTreino.classList.toggle('active', service === 'treino');
    if (tabOsteo) tabOsteo.classList.toggle('active', service === 'osteopatia');

    // Update form title
    const serviceNameEl = document.getElementById('review-service-name');
    if (serviceNameEl) {
        serviceNameEl.textContent = service === 'treino'
            ? (isPt ? 'Treino' : 'Personal Training')
            : (isPt ? 'Osteopatia' : 'Osteopathy');
    }

    // Reset form
    const textEl = document.getElementById('new-review-text');
    if (textEl) textEl.value = '';
    newReviewRating = 5;
    updateStarsUI();
    const msgEl = document.getElementById('review-feedback-msg');
    if (msgEl) msgEl.textContent = '';

    window.loadMyReviews(service);
};

window.submitReview = async function() {
    const text = document.getElementById('new-review-text').value.trim();
    const msgDiv = document.getElementById('review-feedback-msg');
    const isPt = document.documentElement.lang !== 'en';
    
    if (!text) {
        msgDiv.style.color = '#ff3b30';
        msgDiv.textContent = isPt ? 'Por favor, escreva a sua avaliação.' : 'Please write your review.';
        return;
    }
    
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        const btn = document.getElementById('btn-submit-review');
        btn.disabled = true;
        btn.textContent = isPt ? 'A submeter...' : 'Submitting...';
        
        let userName = "Anónimo";
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                userName = userDoc.data().name || user.displayName || "Anónimo";
            }
        } catch(e){}
        
        const reviewData = {
            userId: user.uid,
            userName: userName,
            text: text,
            rating: newReviewRating,
            service: currentReviewTab,
            timestamp: new Date().toISOString()
        };
        
        await addDoc(collection(db, "reviews"), reviewData);
        
        msgDiv.style.color = '#34c759';
        msgDiv.textContent = isPt ? 'Avaliação submetida com sucesso! Obrigado.' : 'Review submitted successfully! Thank you.';
        document.getElementById('new-review-text').value = '';
        
        // Remove the red badge if they submitted a review
        const badge = document.getElementById('reviews-badge');
        if (badge) badge.classList.add('hidden');
        
        loadMyReviews(currentReviewTab);
        
        setTimeout(() => {
            btn.disabled = false;
            btn.textContent = isPt ? 'Submeter Avaliação' : 'Submit Review';
            msgDiv.textContent = '';
        }, 3000);
        
    } catch (error) {
        console.error("Error submitting review:", error);
        msgDiv.style.color = '#ff3b30';
        msgDiv.textContent = isPt ? 'Erro ao submeter. Tente novamente.' : 'Error submitting. Try again.';
        document.getElementById('btn-submit-review').disabled = false;
        document.getElementById('btn-submit-review').textContent = isPt ? 'Submeter Avaliação' : 'Submit Review';
    }
};

window.loadMyReviews = async function(service) {
    const user = auth.currentUser;
    if (!user) return;

    const listDiv = document.getElementById('my-reviews-list');
    if (!listDiv) return;
    const isPt = document.documentElement.lang !== 'en';
    listDiv.innerHTML = `<p class="color-text-dim">${isPt ? 'A carregar...' : 'Loading...'}</p>`;

    try {
        const q = query(collection(db, "reviews"), where("userId", "==", user.uid), where("service", "==", service));
        const snap = await getDocs(q);

        if (snap.empty) {
            listDiv.innerHTML = `<p class="color-text-dim" style="text-align:center; padding: 20px; background: var(--color-bg); border-radius: 8px;">${isPt ? 'Ainda não tem avaliações neste serviço.' : 'You have no reviews for this service yet.'}</p>`;
            return;
        }

        // Sort in memory (avoids composite indexes)
        let reviews = [];
        snap.forEach(d => {
            reviews.push({ id: d.id, ...d.data() });
        });
        reviews.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        let html = '';
        reviews.forEach(r => {
            const d = new Date(r.timestamp);
            let starsHtml = '';
            for(let i=1; i<=5; i++) {
                starsHtml += `<i data-lucide="star" style="width:16px; color:${i<=r.rating ? '#E6AE17' : '#ddd'}; fill:${i<=r.rating ? '#E6AE17' : 'none'};"></i>`;
            }

            html += `
            <div class="review-card-modern">
                <div class="rc-header">
                    <div style="display:flex; gap: 2px;">${starsHtml}</div>
                    <span class="rc-date">${d.toLocaleDateString()}</span>
                </div>
                <p class="rc-text">"${r.text}"</p>
            </div>`;
        });

        listDiv.innerHTML = html;
        if (window.lucide) window.lucide.createIcons();

    } catch (e) {
        console.error("Error loading reviews:", e);
        listDiv.innerHTML = `<p class="color-text-dim">${isPt ? 'Erro ao carregar avaliações.' : 'Error loading reviews.'}</p>`;
    }
};

// Alias for backward compat
const loadMyReviews = window.loadMyReviews;

// Function to check if user should leave a review (has past bookings but no reviews)
async function checkReviewPrompt(user) {
    try {
        const bookingDocRef = doc(db, "weekly_schedules", `user_${user.uid}`);
        const bookingSnap = await getDoc(bookingDocRef);
        
        if (bookingSnap.exists()) {
            const bookings = bookingSnap.data().bookings || [];
            const now = new Date();
            
            // Has at least one completed booking in the past
            const hasCompleted = bookings.some(b => {
                if (b.status === 'cancelled') return false;
                // Parse b.id format: "2026-03-01T15:00"
                const bDate = new Date(b.id);
                return bDate < now;
            });
            
            if (hasCompleted) {
                // Check if they already left a review recently
                const q = query(collection(db, "reviews"), where("userId", "==", user.uid));
                const reviewsSnap = await getDocs(q);
                
                if (reviewsSnap.empty) {
                    // Highlight the reviews button!
                    const badge = document.getElementById('reviews-badge');
                    if (badge) badge.classList.remove('hidden');
                }
            }
        }
    } catch(e) {
        console.error("Error checking review prompt:", e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // We need to wait for auth state
    setTimeout(initializeReviewEvents, 1000); 
});


// ====== ADMIN REVIEWS ======
window.loadAdminReviews = async function(service) {
    const isPt = document.documentElement.lang !== 'en';
    
    // Update tabs UI
    document.getElementById('tab-admin-treino').classList.toggle('active', service === 'treino');
    document.getElementById('tab-admin-osteo').classList.toggle('active', service === 'osteopatia');
    
    const listDiv = document.getElementById('admin-reviews-list');
    listDiv.innerHTML = `<p class="color-text-dim">${isPt ? 'A carregar avaliações...' : 'Loading reviews...'}</p>`;
    
    try {
        const q = query(collection(db, "reviews"), where("service", "==", service));
        const snap = await getDocs(q);
        
        if (snap.empty) {
            listDiv.innerHTML = `<p class="color-text-dim" style="text-align:center; padding: 20px; background: var(--color-bg); border-radius: 8px;">${isPt ? 'Nenhuma avaliação encontrada.' : 'No reviews found.'}</p>`;
            return;
        }
        
        let reviewsByUser = {};
        snap.forEach(doc => {
            const data = doc.data();
            const uid = data.userId || 'anonymous';
            if (!reviewsByUser[uid]) {
                reviewsByUser[uid] = {
                    name: data.userName || 'Anónimo',
                    reviews: []
                };
            }
            reviewsByUser[uid].reviews.push({ id: doc.id, ...data });
        });
        
        let html = '';
        Object.keys(reviewsByUser).forEach(uid => {
            const userGroup = reviewsByUser[uid];
            userGroup.reviews.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            let reviewsHtml = '';
            userGroup.reviews.forEach(r => {
                const d = new Date(r.timestamp);
                let starsHtml = '';
                for(let i=1; i<=5; i++) {
                    starsHtml += `<i data-lucide="star" style="width:16px; color:${i<=r.rating ? '#E6AE17' : '#ddd'}; fill:${i<=r.rating ? '#E6AE17' : 'none'};"></i>`;
                }
                reviewsHtml += `
                <div class="review-card-modern" style="margin-top: 10px;">
                    <div class="rc-header">
                        <div style="display:flex; gap: 2px;">${starsHtml}</div>
                        <div style="text-align: right;">
                            <span class="rc-date">${d.toLocaleDateString()}</span><br>
                            <button onclick="window.deleteReview('${r.id}')" class="btn btn-outline" style="padding: 2px 8px; font-size: 0.8rem; margin-top: 8px; color: #ff3b30; border-color: #ff3b30;">${isPt ? 'Eliminar' : 'Delete'}</button>
                        </div>
                    </div>
                    <p class="rc-text">"${r.text}"</p>
                </div>`;
            });
            
            html += `
            <div style="border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; margin-bottom: 15px; overflow: hidden; background: rgba(0,0,0,0.2);">
                <div onclick="this.nextElementSibling.classList.toggle('hidden'); const icon = this.querySelector('svg'); if(icon) icon.style.transform = this.nextElementSibling.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';" style="padding: 15px 20px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s;">
                    <strong style="color: var(--color-primary); font-size: 1.1rem; text-transform: uppercase;">${userGroup.name} <span style="font-size: 0.9rem; color: var(--color-text-dim); font-weight: normal;">(${userGroup.reviews.length} ${userGroup.reviews.length === 1 ? 'avaliação' : 'avaliações'})</span></strong>
                    <i data-lucide="chevron-down" style="color: var(--color-text-dim); transition: transform 0.3s;"></i>
                </div>
                <div class="hidden" style="padding: 15px 20px; border-top: 1px solid rgba(255,255,255,0.05);">
                    ${reviewsHtml}
                </div>
            </div>`;
        });
        
        listDiv.innerHTML = html;
        if (window.lucide) window.lucide.createIcons();
        
    } catch (e) {
        console.error("Error loading admin reviews:", e);
        listDiv.innerHTML = `<p class="color-text-dim">${isPt ? 'Erro ao carregar.' : 'Error loading.'}</p>`;
    }
};

window.deleteReview = async function(reviewId) {
    const isPt = document.documentElement.lang !== 'en';
    if (!confirm(isPt ? 'Tem a certeza que deseja eliminar esta avaliação?' : 'Are you sure you want to delete this review?')) return;
    
    try {
        await deleteDoc(doc(db, "reviews", reviewId));
        alert(isPt ? 'Avaliação eliminada com sucesso.' : 'Review deleted successfully.');
        const currentTab = document.getElementById('tab-admin-treino').classList.contains('active') ? 'treino' : 'osteopatia';
        window.loadAdminReviews(currentTab);
    } catch (e) {
        console.error("Error deleting review:", e);
        alert(isPt ? 'Erro ao eliminar.' : 'Error deleting.');
    }
};

// Admin button wired via inline onclick in HTML — no extra listener needed here

function hideAllDashboardSections() {
    const sections = [
        'dashboard-preview-section',
        'dashboard-main-actions',
        'booking-wizard-section',
        'global-agenda-section',
        'admin-calendar-section',
        'client-reviews-section',
        'admin-reviews-section'
    ];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}
