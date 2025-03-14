// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        // Basic validation
        if (!email || !password) {
            setError('Please fill in all fields.');
            return;
        }

        // Simulate login (replace with actual API call)
        if (email === 'patient@example.com' && password === 'patient123') {
            navigate('/patient'); // Redirect to Patient Dashboard
        } else if (email === 'doctor@example.com' && password === 'doctor123') {
            navigate('/doctor'); // Redirect to Doctor Dashboard
        } else {
            setError('Invalid email or password.');
        }
    };

    return (
        <div>
            <h1>Login</h1>
            <form onSubmit={handleLogin}>
                <div>
                    <label>Email:</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Password:</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <button type="submit">Login</button>
            </form>
        </div>
    );
};

export default Login;