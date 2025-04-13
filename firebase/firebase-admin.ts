// app/firebase-admin.ts
import { getApps, initializeApp, cert, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore, collection } from "firebase/firestore";

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

// Initialize Firebase Admin SDK
export const adminApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

export const adminAuth = getAuth(adminApp);
export const adminDb: Firestore = getFirestore();
