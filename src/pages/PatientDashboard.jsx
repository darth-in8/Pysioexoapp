import React, { useState, useEffect } from 'react';
import { ref, set, onValue } from 'firebase/database';
import { db } from '../services/firebase';
import {
    Box,
    Button,
    Slider,
    Typography,
    LinearProgress,
    Paper,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle
} from '@mui/material';

const EXERCISE_PRESETS = [
    { id: 1, name: "Basic Flexion", cycles: 5, duration: 5, description: "Standard flexion exercise (5s hold)" },
    { id: 2, name: "Intensive Rehab", cycles: 8, duration: 8, description: "Longer holds for intensive therapy" },
    { id: 3, name: "Gentle Warm-up", cycles: 3, duration: 3, description: "Shorter holds for warm-up" }
];

const HOLD_DURATIONS = [
    { value: 3, label: "3s" },
    { value: 5, label: "5s" },
    { value: 8, label: "8s" }
];

const PatientDashboard = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [cycles, setCycles] = useState(5);
    const [progress, setProgress] = useState(0);
    const [holdDuration, setHoldDuration] = useState(5);
    const [emergency, setEmergency] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    useEffect(() => {
        const progressRef = ref(db, 'glove/progress');
        const commandRef = ref(db, 'glove/command');
        const emergencyRef = ref(db, 'glove/emergencyStop');

        const unsubscribeProgress = onValue(progressRef, (snapshot) => {
            setProgress(snapshot.val() || 0);
        });

        const unsubscribeCommand = onValue(commandRef, (snapshot) => {
            setIsRunning(snapshot.val() === "START");
        });

        const unsubscribeEmergency = onValue(emergencyRef, (snapshot) => {
            setEmergency(snapshot.val() === true);
        });

        return () => {
            unsubscribeProgress();
            unsubscribeCommand();
            unsubscribeEmergency();
        };
    }, []);

    const startExercise = async () => {
        try {
            await set(ref(db, 'glove'), {
                command: "START",
                cycles: Math.min(Math.max(cycles, 1), 10),
                holdDuration: holdDuration,
                progress: 0,
                emergencyStop: false
            });
        } catch (error) {
            console.error("Error starting exercise:", error);
            alert("Failed to start exercise. Please try again.");
        }
    };

    const handleEmergencyStop = async () => {
        try {
            await set(ref(db, 'glove/emergencyStop'), true);
        } catch (error) {
            console.error("Emergency stop failed:", error);
            alert("Emergency stop failed! Check device connection.");
        }
    };

    const applyPreset = (preset) => {
        if (!isRunning) {
            setCycles(preset.cycles);
            setHoldDuration(preset.duration);
        }
    };

    const currentCycle = progress > 0 ? Math.ceil(progress / (100 / cycles)) : 0;

    return (
        <Paper elevation={3} sx={{
            p: 4,
            maxWidth: 600,
            mx: 'auto',
            mt: 4,
            '& .MuiFormControl-root': { mb: 3 }
        }}>
            <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Hand Rehabilitation Controller
            </Typography>

            {/* Preset Selection */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" component="h2" gutterBottom>
                    Exercise Presets:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {EXERCISE_PRESETS.map((preset) => (
                        <Button
                            key={preset.id}
                            variant="outlined"
                            onClick={() => applyPreset(preset)}
                            disabled={isRunning}
                            sx={{ mb: 1 }}
                        >
                            <Box textAlign="center">
                                <Typography>{preset.name}</Typography>
                                <Typography variant="caption" display="block">{preset.description}</Typography>
                            </Box>
                        </Button>
                    ))}
                </Box>
            </Box>

            {/* Cycle Control */}
            <Box sx={{ mb: 3 }}>
                <Typography id="cycles-slider" gutterBottom>
                    Number of Cycles: {cycles}
                </Typography>
                <Slider
                    value={cycles}
                    onChange={(e, newValue) => setCycles(newValue)}
                    min={1}
                    max={10}
                    step={1}
                    marks
                    valueLabelDisplay="auto"
                    disabled={isRunning}
                />
            </Box>

            {/* Hold Duration */}
            <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Hold Duration</InputLabel>
                <Select
                    value={holdDuration}
                    onChange={(e) => setHoldDuration(e.target.value)}
                    disabled={isRunning}
                    label="Hold Duration"
                >
                    {HOLD_DURATIONS.map((duration) => (
                        <MenuItem key={duration.value} value={duration.value}>
                            {duration.label} (hold)
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {/* Progress Display */}
            <Box sx={{ mb: 3 }}>
                <Typography gutterBottom>
                    Exercise Progress: {progress}%
                </Typography>
                <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{ height: 10, borderRadius: 5 }}
                />
                <Typography variant="body2" sx={{ mt: 1, textAlign: 'right' }}>
                    Cycle {currentCycle} of {cycles}
                </Typography>
            </Box>

            {/* Control Buttons */}
            <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                    variant="contained"
                    onClick={() => setConfirmOpen(true)}
                    disabled={isRunning || emergency}
                    fullWidth
                    sx={{ py: 2 }}
                >
                    {isRunning ? 'Exercise In Progress' : 'Start Exercise'}
                </Button>

                <Button
                    variant="contained"
                    color="error"
                    onClick={handleEmergencyStop}
                    disabled={!isRunning || emergency}
                    fullWidth
                    sx={{ py: 2 }}
                >
                    {emergency ? 'System Stopped' : 'Emergency Release'}
                </Button>
            </Box>

            {/* Status Alerts */}
            {emergency && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    Emergency release activated! Reset the glove device to continue.
                </Alert>
            )}

            {/* Confirmation Dialog */}
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                <DialogTitle>Confirm Exercise Start</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        This will begin {cycles} cycles of flexion exercises with {holdDuration} second holds.
                        Ensure the glove is properly fitted before starting.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
                    <Button onClick={() => {
                        startExercise();
                        setConfirmOpen(false);
                    }} autoFocus>
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default PatientDashboard;