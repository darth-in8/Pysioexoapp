// src/services/firebase.js
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import { getDatabase, ref, set, get } from 'firebase/database';

const firebaseConfig = {
    apiKey: "AIzaSyCoPj1KYM3xaDcB2i4UQus6wppiR60ITf4",
    authDomain: "physio-app-8f31d.firebaseapp.com",
    databaseURL: "https://physio-app-8f31d-default-rtdb.firebaseio.com",
    projectId: "physio-app-8f31d",
    storageBucket: "physio-app-8f31d.appspot.com",
    messagingSenderId: "1099010545807",
    appId: "1:1099010545807:web:3f9eacd48a5e85fea538fa"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getDatabase(app);

// Authentication Functions
export const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        // Check if user exists in database
        let userData;
        try {
            userData = await getUserData(result.user.uid);
        } catch {
            // If user doesn't exist, create a basic profile
            userData = {
                email: result.user.email,
                fullName: result.user.displayName || 'New User',
                role: 'patient' // Default to patient for Google sign-in
            };
            await createUserProfile(result.user.uid, userData);
        }
        return { user: result.user, userData };
    } catch (error) {
        console.error("Google Sign-In Error:", error);
        throw error;
    }
};

export const signInWithEmail = async (email, password) => {
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const userData = await getUserData(result.user.uid);
        return { user: result.user, userData };
    } catch (error) {
        console.error("Email Sign-In Error:", error);
        throw error;
    }
};

export const signUpWithEmail = async (email, password, userData) => {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;

        // Save user data to database
        await createUserProfile(user.uid, userData);

        return user;
    } catch (error) {
        console.error("Email Sign-Up Error:", error);
        throw error;
    }
};

export const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout Error:", error);
        throw error;
    }
};

// Database Functions
export const createUserProfile = async (uid, userData) => {
    try {
        const userRef = ref(db, `users/${uid}`);
        await set(userRef, {
            ...userData,
            createdAt: new Date().toISOString(),
            isActive: true
        });

        // Create role-specific data structure
        if (userData.role === 'doctor') {
            const doctorRef = ref(db, `doctorData/${uid}`);
            await set(doctorRef, {
                patients: {},
                schedule: {},
                statistics: {
                    totalPatients: 0,
                    activePatients: 0
                }
            });
        } else if (userData.role === 'patient') {
            const patientRef = ref(db, `patientData/${uid}`);
            await set(patientRef, {
                medicalHistory: {
                    conditions: [],
                    medications: []
                },
                exerciseHistory: {},
                progress: {
                    currentWeek: 0,
                    completedSessions: 0
                }
            });
        }
    } catch (error) {
        console.error("Error creating user profile:", error);
        throw error;
    }
};

export const getUserData = async (uid) => {
    try {
        const userRef = ref(db, `users/${uid}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            throw new Error('User data not found');
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
        throw error;
    }
};

export const getRoleSpecificData = async (uid, role) => {
    try {
        const dataRef = ref(db, `${role}Data/${uid}`);
        const snapshot = await get(dataRef);

        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            return null;
        }
    } catch (error) {
        console.error(`Error fetching ${role} data:`, error);
        throw error;
    }
};

// Doctor-specific functions
export const getDoctorPatients = async (doctorUid) => {
    try {
        const patientsRef = ref(db, `doctorData/${doctorUid}/patients`);
        const snapshot = await get(patientsRef);

        if (snapshot.exists()) {
            const patientIds = Object.keys(snapshot.val());
            const patientPromises = patientIds.map(id => getUserData(id));
            const patients = await Promise.all(patientPromises);
            return patients;
        }
        return [];
    } catch (error) {
        console.error("Error fetching doctor's patients:", error);
        throw error;
    }
};

// Patient-specific functions
export const getPatientExercises = async (patientUid) => {
    try {
        const exercisesRef = ref(db, `patientData/${patientUid}/exerciseHistory`);
        const snapshot = await get(exercisesRef);

        if (snapshot.exists()) {
            return snapshot.val();
        }
        return {};
    } catch (error) {
        console.error("Error fetching patient exercises:", error);
        throw error;
    }
};