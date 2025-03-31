import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../services/firebase';
import {
    Box, Typography, Paper, Table,
    TableBody, TableCell, TableContainer,
    TableHead, TableRow, LinearProgress
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

export default function DoctorView() {
    const [sessions, setSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);

    useEffect(() => {
        const sessionsRef = ref(db, 'doctor/analysis');
        onValue(sessionsRef, (snapshot) => {
            const data = [];
            snapshot.forEach((child) => {
                data.push({
                    id: child.key,
                    timestamp: new Date(Number(child.key)).toLocaleString(),
                    data: child.val()
                });
            });
            setSessions(data.reverse()); // Newest first
        });
    }, []);

    const formatGraphData = (rawData) => {
        return Object.entries(rawData).map(([key, value]) => ({
            time: parseFloat(key.substring(2)), // extracts m_1.5 → 1.5
            value
        })).sort((a,b) => a.time - b.time);
    };

    return (
        <Paper elevation={3} sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom>
                Patient Movement Analysis
            </Typography>

            <TableContainer sx={{ mb: 4 }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Session Time</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sessions.map((session) => (
                            <TableRow key={session.id}>
                                <TableCell>{session.timestamp}</TableCell>
                                <TableCell>
                                    <Button onClick={() => setSelectedSession(session)}>
                                        View Details
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {selectedSession && (
                <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" gutterBottom>
                        Session: {selectedSession.timestamp}
                    </Typography>
                    <Box sx={{ height: 400 }}>
                        <LineChart
                            width={800}
                            height={400}
                            data={formatGraphData(selectedSession.data)}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <XAxis dataKey="time" label="Time (seconds)" />
                            <YAxis label="Movement Range" domain={[0, 1023]} />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke="#8884d8" />
                        </LineChart>
                    </Box>
                </Box>
            )}
        </Paper>
    );
}