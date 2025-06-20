import React, { useState, useEffect, useRef } from 'react';
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
    Tab,
    Chip
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Exercise Presets
const HAND_PRESETS = [
    { id: 1, name: "Basic Flexion", cycles: 5, duration: 5, description: "Standard flexion exercise (5s hold)" },
    { id: 2, name: "Intensive Rehab", cycles: 8, duration: 8, description: "Longer holds for intensive therapy" },
    { id: 3, name: "Gentle Warm-up", cycles: 3, duration: 3, description: "Shorter holds for warm-up" }
];

const EXOSKELETON_PRESETS = [
    { id: 1, name: "Basic Movement", sets: 4, duration: 2, presetValue: 1 },
    { id: 2, name: "Strength Training", sets: 6, duration: 3, presetValue: 2 },
    { id: 3, name: "Recovery Mode", sets: 3, duration: 1, presetValue: 3 }
];

const HOLD_DURATIONS = [
    { value: 3, label: "3s" },
    { value: 5, label: "5s" },
    { value: 8, label: "8s" }
];

// WebSocket configuration
const WEBSOCKET_URL = 'ws://192.168.1.8/ws'; // Replace with your ESP32 IP address

const PatientDashboard = () => {
    // Tab state
    const [activeTab, setActiveTab] = useState(0);

    // WebSocket states
    const [wsConnection, setWsConnection] = useState(null);
    const [wsStatus, setWsStatus] = useState('Disconnected');
    const [selectedPreset, setSelectedPreset] = useState(null);
    const wsRef = useRef(null);

    // Hand rehabilitation states
    const [isHandRunning, setIsHandRunning] = useState(false);
    const [cycles, setCycles] = useState(5);
    const [handProgress, setHandProgress] = useState(0);
    const [holdDuration, setHoldDuration] = useState(5);
    const [emergency, setEmergency] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [monitoring, setMonitoring] = useState(false);
    const [flexValue, setFlexValue] = useState(0);
    const [flexHistory, setFlexHistory] = useState([]);
    const [handExerciseComplete, setHandExerciseComplete] = useState(false);

    // Exoskeleton states
    const [exoSets, setExoSets] = useState(4);
    const [exoSpeed, setExoSpeed] = useState(150);
    const [exoStatus, setExoStatus] = useState("Ready");
    const [exoMovements, setExoMovements] = useState(0);
    const [exoConfirmOpen, setExoConfirmOpen] = useState(false);
    const [isExoRunning, setIsExoRunning] = useState(false);

    // WebSocket connection management
    useEffect(() => {
        connectWebSocket();

        // Cleanup on component unmount
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    const connectWebSocket = () => {
        try {
            const ws = new WebSocket(WEBSOCKET_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('WebSocket connected to ESP32');
                setWsStatus('Connected');
                setWsConnection(ws);
            };

            ws.onmessage = (event) => {
                console.log('Message from ESP32:', event.data);
                // Handle messages from ESP32 if needed
                try {
                    const data = JSON.parse(event.data);
                    if (data.status) {
                        setExoStatus(data.status);
                    }
                    if (data.movements !== undefined) {
                        setExoMovements(data.movements);
                    }
                } catch (e) {
                    // Handle non-JSON messages
                    console.log('Non-JSON message:', event.data);
                }
            };

            ws.onclose = () => {
                console.log('WebSocket disconnected');
                setWsStatus('Disconnected');
                setWsConnection(null);
                // Attempt to reconnect after 3 seconds
                setTimeout(connectWebSocket, 3000);
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                setWsStatus('Error');
            };

        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            setWsStatus('Error');
        }
    };

    const sendWebSocketMessage = (message) => {
        if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
            wsConnection.send(JSON.stringify(message));
            console.log('Sent to ESP32:', message);
            return true;
        } else {
            console.error('WebSocket not connected');
            alert('WebSocket not connected to ESP32. Please check connection.');
            return false;
        }
    };

    // Simulate exoskeleton movement
    useEffect(() => {
        let interval;
        if (exoStatus === "Running") {
            interval = setInterval(() => {
                setExoMovements(prev => {
                    const newCount = prev + 1;
                    if (newCount >= exoSets * 5) { // Assume 5 movements per set
                        setExoStatus("Complete");
                        // Send completion message to ESP32
                        sendWebSocketMessage({ command: "STOP", reason: "completed" });
                        return newCount;
                    }
                    return newCount;
                });
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [exoStatus, exoSets, wsConnection]);

    // Firebase listeners for hand rehabilitation
    useEffect(() => {
        const progressRef = ref(db, 'glove/progress');
        const commandRef = ref(db, 'glove/command');
        const emergencyRef = ref(db, 'glove/emergencyStop');
        const monitoringRef = ref(db, 'glove/monitoring');
        const flexValueRef = ref(db, 'glove/flexValue');
        const flexHistoryRef = ref(db, 'glove/flexHistory');

        const unsubscribeProgress = onValue(progressRef, (snapshot) => {
            const newProgress = snapshot.val() || 0;
            setHandProgress(newProgress);
            if (newProgress >= 100) {
                setHandExerciseComplete(true);
            }
        });

        const unsubscribeCommand = onValue(commandRef, (snapshot) => {
            const command = snapshot.val();
            setIsHandRunning(command === "START");
            if (command === "DONE") {
                setIsHandRunning(false);
                setHandExerciseComplete(true);
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

    // Hand rehabilitation functions
    const startHandExercise = async () => {
        try {
            setHandExerciseComplete(false);
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

    const resetHandExercise = async () => {
        try {
            await set(ref(db, 'glove/command'), "READY");
            setHandProgress(0);
            setHandExerciseComplete(false);
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
            // Send emergency stop to ESP32
            if (wsConnection) {
                sendWebSocketMessage({ command: "EMERGENCY_STOP" });
            }

            // Firebase emergency stop for hand rehabilitation
            await set(ref(db, 'glove/emergencyStop'), true);
            setExoStatus("Emergency Stop");
            setIsExoRunning(false);
            setEmergency(true);
        } catch (error) {
            console.error("Emergency stop failed:", error);
            alert("Emergency stop failed! Check device connection.");
        }
    };

    const applyHandPreset = (preset) => {
        if (!isHandRunning) {
            setCycles(preset.cycles);
            setHoldDuration(preset.duration);
        }
    };

    // Exoskeleton functions
    const startExoskeleton = () => {
        try {
            if (!selectedPreset) {
                alert("Please select a preset first!");
                return;
            }

            // Send preset value to ESP32
            const success = sendWebSocketMessage({
                command: "START_PRESET",
                preset: selectedPreset.presetValue,
                sets: exoSets,
                duration: exoSpeed
            });

            if (success) {
                setExoStatus("Running");
                setExoMovements(0);
                setIsExoRunning(true);
            }
        } catch (error) {
            console.error("Error starting exoskeleton:", error);
            alert("Failed to start exoskeleton exercise. Please try again.");
        }
    };

    const resetExoskeleton = () => {
        // Send reset command to ESP32
        sendWebSocketMessage({ command: "RESET" });

        setExoStatus("Ready");
        setExoMovements(0);
        setIsExoRunning(false);
        setSelectedPreset(null);
        setEmergency(false);
    };

    const applyExoPreset = (preset) => {
        if (!isExoRunning) {
            setExoSets(preset.sets);
            setExoSpeed(preset.duration);
            setSelectedPreset(preset);

            // Send preset selection to ESP32 (without starting)
            sendWebSocketMessage({
                command: "SELECT_PRESET",
                preset: preset.presetValue,
                sets: preset.sets,
                duration: preset.duration
            });
        }
    };

    const currentCycle = handProgress > 0 ? Math.ceil(handProgress / (100 / cycles)) : 0;

    return (
        <Paper elevation={3} sx={{
            p: 4,
            maxWidth: 1000,
            mx: 'auto',
            mt: 4,
            '& .MuiFormControl-root': { mb: 3 }
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold' }}>
                    Patient Dashboard
                </Typography>
                <Chip
                    label={`WebSocket: ${wsStatus}`}
                    color={wsStatus === 'Connected' ? 'success' : wsStatus === 'Error' ? 'error' : 'default'}
                    variant="outlined"
                />
            </Box>

            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
                <Tab label="Hand Rehabilitation" />
                <Tab label="Exoskeleton Control" />
                <Tab label="Free Movement" />
            </Tabs>

            {activeTab === 0 ? (
                <>
                    {/* Hand Rehabilitation Tab Content */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" component="h2" gutterBottom>
                            Exercise Presets:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {HAND_PRESETS.map((preset) => (
                                <Button
                                    key={preset.id}
                                    variant="outlined"
                                    onClick={() => applyHandPreset(preset)}
                                    disabled={isHandRunning}
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
                            disabled={isHandRunning}
                        />
                    </Box>

                    <FormControl fullWidth sx={{ mb: 3 }}>
                        <InputLabel>Hold Duration</InputLabel>
                        <Select
                            value={holdDuration}
                            onChange={(e) => setHoldDuration(e.target.value)}
                            disabled={isHandRunning}
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
                            Exercise Progress: {handProgress}%
                        </Typography>
                        <LinearProgress
                            variant="determinate"
                            value={handProgress}
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
                            disabled={isHandRunning || emergency || handExerciseComplete}
                            fullWidth
                            sx={{ py: 2 }}
                        >
                            {handExerciseComplete ? 'Exercise Completed' :
                                isHandRunning ? 'Exercise In Progress' : 'Start Exercise'}
                        </Button>

                        <Button
                            variant="contained"
                            color="error"
                            onClick={handleEmergencyStop}
                            disabled={!isHandRunning || emergency}
                            fullWidth
                            sx={{ py: 2 }}
                        >
                            {emergency ? 'System Stopped' : 'Emergency Release'}
                        </Button>
                    </Box>

                    {handExerciseComplete && (
                        <Button
                            variant="outlined"
                            onClick={resetHandExercise}
                            fullWidth
                            sx={{ mt: 2 }}
                        >
                            Reset Exercise
                        </Button>
                    )}
                </>
            ) : activeTab === 1 ? (
                <>
                    {/* Exoskeleton Control Tab Content */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" component="h2" gutterBottom>
                            Exoskeleton Presets:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {EXOSKELETON_PRESETS.map((preset) => (
                                <Button
                                    key={preset.id}
                                    variant={selectedPreset?.id === preset.id ? "contained" : "outlined"}
                                    onClick={() => applyExoPreset(preset)}
                                    disabled={isExoRunning}
                                    sx={{ mb: 1 }}
                                >
                                    <Box textAlign="center">
                                        <Typography>{preset.name}</Typography>
                                        <Typography variant="caption" display="block">
                                            Preset {preset.presetValue} - {preset.sets} sets @ {preset.duration} sec duration
                                        </Typography>
                                    </Box>
                                </Button>
                            ))}
                        </Box>
                        {selectedPreset && (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                Selected: {selectedPreset.name} (Preset {selectedPreset.presetValue})
                            </Alert>
                        )}
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography id="sets-slider" gutterBottom>
                            Number of Sets: {exoSets}
                        </Typography>
                        <Slider
                            value={exoSets}
                            onChange={(e, newValue) => setExoSets(newValue)}
                            min={1}
                            max={10}
                            step={1}
                            marks
                            valueLabelDisplay="auto"
                            disabled={isExoRunning}
                        />
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography id="speed-slider" gutterBottom>
                            Duration in Seconds: {exoSpeed}
                        </Typography>
                        <Slider
                            value={exoSpeed}
                            onChange={(e, newValue) => setExoSpeed(newValue)}
                            min={0.5}
                            max={3.5}
                            step={0.5}
                            marks={[
                                { value: 0.5, label: '0.5' },
                                { value: 3.5, label: '3.5' }
                            ]}
                            valueLabelDisplay="auto"
                            disabled={isExoRunning}
                        />
                    </Box>

                    <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body1">Status:</Typography>
                            <Typography
                                variant="body1"
                                sx={{
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: 1,
                                    bgcolor: exoStatus === "Running" ? 'success.light' :
                                        exoStatus === "Complete" ? 'info.light' :
                                            exoStatus === "Emergency Stop" ? 'error.light' :
                                                'grey.300',
                                    color: exoStatus === "Running" ? 'success.contrastText' :
                                        exoStatus === "Complete" ? 'info.contrastText' :
                                            exoStatus === "Emergency Stop" ? 'error.contrastText' :
                                                'grey.800'
                                }}
                            >
                                {exoStatus}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="body1">Movement Count:</Typography>
                            <Typography variant="h6">{exoMovements}</Typography>
                        </Box>
                        {exoStatus === "Running" && (
                            <Box sx={{ mt: 2 }}>
                                <LinearProgress
                                    variant="determinate"
                                    value={(exoMovements / (exoSets * 5)) * 100}
                                    sx={{ height: 10, borderRadius: 5 }}
                                />
                                <Typography variant="body2" sx={{ mt: 1, textAlign: 'right' }}>
                                    Progress: {Math.round((exoMovements / (exoSets * 5)) * 100)}%
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            variant="contained"
                            onClick={() => setExoConfirmOpen(true)}
                            disabled={isExoRunning || emergency || exoStatus === "Complete" || !selectedPreset || wsStatus !== 'Connected'}
                            fullWidth
                            sx={{ py: 2 }}
                        >
                            {exoStatus === "Complete" ? 'Exercise Completed' :
                                isExoRunning ? 'Exoskeleton Active' :
                                    !selectedPreset ? 'Select Preset First' :
                                        wsStatus !== 'Connected' ? 'WebSocket Disconnected' :
                                            'Start Exoskeleton'}
                        </Button>

                        <Button
                            variant="contained"
                            color="error"
                            onClick={handleEmergencyStop}
                            disabled={!isExoRunning || emergency}
                            fullWidth
                            sx={{ py: 2 }}
                        >
                            {emergency ? 'System Stopped' : 'Emergency Stop'}
                        </Button>
                    </Box>

                    {(exoStatus === "Complete" || emergency) && (
                        <Button
                            variant="outlined"
                            onClick={resetExoskeleton}
                            fullWidth
                            sx={{ mt: 2 }}
                        >
                            Reset Exoskeleton
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
                    Emergency release activated! Reset the system to continue.
                </Alert>
            )}

            {wsStatus !== 'Connected' && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                    WebSocket not connected to ESP32. Some features may not work properly.
                </Alert>
            )}

            {/* Hand Exercise Confirmation Dialog */}
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
                        startHandExercise();
                        setConfirmOpen(false);
                    }} autoFocus>
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Exoskeleton Confirmation Dialog */}
            <Dialog open={exoConfirmOpen} onClose={() => setExoConfirmOpen(false)}>
                <DialogTitle>Confirm Exoskeleton Start</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        This will start {selectedPreset?.name} (Preset {selectedPreset?.presetValue}) with {exoSets} sets at speed {exoSpeed}.
                        Ensure the exoskeleton is properly fitted.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setExoConfirmOpen(false)}>Cancel</Button>
                    <Button onClick={() => {
                        startExoskeleton();
                        setExoConfirmOpen(false);
                    }} autoFocus>
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default PatientDashboard;