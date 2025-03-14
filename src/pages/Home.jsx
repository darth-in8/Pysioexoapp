// src/pages/Home.jsx
import React from 'react';
import { Container, Typography } from '@mui/material';

const Home = () => {
    return (
        <Container maxWidth="md">
            <Typography variant="h3" align="center" sx={{ marginTop: 4 }}>
                Welcome to PhysioApp
            </Typography>
            <Typography variant="h5" align="center" sx={{ marginTop: 2 }}>
                Your app for physiotherapy exercises and recovery tracking.
            </Typography>
        </Container>
    );
};

export default Home;