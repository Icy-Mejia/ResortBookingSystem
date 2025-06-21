// Path: frontend/src/pages/LoginPage.jsx
import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext'; // Import AuthContext
import './LoginPage.css'; // Import login page specific CSS

function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const { login } = useContext(AuthContext); // Get the login function from AuthContext
    const navigate = useNavigate(); // For programmatic navigation after login

    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevent default form submission

        setError(''); // Clear previous errors

        try {
            const result = await login(username, password); // Call the login function
            if (result.success) {
                // Login function already handles navigation on success
                // navigate('/'); // This line is handled by AuthContext, so it's commented out here
            } else {
                setError(result.message || 'Login failed. Please check your credentials.');
            }
        } catch (err) {
            console.error('Login submission error:', err);
            setError('An unexpected error occurred during login.');
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2>Login</h2>
                <p className="login-intro">Access your account to manage bookings.</p>
                {error && <p className="error-message">{error}</p>}
                <form onSubmit={handleSubmit} className="login-form">
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
                    <button type="submit" className="login-button">Login</button>
                </form>
                <p className="register-link-text">
                    Don't have an account? <Link to="/register">Register here</Link>
                </p>
            </div>
        </div>
    );
}

export default LoginPage;