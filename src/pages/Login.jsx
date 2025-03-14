// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { signInWithGoogle } from '../services/firebase';
import {
    Container,
    Typography,
    TextField,
    Button,
    Grid,
    Paper,
    Divider,
    Box,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';

const Login = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    const onSubmit = async (data) => {
        setError('');
        // Simulate login/signup (replace with actual API calls)
        if (data.email === 'patient@example.com' && data.password === 'patient123') {
            navigate('/patient'); // Redirect to Patient Dashboard
        } else if (data.email === 'doctor@example.com' && data.password === 'doctor123') {
            navigate('/doctor'); // Redirect to Doctor Dashboard
        } else {
            setError('Invalid email or password.');
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            const user = await signInWithGoogle();
            // Redirect based on user role (e.g., user.role === 'patient' ? '/patient' : '/doctor')
            navigate('/patient'); // Temporary redirect
        } catch (error) {
            setError('Failed to sign in with Google.');
        }
    };

    return (
        <Container maxWidth="sm">
            <Paper elevation={3} sx={{ padding: 4, marginTop: 8 }}>
                <Typography variant="h4" align="center" gutterBottom>
                    {isSignUp ? 'Sign Up' : 'Sign In'}
                </Typography>
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
                                />
                            </Grid>
                        )}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Email"
                                type="email"
                                {...register('email', { required: 'Email is required' })}
                                error={!!errors.email}
                                helperText={errors.email?.message}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Password"
                                type="password"
                                {...register('password', { required: 'Password is required' })}
                                error={!!errors.password}
                                helperText={errors.password?.message}
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
                                    })}
                                    error={!!errors.confirmPassword}
                                    helperText={errors.confirmPassword?.message}
                                />
                            </Grid>
                        )}
                        <Grid item xs={12}>
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                color="primary"
                                size="large"
                            >
                                {isSignUp ? 'Sign Up' : 'Sign In'}
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
                            >
                                Sign {isSignUp ? 'Up' : 'In'} with Google
                            </Button>
                        </Grid>
                        <Grid item xs={12}>
                            <Box textAlign="center">
                                <Button onClick={() => setIsSignUp(!isSignUp)}>
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
        </Container>
    );
};

export default Login;