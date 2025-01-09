import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCB5J7KJRUsIB8ylImVS6lHkOHwUIcQJGI",
  authDomain: "agentfolio.firebaseapp.com",
  projectId: "agentfolio",
  storageBucket: "agentfolio.firebasestorage.app",
  messagingSenderId: "810443182833",
  appId: "1:810443182833:web:cd92c9a7dc153c8be90f50"
};

// Initialize Firebase only if we're in the browser
let app;
let auth;
let db;
let storage;

if (typeof window !== 'undefined') {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

export { app, auth, db, storage };
