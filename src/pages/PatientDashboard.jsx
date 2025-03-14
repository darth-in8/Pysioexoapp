// src/pages/PatientDashboard.jsx
import React, { useState } from 'react';
import {
    Container,
    Typography,
    Button,
    Grid,
    Paper,
    LinearProgress,
    Slide,
} from '@mui/material';

const PatientDashboard = () => {
    const [gloveStatus, setGloveStatus] = useState('OFF');
    const [exoskeletonStatus, setExoskeletonStatus] = useState('OFF');
    const [gloveProgress, setGloveProgress] = useState(30);
    const [exoskeletonProgress, setExoskeletonProgress] = useState(60);

    const toggleGlove = () => {
        setGloveStatus(gloveStatus === 'OFF' ? 'ON' : 'OFF');
        // Simulate progress update
        setGloveProgress(gloveProgress + 10);
    };

    const toggleExoskeleton = () => {
        setExoskeletonStatus(exoskeletonStatus === 'OFF' ? 'ON' : 'OFF');
        // Simulate progress update
        setExoskeletonProgress(exoskeletonProgress + 10);
    };

    return (
        <Container maxWidth="md">
            <Slide direction="up" in={true} mountOnEnter unmountOnExit>
                <Paper elevation={3} sx={{ padding: 4, marginTop: 4, borderRadius: 4 }}>
                    <Typography variant="h4" align="center" gutterBottom>
                        Patient Dashboard
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Paper elevation={2} sx={{ padding: 2 }}>
                                <Typography variant="h6">Pneumatic Glove</Typography>
                                <Typography>Status: {gloveStatus}</Typography>
                                <LinearProgress
                                    variant="determinate"
                                    value={gloveProgress}
                                    sx={{ marginY: 2 }}
                                />
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={toggleGlove}
                                    fullWidth
                                >
                                    {gloveStatus === 'OFF' ? 'Start' : 'Stop'}
                                </Button>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Paper elevation={2} sx={{ padding: 2 }}>
                                <Typography variant="h6">Arm Exoskeleton</Typography>
                                <Typography>Status: {exoskeletonStatus}</Typography>
                                <LinearProgress
                                    variant="determinate"
                                    value={exoskeletonProgress}
                                    sx={{ marginY: 2 }}
                                />
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={toggleExoskeleton}
                                    fullWidth
                                >
                                    {exoskeletonStatus === 'OFF' ? 'Start' : 'Stop'}
                                </Button>
                            </Paper>
                        </Grid>
                    </Grid>
                </Paper>
            </Slide>
        </Container>
    );
};

export default PatientDashboard;