import { initializeApp } from 'firebase/app';
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { getDatabase } from 'firebase/database'; // Add this

const firebaseConfig = {
    apiKey: "AIzaSyCoPj1KYM3xaDcB2i4UQus6wppiR60ITf4",
    authDomain: "physio-app-8f31d.firebaseapp.com",
    databaseURL: "https://physio-app-8f31d-default-rtdb.firebaseio.com", // Add this
    projectId: "physio-app-8f31d",
    storageBucket: "physio-app-8f31d.appspot.com",
    messagingSenderId: "1099010545807",
    appId: "1:1099010545807:web:3f9eacd48a5e85fea538fa"
};

const app = initializeApp(firebaseConfig);

// Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Realtime Database
export const db = getDatabase(app); // Add this export

// Google Sign-In
export const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error("Google Sign-In Error:", error);
        throw error;
    }
};