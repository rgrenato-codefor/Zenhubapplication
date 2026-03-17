import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
} from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyCj-rjgRt3319Fm4OjwkibBK_kr8JxlPrA",
  authDomain: "zen-hub-f61be.firebaseapp.com",
  projectId: "zen-hub-f61be",
  storageBucket: "zen-hub-f61be.firebasestorage.app",
  messagingSenderId: "56512762411",
  appId: "1:56512762411:web:218869e1b04b33881e106e",
  measurementId: "G-P51XK5HN33",
};

/**
 * Google OAuth Web Client ID
 * Encontre em: Firebase Console → Authentication → Sign-in method → Google → "ID do cliente da Web"
 * Formato: XXXXXXXXXX-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
 */
export const GOOGLE_CLIENT_ID = "155346459725-muobno2n5068phih47gkfnopsanlg3mc.apps.googleusercontent.com";

// Prevent duplicate initialization in hot-reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);

// ignoreUndefinedProperties: true — evita erro "Unsupported field value: undefined"
// quando campos opcionais (companyId, unitId, etc.) não são informados.
// experimentalAutoDetectLongPolling: true — melhora a estabilidade da conexão e
// evita o BloomFilterError causado por dados de cache IndexedDB corrompidos/incompatíveis.
// persistentSingleTabManager({ forceOwnership: true }) — garante que esta aba
// seja a proprietária do cache, prevenindo conflitos entre abas que causam BloomFilter errors.
export const db = (() => {
  try {
    return initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      experimentalAutoDetectLongPolling: true,
      localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager({ forceOwnership: true }),
      }),
    });
  } catch {
    // Já inicializado (hot-reload) — usa a instância existente
    return getFirestore(app);
  }
})();

export default app;