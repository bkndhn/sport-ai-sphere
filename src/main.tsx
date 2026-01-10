import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Clear stale service workers and caches on startup
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
            registration.unregister().then(() => {
                console.log('ServiceWorker unregistered to clear stale cache');
            });
        }
    });
}

// Clear all caches
if ('caches' in window) {
    caches.keys().then((names) => {
        for (const name of names) {
            caches.delete(name);
            console.log('Cache deleted:', name);
        }
    });
}

const rootElement = document.getElementById("root");
if (rootElement) {
    createRoot(rootElement).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}
