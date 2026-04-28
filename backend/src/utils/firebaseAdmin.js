import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Firebase Admin Initialization
 * Robustly handles private key formatting for different environments.
 */
if (!admin.apps.length) {
    try {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
        
        if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey,
                })
            });
            console.log('✅ Firebase Admin Initialized Successfully');
        } else {
            console.warn('⚠️ Firebase Admin keys missing in .env. Skipping initialization.');
        }
    } catch (error) {
        console.error('❌ Firebase Admin Initialization Error:', error);
    }
}

export default admin;
