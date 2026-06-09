import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

// Firebase project settings for NexaMart
const firebaseConfig = {
  apiKey: "AIzaSyBRgjTzexhAH37ESXTtJbDx4FGXHUCbt00",
  authDomain: "nexamart-28c93.firebaseapp.com",
  projectId: "nexamart-28c93",
  storageBucket: "nexamart-28c93.firebasestorage.app",
  messagingSenderId: "253670349723",
  appId: "1:253670349723:web:7b9d0f1b336c48b1bd1f3e",
  measurementId: "G-WQNVTCJ0XZ",
};

// Start Firebase app
export const firebaseApp = initializeApp(firebaseConfig);

// Start analytics only in browser when supported
export const initAnalytics = async () => {
  if (typeof window === "undefined") {
    return null;
  }

  const supported = await isSupported();

  if (!supported) {
    return null;
  }

  return getAnalytics(firebaseApp);
};
