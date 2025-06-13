import React, { useState, useEffect, useRef } from 'react';
import { ref, onValue, set, get } from 'firebase/database';
import { db } from '../services/firebase';
import {
    Box,
    Typography,
    Paper,
    Card,
    CardContent,
    LinearProgress,
    Button
} from '@mui/material';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

const DoctorDashboard = () => {
    const [flexValue, setFlexValue] = useState(0);
    const [flexHistory, setFlexHistory] = useState([]);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("READY");

    const [deadPulseResult, setDeadPulseResult] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const intervalIdRef = useRef(null);
    const pulseDataRef = useRef([]);

    useEffect(() => {
        const flexValueRef = ref(db, 'glove/flexValue');
        const flexHistoryRef = ref(db, 'glove/flexHistory');
        const progressRef = ref(db, 'glove/progress');
        const commandRef = ref(db, 'glove/command');

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

        const unsubscribeProgress = onValue(progressRef, (snapshot) => {
            setProgress(snapshot.val() || 0);
        });

        const unsubscribeCommand = onValue(commandRef, (snapshot) => {
            setStatus(snapshot.val() || "READY");
        });

        return () => {
            unsubscribeFlexValue();
            unsubscribeFlexHistory();
            unsubscribeProgress();
            unsubscribeCommand();
        };
    }, []);

    const getStatusColor = () => {
        switch (status) {
            case "START":
                return "primary.main";
            case "MONITORING":
                return "secondary.main";
            case "EMERGENCY_STOP":
                return "error.main";
            default:
                return "success.main";
        }
    };

    const calculateImprovement = (current, previous) => {
        if (!current?.length || !previous?.length) return "Not enough data";

        const avgCurrent = current.reduce((a, b) => a + b, 0) / current.length;
        const avgPrevious = previous.reduce((a, b) => a + b, 0) / previous.length;

        const diff = avgCurrent - avgPrevious;
        const percent = ((diff / avgPrevious) * 100).toFixed(2);

        return percent >= 0
            ? `Improved by ${percent}%`
            : `Decreased by ${Math.abs(percent)}%`;
    };

    const startDeadPulse = async () => {
        if (isRecording) return;

        setIsRecording(true);
        setStatus("RECORDING_DEAD_PULSE");
        pulseDataRef.current = [];
        let count = 0;

        intervalIdRef.current = setInterval(() => {
            pulseDataRef.current.push(flexValue);
            count++;
            if (count >= 30) {
                stopDeadPulse(true); // Auto-stop after 30s
            }
        }, 1000);
    };

    const stopDeadPulse = async (autoStop = false) => {
        if (!isRecording) return;
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
        setIsRecording(false);
        setStatus("READY");

        if (pulseDataRef.current.length === 0) return;

        const data = [...pulseDataRef.current];
        const currentRef = ref(db, 'glove/deadPulse/current');
        const previousRef = ref(db, 'glove/deadPulse/previous');

        const currentSnap = await get(currentRef);
        if (currentSnap.exists()) {
            await set(previousRef, currentSnap.val());
        }

        await set(currentRef, {
            timestamp: Date.now(),
            data
        });

        const prevSnap = await get(previousRef);
        const result = calculateImprovement(data, prevSnap.val()?.data || []);
        setDeadPulseResult(result);
    };

    // Load previous result once on mount
    useEffect(() => {
        const loadResult = async () => {
            const currentRef = ref(db, 'glove/deadPulse/current');
            const previousRef = ref(db, 'glove/deadPulse/previous');

            const [currentSnap, previousSnap] = await Promise.all([get(currentRef), get(previousRef)]);
            const currentData = currentSnap.val()?.data || [];
            const previousData = previousSnap.val()?.data || [];
            const result = calculateImprovement(currentData, previousData);
            setDeadPulseResult(result);
        };

        loadResult();
    }, []);

    return (
        <Paper elevation={3} sx={{ p: 4, maxWidth: 1200, mx: 'auto', mt: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Patient Rehabilitation Monitor
            </Typography>

            <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
                <Card sx={{ minWidth: 200 }}>
                    <CardContent>
                        <Typography color="text.secondary">Current Status</Typography>
                        <Typography variant="h5" sx={{ color: getStatusColor() }}>
                            {status.replace("_", " ")}
                        </Typography>
                    </CardContent>
                </Card>

                <Card sx={{ minWidth: 200 }}>
                    <CardContent>
                        <Typography color="text.secondary">Current Flex Value</Typography>
                        <Typography variant="h5">{flexValue}</Typography>
                    </CardContent>
                </Card>

                <Card sx={{ minWidth: 200 }}>
                    <CardContent>
                        <Typography color="text.secondary">Exercise Progress</Typography>
                        <Typography variant="h5">{progress}%</Typography>
                        <LinearProgress
                            variant="determinate"
                            value={progress}
                            sx={{ height: 8, mt: 1 }}
                        />
                    </CardContent>
                </Card>

                <Card sx={{ minWidth: 300 }}>
                    <CardContent>
                        <Typography color="text.secondary">Dead Pulse Result</Typography>
                        <Typography variant="body1">{deadPulseResult}</Typography>
                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                            <Button
                                variant="contained"
                                onClick={startDeadPulse}
                                disabled={isRecording}
                            >
                                Start Dead Pulse
                            </Button>
                            <Button
                                variant="outlined"
                                color="error"
                                onClick={() => stopDeadPulse(false)}
                                disabled={!isRecording}
                            >
                                Stop
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            <Typography variant="h6" gutterBottom>
                Flex Sensor Data History
            </Typography>
            <Box sx={{ height: 400 }}>
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
        </Paper>
    );
};

export default DoctorDashboard;
