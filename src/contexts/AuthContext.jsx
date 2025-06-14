// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, getUserData } from '../services/firebase';
import { useNavigate, useLocation } from 'react-router-dom';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const userProfile = await getUserData(user.uid);
                    setUserData(userProfile);
                    setCurrentUser(user);
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    // Don't set userData to null here, let it remain null
                    // This will trigger the reload logic in ProtectedRoute
                    setCurrentUser(user);
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
            // Don't redirect if user is already on the correct page or on allowed pages
            const currentPath = location.pathname;

            // Define allowed paths that don't require role-based redirection
            const allowedPaths = ['/chat', '/doctor', '/patient', '/'];

            // Only redirect if user is not on an allowed path
            if (!allowedPaths.includes(currentPath)) {
                if (userData.role === 'doctor') {
                    navigate('/doctor');
                } else if (userData.role === 'patient') {
                    navigate('/patient');
                } else {
                    console.error("Unknown user role:", userData.role);
                    navigate('/'); // Go to home instead of unknown route
                }
            }

            // Only redirect to role-specific dashboard if user is on home page
            if (currentPath === '/') {
                if (userData.role === 'doctor') {
                    navigate('/doctor');
                } else if (userData.role === 'patient') {
                    navigate('/patient');
                } else {
                    console.error("Unknown user role:", userData.role);
                }
            }
        }
    }, [loading, currentUser, userData, navigate, location.pathname]);

    return (
        <AuthContext.Provider value={{ currentUser, userData, loading }}>
            {loading ? (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    fontSize: '18px'
                }}>
                    Loading...
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}