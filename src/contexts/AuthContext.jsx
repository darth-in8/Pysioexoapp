// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, getUserData } from '../services/firebase';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate(); // ✅ For navigation

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const userProfile = await getUserData(user.uid);
                    setUserData(userProfile);
                    setCurrentUser(user);
                } catch (error) {
                    console.error("Error fetching user data:", error);
                }
            } else {
                setCurrentUser(null);
                setUserData(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // ✅ Redirect based on role once user and userData are ready
    useEffect(() => {
        if (!loading && currentUser && userData) {
            if (userData.role === 'doctor') {
                navigate('/doctor');
            } else if (userData.role === 'patient') {
                navigate('/patient');
            } else {
                navigate('/unknown-role'); // fallback route
            }
        }
    }, [loading, currentUser, userData, navigate]);

    return (
        <AuthContext.Provider value={{ currentUser, userData, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
