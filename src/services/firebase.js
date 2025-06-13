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
import { onAuthStateChanged } from 'firebase/auth';

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

export const onAuthStateChange = (callback) => {
    return onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userData = await getUserData(user.uid);
                callback({ user, userData, isAuthenticated: true });
            } catch (error) {
                console.error("Error fetching user data in auth listener:", error);
                // Handle case where user exists in Firebase Auth but not in database
                callback({ user, userData: null, isAuthenticated: false });
            }
        } else {
            callback({ user: null, userData: null, isAuthenticated: false });
        }
    });
};

// Authentication Functions
export const signInWithGoogle = async (selectedRole = null) => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        let userData;

        try {
            userData = await getUserData(result.user.uid);
        } catch {
            // User doesn't exist, need to create profile
            if (!selectedRole) {
                // Sign out the user since they need to select a role
                await signOut(auth);
                throw new Error('ROLE_SELECTION_REQUIRED');
            }

            userData = {
                email: result.user.email,
                fullName: result.user.displayName || 'New User',
                role: selectedRole
            };
            await createUserProfile(result.user.uid, userData);

            // Reload the page after creating new user profile
            window.location.reload();
            return; // Don't return anything as page will reload
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
        console.log("Sign in role:", userData.role); // ✅ Debugging
        return { user: result.user, userData };
    } catch (error) {
        console.error("Email Sign-In Error:", error);
        throw error;
    }
};

export const signUpWithEmail = async (email, password, userData) => {
    try {
        console.log("Signup with role:", userData.role); // ✅ Debugging
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;
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

// Save new Dead Pulse data
export const saveDeadPulse = async (newData) => {
    try {
        const currentRef = ref(db, 'glove/deadPulse/current');
        const previousRef = ref(db, 'glove/deadPulse/previous');

        // Backup current as previous if it exists
        const currentSnap = await get(currentRef);
        if (currentSnap.exists()) {
            await set(previousRef, currentSnap.val());
        }

        // Save new current
        await set(currentRef, {
            timestamp: Date.now(),
            data: newData
        });
    } catch (error) {
        console.error("Error saving Dead Pulse data:", error);
        throw error;
    }
};

// Fetch Dead Pulse records
export const getDeadPulseData = async () => {
    try {
        const currentSnap = await get(ref(db, 'glove/deadPulse/current'));
        const previousSnap = await get(ref(db, 'glove/deadPulse/previous'));
        return {
            current: currentSnap.exists() ? currentSnap.val() : null,
            previous: previousSnap.exists() ? previousSnap.val() : null
        };
    } catch (error) {
        console.error("Error fetching Dead Pulse data:", error);
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