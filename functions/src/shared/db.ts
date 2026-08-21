import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize the app if not already initialized
if (!getApps().length) {
  initializeApp();
}

export const db = getFirestore();
