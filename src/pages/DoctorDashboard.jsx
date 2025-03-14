// src/pages/DoctorDashboard.jsx
import React from 'react';
import {
    Container,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Slide,
} from '@mui/material';

const patients = [
    { id: 1, name: 'John Doe', progress: 70 },
    { id: 2, name: 'Jane Smith', progress: 50 },
];

const DoctorDashboard = () => {
    return (
        <Container maxWidth="md">
            <Slide direction="up" in={true} mountOnEnter unmountOnExit>
                <Paper elevation={3} sx={{ padding: 4, marginTop: 4, borderRadius: 4 }}>
                    <Typography variant="h4" align="center" gutterBottom>
                        Doctor Dashboard
                    </Typography>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Patient Name</TableCell>
                                    <TableCell align="right">Progress</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {patients.map((patient) => (
                                    <TableRow key={patient.id}>
                                        <TableCell>{patient.name}</TableCell>
                                        <TableCell align="right">{patient.progress}%</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Slide>
        </Container>
    );
};

export default DoctorDashboard;