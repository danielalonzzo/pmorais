import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    getFirestore,
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCROYGriQ-5RWiLVCRwGz9KaDUKE6zNR2w",
    authDomain: "pmorais.pt",
    databaseURL: "https://paulo-morais-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "paulo-morais",
    storageBucket: "paulo-morais.firebasestorage.app",
    messagingSenderId: "431406968000",
    appId: "1:431406968000:web:a759ddc6912639d7c69125",
    measurementId: "G-GYWR102Y9N"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Firestore keeps its synced data in IndexedDB and shares it across open tabs.
// This is what lets onSnapshot paint from disk before the network answers — note it
// does NOT speed up getDoc/getDocs, which still go to the server first and only fall
// back to the cache when the network fails.
//
// Private browsing and browsers without usable IndexedDB degrade to an in-memory
// cache on their own; initializeFirestore only throws if Firestore was already
// started, so the fallback keeps a stray import order from breaking the page.
function createFirestore() {
    try {
        return initializeFirestore(app, {
            localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        });
    } catch (error) {
        console.warn("Firestore persistent cache unavailable; using the default cache.", error);
        return getFirestore(app);
    }
}

export const db = createFirestore();
