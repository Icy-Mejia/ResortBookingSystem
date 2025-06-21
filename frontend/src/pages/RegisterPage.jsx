// Path: frontend/src/pages/RegisterPage.jsx
import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext'; // Import AuthContext
import './RegisterPage.css'; // Import register page specific CSS

function RegisterPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const { register } = useContext(AuthContext); // Get the register function from AuthContext

    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevent default form submission

        setError(''); // Clear previous errors
        setMessage(''); // Clear previous messages

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        try {
            const result = await register(username, password); // Call the register function
            if (result.success) {
                setMessage(result.message || 'Registration successful! You can now log in.');
                setUsername('');
                setPassword('');
                setConfirmPassword('');
            } else {
                setError(result.message || 'Registration failed. Please try again.');
            }
        } catch (err) {
            console.error('Registration submission error:', err);
            setError('An unexpected error occurred during registration.');
        }
    };

    return (
        <div className="register-container">
            <div className="register-card">
                <h2>Register</h2>
                <p className="register-intro">Create your account to start booking your dream stay.</p>
                {message && <p className="success-message">{message}</p>}
                {error && <p className="error-message">{error}</p>}
                <form onSubmit={handleSubmit} className="register-form">
                    <div className="form-group">
                        <label htmlFor="username">Username:</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password:</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password:</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="register-button">Register</button>
                </form>
                <p className="login-link-text">
                    Already have an account? <Link to="/login">Login here</Link>
                </p>
            </div>
        </div>
    );
}

export default RegisterPage;