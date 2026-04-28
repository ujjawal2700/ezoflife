import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

/**
 * Firebase Client Initialization
 * Fixes iOS/Android In-App Browser Blank Screen issues by using 
 * conditional initialization and robust error catching.
 */

const firebaseConfig = {
  // Add these to your .env file
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "ezoflife-b6ead"}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ezoflife-b6ead",
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "ezoflife-b6ead"}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID"
};

let messaging = null;

try {
    const app = initializeApp(firebaseConfig);
    // Only initialize messaging if supported (avoids crash on old iOS)
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        messaging = getMessaging(app);
    }
    console.log('✅ Firebase Client Initialized');
} catch (error) {
    console.warn('⚠️ Firebase Initialization Failed (likely unsupported environment):', error);
}

export const requestForToken = async () => {
  if (!messaging) return null;
  try {
    const currentToken = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
    });
    if (currentToken) {
      console.log('🔑 FCM Token:', currentToken);
      return currentToken;
    }
  } catch (err) {
    console.error('❌ FCM Token Error:', err);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return resolve(null);
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });

export default messaging;
