// src/components/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { logout } from '../services/firebase';
import { getTotalUnreadCount, subscribeToConversations } from '../services/chatService';
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    Box,
    IconButton,
    Menu,
    MenuItem,
    Avatar,
    Badge,
    Divider
} from '@mui/material';
import {
    AccountCircle,
    Chat as ChatIcon,
    LocalHospital as DoctorIcon,
    Person as PersonIcon,
    Home as HomeIcon,
    Dashboard as DashboardIcon
} from '@mui/icons-material';

const Navbar = () => {
    const { currentUser, userData } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [anchorEl, setAnchorEl] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);

    // Subscribe to unread message count
    useEffect(() => {
        if (currentUser && userData) {
            // Get initial unread count
            getTotalUnreadCount(currentUser.uid).then(count => {
                setUnreadCount(count);
            });

            // Subscribe to conversation updates for real-time unread count
            const unsubscribe = subscribeToConversations(
                currentUser.uid,
                userData.role,
                (conversations) => {
                    const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
                    setUnreadCount(totalUnread);
                }
            );

            return () => {
                if (unsubscribe) unsubscribe();
            };
        }
    }, [currentUser, userData]);

    const handleMenu = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
            handleClose();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const getDashboardPath = () => {
        return userData?.role === 'doctor' ? '/doctor' : '/patient';
    };

    const isActive = (path) => {
        return location.pathname === path;
    };

    return (
        <AppBar position="static" elevation={2}>
            <Toolbar>
                {/* Logo/Title */}
                <Typography
                    variant="h6"
                    component={Link}
                    to="/"
                    sx={{
                        flexGrow: 0,
                        textDecoration: 'none',
                        color: 'inherit',
                        fontWeight: 'bold',
                        mr: 4
                    }}
                >
                    PhysioApp
                </Typography>

                {/* Navigation Links */}
                <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
                    <Button
                        color="inherit"
                        component={Link}
                        to="/"
                        startIcon={<HomeIcon />}
                        sx={{
                            backgroundColor: isActive('/') ? 'rgba(255,255,255,0.1)' : 'transparent'
                        }}
                    >
                        Home
                    </Button>

                    {currentUser && userData && (
                        <>
                            <Button
                                color="inherit"
                                component={Link}
                                to={getDashboardPath()}
                                startIcon={<DashboardIcon />}
                                sx={{
                                    backgroundColor: isActive(getDashboardPath()) ? 'rgba(255,255,255,0.1)' : 'transparent'
                                }}
                            >
                                Dashboard
                            </Button>

                            <Button
                                color="inherit"
                                component={Link}
                                to="/chat"
                                startIcon={
                                    <Badge badgeContent={unreadCount} color="error" max={99}>
                                        <ChatIcon />
                                    </Badge>
                                }
                                sx={{
                                    backgroundColor: isActive('/chat') ? 'rgba(255,255,255,0.1)' : 'transparent'
                                }}
                            >
                                Messages
                            </Button>
                        </>
                    )}
                </Box>

                {/* User Menu */}
                {currentUser && userData ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {/* User Role Indicator */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
                            {userData.role === 'doctor' ? <DoctorIcon /> : <PersonIcon />}
                            <Box>
                                <Typography variant="body2" sx={{ lineHeight: 1 }}>
                                    {userData.fullName}
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.8, lineHeight: 1 }}>
                                    {userData.role === 'doctor' ? 'Doctor' : 'Patient'}
                                </Typography>
                            </Box>
                        </Box>

                        <IconButton
                            size="large"
                            aria-label="account menu"
                            aria-controls="account-menu"
                            aria-haspopup="true"
                            onClick={handleMenu}
                            color="inherit"
                        >
                            <Avatar sx={{ width: 32, height: 32 }}>
                                {userData.fullName?.charAt(0)?.toUpperCase() || 'U'}
                            </Avatar>
                        </IconButton>

                        <Menu
                            id="account-menu"
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={handleClose}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'right',
                            }}
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                        >
                            <MenuItem disabled>
                                <Box>
                                    <Typography variant="subtitle2">
                                        {userData.fullName}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {userData.email}
                                    </Typography>
                                </Box>
                            </MenuItem>
                            <Divider />
                            <MenuItem
                                onClick={() => {
                                    navigate(getDashboardPath());
                                    handleClose();
                                }}
                            >
                                <DashboardIcon sx={{ mr: 1 }} />
                                Dashboard
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    navigate('/chat');
                                    handleClose();
                                }}
                            >
                                <Badge badgeContent={unreadCount} color="error" max={99}>
                                    <ChatIcon sx={{ mr: 1 }} />
                                </Badge>
                                Messages
                            </MenuItem>
                            <Divider />
                            <MenuItem onClick={handleLogout}>
                                <AccountCircle sx={{ mr: 1 }} />
                                Logout
                            </MenuItem>
                        </Menu>
                    </Box>
                ) : (
                    <Button
                        color="inherit"
                        component={Link}
                        to="/login"
                        variant="outlined"
                        sx={{ borderColor: 'rgba(255,255,255,0.5)' }}
                    >
                        Login
                    </Button>
                )}
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;