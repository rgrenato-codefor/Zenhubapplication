import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
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
export const db = getFirestore(app);
export default app;