// Path: frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import api from '../api'; // Import your Axios instance
import { useNavigate } from 'react-router-dom';

// Create the AuthContext
export const AuthContext = createContext(null);

// Create the AuthProvider component to manage authentication state
export const AuthProvider = ({ children }) => {
    // State to hold user information (id, username, role)
    const [user, setUser] = useState(null);
    // State to hold the JWT token, initialized from localStorage if available
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    // Loading state for initial authentication check
    const [loading, setLoading] = useState(true);
    // Hook for programmatic navigation
    const navigate = useNavigate();

    // Effect to load user data when token changes or on initial component mount
    useEffect(() => {
        const loadUser = async () => {
            // If a token exists, try to set the user from localStorage or verify with backend
            if (token) {
                try {
                    // Attempt to parse user data from localStorage
                    const storedUser = JSON.parse(localStorage.getItem('user'));
                    if (storedUser) {
                        setUser(storedUser);
                    } else {
                        // If user data isn't in localStorage but token is,
                        // (Optional) you might try to hit a /api/me or /api/auth/me endpoint
                        // to fetch user details using the token.
                        // For this current backend setup (monolithic server.js),
                        // there's no explicit /api/me endpoint, so we'll just log an info.
                        console.info("Token found, but user data not in localStorage. Proceeding, but consider fetching user details from backend.");
                        // In a real app, you'd make an API call here like:
                        // const response = await api.get('/me', { headers: { Authorization: `Bearer ${token}` } });
                        // setUser(response.data.user);
                        // localStorage.setItem('user', JSON.stringify(response.data.user));
                    }
                } catch (error) {
                    // If any error occurs (e.g., token invalid, JSON parse error), clear auth state
                    console.error('Error loading user from token or localStorage:', error);
                    logout(); // Clear invalid token and user data
                }
            }
            setLoading(false); // Authentication check complete
        };

        loadUser();
    }, [token]); // Dependency array: re-run this effect if 'token' changes

    // Login function: authenticates user and sets token/user in state and localStorage
    const login = async (username, password) => {
        try {
            const response = await api.post('/login', { username, password });
            const { token: newToken, user: userData } = response.data; // Destructure token and user from response

            setToken(newToken); // Update token state
            setUser(userData); // Update user state
            localStorage.setItem('token', newToken); // Store token in localStorage
            localStorage.setItem('user', JSON.stringify(userData)); // Store user data in localStorage

            navigate('/'); // Redirect to the home page after successful login
            return { success: true }; // Return success status
        } catch (error) {
            // Log and return error message if login fails
            console.error('Login error:', error.response?.data?.message || error.message);
            return { success: false, message: error.response?.data?.message || 'Login failed' };
        }
    };

    // Register function: registers a new user
    const register = async (username, password, role = 'guest') => {
        try {
            const response = await api.post('/register', { username, password, role });
            navigate('/login'); // Redirect to login page after successful registration
            return { success: true, message: response.data.message }; // Return success message
        } catch (error) {
            // Log and return error message if registration fails
            console.error('Registration error:', error.response?.data?.message || error.message);
            return { success: false, message: error.response?.data?.message || 'Registration failed' };
        }
    };

    // Logout function: clears authentication state and redirects
    const logout = () => {
        setUser(null); // Clear user state
        setToken(null); // Clear token state
        localStorage.removeItem('token'); // Remove token from localStorage
        localStorage.removeItem('user'); // Remove user from localStorage
        navigate('/login'); // Redirect to login page
    };

    // Render loading state while authentication is being checked
    if (loading) {
        return <div>Loading authentication state...</div>; // You can replace this with a proper loading spinner
    }

    // Provide the authentication state and functions to children components via context
    return (
        <AuthContext.Provider value={{ user, token, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};