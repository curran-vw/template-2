import "server-only";

import { getApps, initializeApp, cert, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const firebaseConfig = {
  type: process.env.FIREBASE_TYPE!,
  projectId: process.env.FIREBASE_PROJECT_ID!,
  privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID!,
  privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
  clientId: process.env.FIREBASE_CLIENT_ID!,
  authUri: process.env.FIREBASE_AUTH_URI!,
  tokenUri: process.env.FIREBASE_TOKEN_URI!,
  authProviderX509CertUrl: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL!,
  clientX509CertUrl: process.env.FIREBASE_CLIENT_X509_CERT_URL!,
  universeDomain: process.env.FIREBASE_UNIVERSE_DOMAIN!,
};

// Initialize Firebase Admin SDK
const adminApp = !getApps().length
  ? initializeApp({
      credential: cert(firebaseConfig),
    })
  : getApp();

const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);

export { adminApp, adminAuth, adminDb };
