// Firebase Cloud Messaging Service Worker for FabricOS

importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

// Initialize Firebase compat inside Service Worker
// Placeholder config will be overridden by client token requests
const firebaseConfig = {
    apiKey: "placeholder-api-key",
    authDomain: "fabricos-fcm.firebaseapp.com",
    projectId: "fabricos-fcm",
    storageBucket: "fabricos-fcm.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef"
};

if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
}

let messaging = null;
try {
    if (firebase.messaging.isSupported()) {
        messaging = firebase.messaging();
        
        // Handle background messages
        messaging.onBackgroundMessage((payload) => {
            console.log('[firebase-messaging-sw.js] Background message received: ', payload);
            
            const notificationTitle = payload.notification?.title || payload.data?.title || 'FabricOS Alert';
            const notificationOptions = {
                body: payload.notification?.body || payload.data?.body || '',
                icon: payload.notification?.icon || payload.data?.icon || '/images/icon-monochrome.png',
                data: {
                    clickUrl: payload.data?.clickUrl || payload.notification?.click_action || '/'
                }
            };

            return self.registration.showNotification(notificationTitle, notificationOptions);
        });
    }
} catch (e) {
    console.warn('[firebase-messaging-sw.js] FCM not fully supported or initialized: ', e);
}

// Service worker fallback notification listener (HTML5 offline channel)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, body, icon, data } = event.data.payload;
        self.registration.showNotification(title, {
            body,
            icon: icon || '/images/icon-monochrome.png',
            data: data || {}
        });
    }
});

// Click action handler to open correct route in FabricOS
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = event.notification.data?.clickUrl || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // If tab is already open, focus it and navigate
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if ('focus' in client) {
                    client.focus();
                    if ('navigate' in client) {
                        return client.navigate(targetUrl);
                    }
                }
            }
            // If not open, open a new window
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
