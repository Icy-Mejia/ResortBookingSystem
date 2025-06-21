// Path: frontend/src/components/Header.jsx
import React, { useContext } from 'react';
import { NavLink, Link } from 'react-router-dom'; // NavLink for active styling, Link for general navigation
import { AuthContext } from '../context/AuthContext'; // Import AuthContext to access auth state
import './Header.css'; // Import header-specific CSS

const Header = () => {
    // Use useContext to access the user object and logout function from AuthContext
    const { user, logout } = useContext(AuthContext);

    // Handler for the logout button click
    const handleLogout = () => {
        logout(); // Call the logout function provided by AuthContext
        // The logout function already handles navigation to /login,
        // so no explicit navigate here is strictly necessary, but can be added if desired.
    };

    return (
        <header className="header">
            <nav className="navbar">
                {/* Brand logo/name linking to the home page */}
                <Link to="/" className="navbar-brand">Resort Booking</Link>

                {/* Navigation links */}
                <ul className="nav-links">
                    <li><NavLink to="/" className={({ isActive }) => isActive ? "active-link" : ""}>Home</NavLink></li>
                    <li><NavLink to="/rooms" className={({ isActive }) => isActive ? "active-link" : ""}>Rooms</NavLink></li>

                    {/* Conditionally render "My Bookings" link only if user is logged in */}
                    {user && (
                        <li>
                            <NavLink to="/my-bookings" className={({ isActive }) => isActive ? "active-link" : ""}>My Bookings</NavLink>
                        </li>
                    )}
                </ul>

                {/* Authentication controls (Login/Register or Welcome/Logout) */}
                <div className="auth-controls">
                    {user ? (
                        // If user is logged in, show welcome message and logout button
                        <>
                            <span className="welcome-message">Welcome, {user.username} ({user.role})</span>
                            <button onClick={handleLogout} className="logout-button">Logout</button>
                        </>
                    ) : (
                        // If no user is logged in, show Login and Register links
                        <>
                            <NavLink to="/login" className={({ isActive }) => isActive ? "active-link login-link" : "login-link"}>Login</NavLink>
                            <NavLink to="/register" className={({ isActive }) => isActive ? "active-link register-link" : "register-link"}>Register</NavLink>
                        </>
                    )}
                </div>
            </nav>
        </header>
    );
};

export default Header;