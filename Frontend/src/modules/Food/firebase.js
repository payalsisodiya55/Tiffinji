import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = function (...args) {
    const msg = args.map(arg => {
      if (arg instanceof Error) return arg.message;
      if (typeof arg === 'object') {
        try { return JSON.stringify(arg); } catch { return ''; }
      }
      return String(arg);
    }).join(' ');
    
    if (
      msg.includes('FIREBASE WARNING') || 
      msg.includes('permission_denied') || 
      msg.includes('Could not write delivery location') ||
      msg.includes('PERMISSION_DENIED')
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

const rawDbUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL || "";
const databaseURL = rawDbUrl.includes("firebaseio.com")
  ? rawDbUrl.replace("firebaseio.com", "asia-southeast1.firebasedatabase.app")
  : (rawDbUrl || "https://tiffinji-default-rtdb.asia-southeast1.firebasedatabase.app");

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
  databaseURL
};

// Internal state
let app;
let firebaseAuth = null;
let googleProvider = null;
let firebaseRealtimeDb = null;

/**
 * Ensures Firebase app is initialized but stays silent.
 */
function initializeBaseApp() {
  if (app) return app;
  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0];
  } else {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

/**
 * Get the initialized Firebase Auth instance lazily.
 */
export function getFirebaseAuth() {
  if (!firebaseAuth) {
    const firebaseApp = initializeBaseApp();
    firebaseAuth = getAuth(firebaseApp);
  }
  return firebaseAuth;
}

/**
 * Get the initialized Google Auth Provider lazily.
 */
export function getGoogleAuthProvider() {
  if (!googleProvider) {
    googleProvider = new GoogleAuthProvider();
  }
  return googleProvider;
}

/**
 * Legacy support: ensuring Firebase is initialized.
 * Now it only initializes the basic App and Realtime DB if requested.
 * Auth initialization is skipped by default to avoid stale 'getProjectConfig' calls.
 */
export function ensureFirebaseInitialized(options = {}) {
  const { enableAuth = false, enableRealtimeDb = true } = options;
  const firebaseApp = initializeBaseApp();

  if (enableAuth) {
    getFirebaseAuth();
  }

  if (enableRealtimeDb && !firebaseRealtimeDb) {
    firebaseRealtimeDb = getDatabase(firebaseApp, databaseURL);
  }
  
  return firebaseApp;
}

// Proxies for export
export { app as firebaseApp, firebaseAuth, googleProvider, firebaseRealtimeDb };
