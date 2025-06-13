// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';

// Protected Route component
function ProtectedRoute({ children, requiredRole }) {
    const { currentUser, userData, loading } = useAuth();

    // Show loading while checking authentication
    if (loading) {
        return <div>Loading...</div>;
    }

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    // If user exists but no userData, try to reload once
    if (currentUser && !userData) {
        // Store a flag to prevent infinite reloads
        const hasReloaded = sessionStorage.getItem('auth-reload');
        if (!hasReloaded) {
            sessionStorage.setItem('auth-reload', 'true');
            window.location.reload();
            return <div>Initializing...</div>;
        }
    }

    if (requiredRole && userData?.role !== requiredRole) {
        return <Navigate to="/" replace />;
    }

    return children;
}

// Component to handle successful auth and clear reload flag
function AuthSuccessHandler({ children }) {
    const { currentUser, userData } = useAuth();

    React.useEffect(() => {
        if (currentUser && userData) {
            // Clear the reload flag when auth is successful
            sessionStorage.removeItem('auth-reload');
        }
    }, [currentUser, userData]);

    return children;
}

const App = () => {
    return (
        <Router>
            <AuthProvider>
                <AuthSuccessHandler>
                    <Navbar />
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/login" element={<Login />} />
                        <Route
                            path="/patient"
                            element={
                                <ProtectedRoute requiredRole="patient">
                                    <PatientDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/doctor"
                            element={
                                <ProtectedRoute requiredRole="doctor">
                                    <DoctorDashboard />
                                </ProtectedRoute>
                            }
                        />
                    </Routes>
                </AuthSuccessHandler>
            </AuthProvider>
        </Router>
    );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);