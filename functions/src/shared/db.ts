import * as admin from 'firebase-admin';

// Initialize the app if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();
