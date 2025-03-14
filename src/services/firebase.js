// src/services/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCoPj1KYM3xaDcB2i4UQus6wppiR60ITf4",
    authDomain: "physio-app-8f31d.firebaseapp.com",
    projectId: "physio-app-8f31d",
    storageBucket: "physio-app-8f31d.firebasestorage.app",
    messagingSenderId: "1099010545807",
    appId: "1:1099010545807:web:3f9eacd48a5e85fea538fa",
    measurementId: "G-D0337ECSBV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Function to handle Google Sign-In
export const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user; // Return the authenticated user
    } catch (error) {
        throw error;
    }
};