// Firebase Cloud Messaging client-side utility and permission flow

// Dynamic import for Firebase App & Messaging to optimize client-side bundle performance
const firebaseConfig = {
    apiKey: "placeholder-api-key",
    authDomain: "fabricos-fcm.firebaseapp.com",
    projectId: "fabricos-fcm",
    storageBucket: "fabricos-fcm.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef"
};

// Check if we are running in browser context
const isBrowser = typeof window !== 'undefined';

export async function requestPushPermissionAndGetToken(): Promise<string | null> {
    if (!isBrowser) return null;

    // Check if browser supports Notifications & Service Worker
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        console.warn('[FCM Client] Push notifications not supported by this browser.');
        return null;
    }

    try {
        // Enforce "ask only once" or when not explicitly blocked
        const existingPermission = Notification.permission;
        
        if (existingPermission === 'denied') {
            console.log('[FCM Client] Notification permission was previously denied.');
            return null;
        }

        // Ask for permission if not granted yet
        if (existingPermission === 'default') {
            const status = await Notification.requestPermission();
            if (status !== 'granted') {
                console.log('[FCM Client] Notification permission was denied by the user.');
                // Save fallback settings to database
                await saveTokenToDatabase(null, false);
                return null;
            }
        }

        // Permission is allowed/granted! Register service worker and attempt FCM setup
        console.log('[FCM Client] Notification permission granted.');

        // Initialize Firebase SDK dynamically to prevent redundant bundle imports
        const { initializeApp, getApps } = await import('firebase/app');
        const { getMessaging, getToken } = await import('firebase/messaging');

        const apps = getApps();
        const app = apps.length === 0 ? initializeApp(firebaseConfig) : apps[0];
        
        let token = null;
        try {
            // Get standard service worker registration
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            const messaging = getMessaging(app);

            // Get standard FCM token
            token = await getToken(messaging, {
                vapidKey: 'placeholder-vapid-key', // Set standard Vapid key here
                serviceWorkerRegistration: registration
            });

            console.log('[FCM Client] Generated FCM Token:', token);
        } catch (fcmError) {
            // Graceful fallback to HTML5 Notification channel if Firebase VAPID config is blocked
            console.warn('[FCM Client] FCM token generation failed. Falling back to native browser notifications:', fcmError);
            // We use a mock/custom local token for local desktop alerts
            token = 'browser-local-channel-' + Math.random().toString(36).substring(7);
        }

        // Save token and push enabled status to SQLite
        await saveTokenToDatabase(token, true);
        return token;

    } catch (error) {
        console.error('[FCM Client] Error setting up push notifications:', error);
        return null;
    }
}

// Save token details to SQLite backend endpoint
async function saveTokenToDatabase(fcmToken: string | null, enabled: boolean) {
    try {
        await fetch('/api/auth/fcm-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fcmToken, notificationsEnabled: enabled })
        });
    } catch (e) {
        console.error('[FCM Client] Failed to persist FCM settings to database:', e);
    }
}

// Local helper to trigger local browser push alert in active or inactive state
export function showLocalPushNotification(title: string, body: string, clickUrl = '/') {
    if (!isBrowser || Notification.permission !== 'granted') return;

    // Use active Service Worker to show notification so it handles the click redirection nicely
    navigator.serviceWorker.ready.then((registration) => {
        registration.active?.postMessage({
            type: 'SHOW_NOTIFICATION',
            payload: {
                title,
                body,
                icon: '/images/icon-monochrome.png',
                data: { clickUrl }
            }
        });
    }).catch(() => {
        // Direct browser fallback if SW is not ready yet
        try {
            new Notification(title, {
                body,
                icon: '/images/icon-monochrome.png',
                data: { clickUrl }
            });
        } catch (e) {}
    });
}
