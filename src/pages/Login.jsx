// src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
    Container,
    Typography,
    TextField,
    Button,
    Grid,
    Paper,
    Divider,
    Box,
    Slide,
    ToggleButton,
    ToggleButtonGroup,
    Chip,
    CircularProgress,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import PersonIcon from '@mui/icons-material/Person';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';

const Login = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [userType, setUserType] = useState('patient');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { currentUser, userData } = useAuth();
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm();

    // Redirect if already logged in
    useEffect(() => {
        if (currentUser) {
            if (userData?.role === 'doctor') {
                navigate('/doctor');
            } else {
                navigate('/patient');
            }
        }
    }, [currentUser, userData, navigate]);

    const handleUserTypeChange = (event, newUserType) => {
        if (newUserType !== null) {
            setUserType(newUserType);
            setError('');
            reset();
        }
    };

    const onSubmit = async (data) => {
        setError('');
        setLoading(true);

        try {
            if (isSignUp) {
                // Sign up new user
                const userData = {
                    email: data.email,
                    fullName: data.fullName,
                    role: userType,
                    ...(userType === 'doctor' && {
                        licenseNumber: data.licenseNumber,
                        specialization: data.specialization,
                    }),
                    ...(userType === 'patient' && {
                        age: parseInt(data.age),
                        phone: data.phone,
                    }),
                };

                await signUpWithEmail(data.email, data.password, userData);
                // Navigation will be handled by the AuthContext useEffect
            } else {
                // Sign in existing user
                await signInWithEmail(data.email, data.password);
                // Navigation will be handled by the AuthContext useEffect
            }
        } catch (error) {
            console.error('Authentication Error:', error);
            setError(error.message || 'Authentication failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError('');
        setLoading(true);

        try {
            await signInWithGoogle();
            // Navigation will be handled by the AuthContext useEffect
        } catch (error) {
            console.error('Google Sign-In Error:', error);
            setError('Failed to sign in with Google. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm">
            <Slide direction="up" in={true} mountOnEnter unmountOnExit>
                <Paper elevation={3} sx={{ padding: 4, marginTop: 8, borderRadius: 4 }}>
                    <Typography variant="h4" align="center" gutterBottom>
                        {isSignUp ? 'Sign Up' : 'Sign In'}
                    </Typography>

                    {/* User Type Selection */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                        <ToggleButtonGroup
                            value={userType}
                            exclusive
                            onChange={handleUserTypeChange}
                            aria-label="user type"
                            size="large"
                        >
                            <ToggleButton
                                value="patient"
                                aria-label="patient"
                                sx={{ px: 3 }}
                            >
                                <PersonIcon sx={{ mr: 1 }} />
                                Patient
                            </ToggleButton>
                            <ToggleButton
                                value="doctor"
                                aria-label="doctor"
                                sx={{ px: 3 }}
                            >
                                <LocalHospitalIcon sx={{ mr: 1 }} />
                                Doctor
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Box>

                    {/* Current Selection Indicator */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                        <Chip
                            label={`${userType === 'patient' ? 'Patient' : 'Doctor'} ${isSignUp ? 'Registration' : 'Login'}`}
                            color={userType === 'patient' ? 'primary' : 'secondary'}
                            variant="outlined"
                        />
                    </Box>

                    <form onSubmit={handleSubmit(onSubmit)}>
                        <Grid container spacing={2}>
                            {isSignUp && (
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Full Name"
                                        {...register('fullName', { required: 'Full Name is required' })}
                                        error={!!errors.fullName}
                                        helperText={errors.fullName?.message}
                                        disabled={loading}
                                    />
                                </Grid>
                            )}

                            {/* Doctor-specific fields */}
                            {isSignUp && userType === 'doctor' && (
                                <>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Medical License Number"
                                            {...register('licenseNumber', {
                                                required: 'Medical License Number is required'
                                            })}
                                            error={!!errors.licenseNumber}
                                            helperText={errors.licenseNumber?.message}
                                            disabled={loading}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Specialization"
                                            {...register('specialization', {
                                                required: 'Specialization is required'
                                            })}
                                            error={!!errors.specialization}
                                            helperText={errors.specialization?.message}
                                            disabled={loading}
                                        />
                                    </Grid>
                                </>
                            )}

                            {/* Patient-specific fields */}
                            {isSignUp && userType === 'patient' && (
                                <>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            label="Age"
                                            type="number"
                                            {...register('age', {
                                                required: 'Age is required',
                                                min: { value: 1, message: 'Age must be at least 1' },
                                                max: { value: 120, message: 'Age must be less than 120' }
                                            })}
                                            error={!!errors.age}
                                            helperText={errors.age?.message}
                                            disabled={loading}
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            label="Phone Number"
                                            {...register('phone', {
                                                required: 'Phone number is required'
                                            })}
                                            error={!!errors.phone}
                                            helperText={errors.phone?.message}
                                            disabled={loading}
                                        />
                                    </Grid>
                                </>
                            )}

                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Email"
                                    type="email"
                                    {...register('email', {
                                        required: 'Email is required',
                                        pattern: {
                                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                            message: 'Invalid email address'
                                        }
                                    })}
                                    error={!!errors.email}
                                    helperText={errors.email?.message}
                                    disabled={loading}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Password"
                                    type="password"
                                    {...register('password', {
                                        required: 'Password is required',
                                        minLength: {
                                            value: 6,
                                            message: 'Password must be at least 6 characters'
                                        }
                                    })}
                                    error={!!errors.password}
                                    helperText={errors.password?.message}
                                    disabled={loading}
                                />
                            </Grid>
                            {isSignUp && (
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Confirm Password"
                                        type="password"
                                        {...register('confirmPassword', {
                                            required: 'Confirm Password is required',
                                            validate: (value, { password }) =>
                                                value === password || 'Passwords do not match'
                                        })}
                                        error={!!errors.confirmPassword}
                                        helperText={errors.confirmPassword?.message}
                                        disabled={loading}
                                    />
                                </Grid>
                            )}
                            <Grid item xs={12}>
                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    color={userType === 'patient' ? 'primary' : 'secondary'}
                                    size="large"
                                    disabled={loading}
                                    startIcon={loading && <CircularProgress size={20} />}
                                >
                                    {loading ? 'Please wait...' :
                                        `${isSignUp ? 'Sign Up' : 'Sign In'} as ${userType === 'patient' ? 'Patient' : 'Doctor'}`}
                                </Button>
                            </Grid>
                            <Grid item xs={12}>
                                <Divider sx={{ marginY: 2 }}>OR</Divider>
                            </Grid>
                            <Grid item xs={12}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<GoogleIcon />}
                                    onClick={handleGoogleSignIn}
                                    color={userType === 'patient' ? 'primary' : 'secondary'}
                                    disabled={loading}
                                >
                                    Sign {isSignUp ? 'Up' : 'In'} with Google as {userType === 'patient' ? 'Patient' : 'Doctor'}
                                </Button>
                            </Grid>
                            <Grid item xs={12}>
                                <Box textAlign="center">
                                    <Button
                                        onClick={() => setIsSignUp(!isSignUp)}
                                        disabled={loading}
                                    >
                                        {isSignUp
                                            ? 'Already have an account? Sign In'
                                            : "Don't have an account? Sign Up"}
                                    </Button>
                                </Box>
                            </Grid>
                            {error && (
                                <Grid item xs={12}>
                                    <Typography color="error" align="center">
                                        {error}
                                    </Typography>
                                </Grid>
                            )}
                        </Grid>
                    </form>
                </Paper>
            </Slide>
        </Container>
    );
};

export default Login;