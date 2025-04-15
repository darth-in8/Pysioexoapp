import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../services/firebase';
import {
    Box,
    Typography,
    Paper,
    Card,
    CardContent,
    LinearProgress
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const DoctorDashboard = () => {
    const [flexValue, setFlexValue] = useState(0);
    const [flexHistory, setFlexHistory] = useState([]);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("READY");

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
        switch(status) {
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

    return (
        <Paper elevation={3} sx={{ p: 4, maxWidth: 1200, mx: 'auto', mt: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Patient Rehabilitation Monitor
            </Typography>

            <Box sx={{ display: 'flex', gap: 3, mb: 4 }}>
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