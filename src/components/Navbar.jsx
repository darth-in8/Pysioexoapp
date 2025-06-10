// src/components/Navbar.jsx
import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Avatar } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { logout } from '../services/firebase';

const Navbar = () => {
    const { currentUser, userData } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <AppBar position="static">
            <Toolbar>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    PhysioApp
                </Typography>

                {!currentUser ? (
                    // Show these buttons when user is not logged in
                    <Box>
                        <Button color="inherit" component={Link} to="/">
                            Home
                        </Button>
                        <Button color="inherit" component={Link} to="/login">
                            Login
                        </Button>
                    </Box>
                ) : (
                    // Show these buttons when user is logged in
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Button color="inherit" component={Link} to="/">
                            Home
                        </Button>

                        {/* Show dashboard link based on user role */}
                        {userData?.role === 'patient' && (
                            <Button color="inherit" component={Link} to="/patient">
                                My Dashboard
                            </Button>
                        )}
                        {userData?.role === 'doctor' && (
                            <Button color="inherit" component={Link} to="/doctor">
                                Doctor Dashboard
                            </Button>
                        )}

                        {/* User profile section */}
                        <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                            <Avatar
                                sx={{ width: 32, height: 32, mr: 1 }}
                                alt={userData?.fullName || currentUser.email}
                                src={currentUser.photoURL || ''}
                            />
                            <Typography variant="subtitle1" sx={{ mr: 2 }}>
                                {userData?.fullName || currentUser.email}
                            </Typography>
                            <Button
                                color="inherit"
                                onClick={handleLogout}
                                variant="outlined"
                                size="small"
                            >
                                Logout
                            </Button>
                        </Box>
                    </Box>
                )}
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;