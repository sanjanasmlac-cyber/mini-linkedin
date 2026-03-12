const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
// In production, use the service account key file
// For development, you can use the Firebase emulator
let firebaseApp;

try {
  let serviceAccount;
  
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    };
  } else {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './config/firebase-service-account.json';
    serviceAccount = require(path.resolve(serviceAccountPath));
  }
  
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin initialized with service account');
} catch (error) {
  console.warn('⚠️  Firebase service account not found. Running in development mode.');
  console.warn('   Auth middleware will accept any token in dev mode.');
  firebaseApp = null;
}

module.exports = { admin, firebaseApp };
