// Path: frontend/src/pages/BookRoomPage.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api.js'; // CORRECTED PATH: Explicit .js extension
import { AuthContext } from '../context/AuthContext';
import './BookRoomPage.css';

const BookRoomPage = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user, token } = useContext(AuthContext);

    const [room, setRoom] = useState(null);
    const [checkInDate, setCheckInDate] = useState('');
    const [checkOutDate, setCheckOutDate] = useState('');
    const [guests, setGuests] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (!user) {
            navigate('/login');
            alert('Please log in to book a room.');
            return;
        }

        const fetchRoomDetails = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/rooms/${roomId}`);
                setRoom(response.data);
            } catch (err) {
                console.error('Error fetching room details:', err);
                setError('Failed to load room details.');
            } finally {
                setLoading(false);
            }
        };

        fetchRoomDetails();
    }, [roomId, user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage('');

        if (!checkInDate || !checkOutDate || !guests) {
            setError('Please fill in all booking details.');
            return;
        }

        if (new Date(checkOutDate) <= new Date(checkInDate)) {
            setError('Check-out date must be after check-in date.');
            return;
        }

        if (guests <= 0 || guests > room.capacity) {
            setError(`Number of guests must be between 1 and ${room.capacity}.`);
            return;
        }

        try {
            const response = await api.post('/bookings', {
                room_id: parseInt(roomId),
                check_in_date: checkInDate,
                check_out_date: checkOutDate,
                guests: parseInt(guests),
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setSuccessMessage('Room booked successfully! Redirecting to My Bookings...');
            setTimeout(() => {
                navigate('/my-bookings');
            }, 2000);

        } catch (err) {
            console.error('Booking error:', err.response?.data?.message || err.message);
            setError(err.response?.data?.message || 'Failed to book room. Please try again.');
        }
    };

    if (loading) {
        return <div className="book-room-container"><p>Loading room details...</p></div>;
    }

    if (error && !room) {
        return <div className="book-room-container error-message"><p>{error}</p></div>;
    }

    if (!room) {
        return <div className="book-room-container"><p>Room not found.</p></div>;
    }

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const minCheckInDate = today.toISOString().split('T')[0];
    const minCheckOutDate = checkInDate ? new Date(new Date(checkInDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] : tomorrow.toISOString().split('T')[0];

    return (
        <div className="book-room-container">
            <div className="booking-card">
                <h2>Book Room: {room.type} (Room {room.roomNumber})</h2>
                <p><strong>Price per night:</strong> ${typeof room.pricePerNight === 'number' ? room.pricePerNight.toFixed(2) : 'N/A'}</p>
                <p><strong>Capacity:</strong> {room.capacity} guests</p>
                <p>{room.description}</p>

                {successMessage && <p className="success-message">{successMessage}</p>}
                {error && <p className="error-message">{error}</p>}

                <form onSubmit={handleSubmit} className="booking-form">
                    <div className="form-group">
                        <label htmlFor="checkInDate">Check-in Date:</label>
                        <input
                            type="date"
                            id="checkInDate"
                            value={checkInDate}
                            onChange={(e) => setCheckInDate(e.target.value)}
                            min={minCheckInDate}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="checkOutDate">Check-out Date:</label>
                        <input
                            type="date"
                            id="checkOutDate"
                            value={checkOutDate}
                            onChange={(e) => setCheckOutDate(e.target.value)}
                            min={minCheckOutDate}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="guests">Number of Guests (Max: {room.capacity}):</label>
                        <input
                            type="number"
                            id="guests"
                            value={guests}
                            onChange={(e) => setGuests(e.target.value)}
                            min="1"
                            max={room.capacity}
                            required
                        />
                    </div>
                    <button type="submit" className="submit-booking-button">Confirm Booking</button>
                </form>
            </div>
        </div>
    );
};

export default BookRoomPage;