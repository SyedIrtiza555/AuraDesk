import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

// Live Firebase configuration connected to Google Cloud project aura-cad-2
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAAOAIqiKNm2smFJnlT17t3tobpBv8HIyY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "aura-cad-2.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "aura-cad-2",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "aura-cad-2.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "467381049765",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:467381049765:web:ae29edb9ab106d4a1cf04c",
};

// Initialize Firebase App singleton
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Cloud Firestore with offline-resilient persistentLocalCache
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
