import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Firebase Admin Initialization
 * Robustly handles private key formatting for different environments.
 */
if (!admin.apps.length) {
    try {
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        
        if (privateKey) {
            // Remove literal quotes if they exist
            privateKey = privateKey.trim();
            if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
                privateKey = privateKey.substring(1, privateKey.length - 1);
            }
            if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
                privateKey = privateKey.substring(1, privateKey.length - 1);
            }
            
            // Replace literal \n with actual newlines
            privateKey = privateKey.replace(/\\n/g, '\n');
            
            // Final safety: remove any \r or extra spaces at line ends
            privateKey = privateKey.split('\n').map(line => line.trim()).join('\n');
            
            console.log(`📡 [FCM_INIT] Private Key Header: ${privateKey.substring(0, 25)}...`);
            console.log(`📡 [FCM_INIT] Private Key Length: ${privateKey.length}`);
        }
        
        const config = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
        };

        if (config.projectId && config.clientEmail && config.privateKey) {
            admin.initializeApp({
                credential: admin.credential.cert(config)
            });
            console.log('✅ Firebase Admin Initialized Successfully');
        } else {
            console.warn('⚠️ Firebase Admin keys missing in .env. Skipping initialization.');
            console.log('DEBUG KEYS:', { 
                pid: !!process.env.FIREBASE_PROJECT_ID, 
                cem: !!process.env.FIREBASE_CLIENT_EMAIL, 
                pk: !!privateKey 
            });
        }
    } catch (error) {
        console.error('❌ Firebase Admin Initialization Error:', error);
    }
}

export default admin;
