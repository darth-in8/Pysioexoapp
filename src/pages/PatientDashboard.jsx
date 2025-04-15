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
    DialogTitle,
    Tabs,
    Tab
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
    const [activeTab, setActiveTab] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [cycles, setCycles] = useState(5);
    const [progress, setProgress] = useState(0);
    const [holdDuration, setHoldDuration] = useState(5);
    const [emergency, setEmergency] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [monitoring, setMonitoring] = useState(false);
    const [flexValue, setFlexValue] = useState(0);
    const [flexHistory, setFlexHistory] = useState([]);
    const [exerciseComplete, setExerciseComplete] = useState(false);

    useEffect(() => {
        const progressRef = ref(db, 'glove/progress');
        const commandRef = ref(db, 'glove/command');
        const emergencyRef = ref(db, 'glove/emergencyStop');
        const monitoringRef = ref(db, 'glove/monitoring');
        const flexValueRef = ref(db, 'glove/flexValue');
        const flexHistoryRef = ref(db, 'glove/flexHistory');

        const unsubscribeProgress = onValue(progressRef, (snapshot) => {
            const newProgress = snapshot.val() || 0;
            setProgress(newProgress);
            if (newProgress >= 100) {
                setExerciseComplete(true);
            }
        });

        const unsubscribeCommand = onValue(commandRef, (snapshot) => {
            const command = snapshot.val();
            setIsRunning(command === "START");
            if (command === "DONE") {
                setIsRunning(false);
                setExerciseComplete(true);
            }
        });

        const unsubscribeEmergency = onValue(emergencyRef, (snapshot) => {
            setEmergency(snapshot.val() === true);
        });

        const unsubscribeMonitoring = onValue(monitoringRef, (snapshot) => {
            setMonitoring(snapshot.val() === true);
        });

        const unsubscribeFlexValue = onValue(flexValueRef, (snapshot) => {
            setFlexValue(snapshot.val() || 0);
        });

        const unsubscribeFlexHistory = onValue(flexHistoryRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const historyArray = Object.values(data).map((value, index) => ({
                    time: index,
                    value: value
                }));
                setFlexHistory(historyArray);
            }
        });

        return () => {
            unsubscribeProgress();
            unsubscribeCommand();
            unsubscribeEmergency();
            unsubscribeMonitoring();
            unsubscribeFlexValue();
            unsubscribeFlexHistory();
        };
    }, []);

    const startExercise = async () => {
        try {
            setExerciseComplete(false);
            await set(ref(db, 'glove'), {
                command: "START",
                cycles: Math.min(Math.max(cycles, 1), 10),
                holdDuration: holdDuration,
                progress: 0,
                emergencyStop: false,
                monitoring: false
            });
        } catch (error) {
            console.error("Error starting exercise:", error);
            alert("Failed to start exercise. Please try again.");
        }
    };

    const resetExercise = async () => {
        try {
            await set(ref(db, 'glove/command'), "READY");
            setProgress(0);
            setExerciseComplete(false);
        } catch (error) {
            console.error("Error resetting exercise:", error);
        }
    };

    const toggleMonitoring = async () => {
        try {
            await set(ref(db, 'glove/monitoring'), !monitoring);
            if (!monitoring) {
                await set(ref(db, 'glove/command'), "MONITORING");
            } else {
                await set(ref(db, 'glove/command'), "READY");
            }
        } catch (error) {
            console.error("Error toggling monitoring:", error);
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
            maxWidth: 800,
            mx: 'auto',
            mt: 4,
            '& .MuiFormControl-root': { mb: 3 }
        }}>
            <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Hand Rehabilitation Controller
            </Typography>

            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
                <Tab label="Guided Exercise" />
                <Tab label="Free Movement" />
            </Tabs>

            {activeTab === 0 ? (
                <>
                    {/* Guided Exercise Tab Content */}
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

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            variant="contained"
                            onClick={() => setConfirmOpen(true)}
                            disabled={isRunning || emergency || exerciseComplete}
                            fullWidth
                            sx={{ py: 2 }}
                        >
                            {exerciseComplete ? 'Exercise Completed' :
                                isRunning ? 'Exercise In Progress' : 'Start Exercise'}
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

                    {exerciseComplete && (
                        <Button
                            variant="outlined"
                            onClick={resetExercise}
                            fullWidth
                            sx={{ mt: 2 }}
                        >
                            Reset Exercise
                        </Button>
                    )}
                </>
            ) : (
                <>
                    {/* Free Movement Tab Content */}
                    <Typography variant="h6" gutterBottom>
                        Hand Movement Monitoring
                    </Typography>

                    <Box sx={{ height: 300, mb: 3 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={flexHistory}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time" />
                                <YAxis domain={[0, 4095]} />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#8884d8"
                                    activeDot={{ r: 8 }}
                                    name="Flex Sensor"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </Box>

                    <Typography variant="body1" sx={{ mb: 2 }}>
                        Current Flex Value: {flexValue}
                    </Typography>

                    <Button
                        variant="contained"
                        color={monitoring ? 'secondary' : 'primary'}
                        onClick={toggleMonitoring}
                        fullWidth
                        sx={{ py: 2 }}
                    >
                        {monitoring ? 'Stop Monitoring' : 'Start Monitoring'}
                    </Button>

                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleEmergencyStop}
                        disabled={!monitoring || emergency}
                        fullWidth
                        sx={{ py: 2, mt: 2 }}
                    >
                        {emergency ? 'System Stopped' : 'Emergency Release'}
                    </Button>
                </>
            )}

            {emergency && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    Emergency release activated! Reset the glove device to continue.
                </Alert>
            )}

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
