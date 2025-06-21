// Path: frontend/src/pages/BookingsPage.jsx
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api.js'; // CORRECTED PATH: Explicit .js extension
import './BookingsPage.css';

const BookingsPage = () => {
    const { user, token } = useContext(AuthContext);

    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBookings = async () => {
            if (!user || !token) {
                setLoading(false);
                setError('Please log in to view your bookings.');
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const response = await api.get('/bookings/my', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                setBookings(response.data);
            } catch (err) {
                console.error('Error fetching bookings:', err);
                if (err.response) {
                    setError(err.response.data.message || 'Failed to fetch bookings.');
                } else {
                    setError('Network error or server unreachable. Failed to fetch bookings.');
                }
                setBookings([]);
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
    }, [user, token]);

    const formatBookingDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    if (loading) {
        return <div className="bookings-container"><p>Loading bookings...</p></div>;
    }

    if (error) {
        return <div className="bookings-container"><p className="error-message">{error}</p></div>;
    }

    return (
        <div className="bookings-container">
            <h2>My Bookings</h2>
            <p className="bookings-intro">View and manage your current and past reservations.</p>

            {bookings.length === 0 ? (
                <p>You don't have any bookings yet. Go to the <Link to="/rooms">Rooms</Link> page to make a reservation!</p>
            ) : (
                <div className="bookings-list">
                    {bookings.map((booking) => (
                        <div key={booking.id} className="booking-card">
                            <h3>Booking #{booking.id} for Room {booking.roomNumber} ({booking.roomType})</h3>
                            <p><strong>Check-in:</strong> {formatBookingDate(booking.check_in_date)}</p>
                            <p><strong>Check-out:</strong> {formatBookingDate(booking.check_out_date)}</p>
                            <p><strong>Guests:</strong> {booking.guests}</p>
                            <p><strong>Total Price:</strong> ${booking.total_price ? booking.total_price.toFixed(2) : 'N/A'}</p>
                            <p><strong>Status:</strong> <span className={`booking-status status-${booking.status.toLowerCase()}`}>{booking.status}</span></p>
                            <p><strong>Booked on:</strong> {new Date(booking.created_at).toLocaleString()}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BookingsPage;