// Path: frontend/src/pages/RoomsPage.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js'; // CORRECTED PATH: Explicit .js extension
import { AuthContext } from '../context/AuthContext';
import './RoomsPage.css';

const RoomsPage = () => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await api.get('/rooms');
                setRooms(response.data);
            } catch (err) {
                console.error('Error fetching rooms:', err);
                setError('Failed to load rooms. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchRooms();
    }, []);

    const handleBookNow = (roomId) => {
        if (!user) {
            alert('Please log in to book a room.');
            navigate('/login');
        } else {
            navigate(`/book-room/${roomId}`);
        }
    };

    if (loading) {
        return <div className="rooms-container"><p>Loading rooms...</p></div>;
    }

    if (error) {
        return <div className="rooms-container error-message"><p>{error}</p></div>;
    }

    return (
        <div className="rooms-container">
            <h2>Our Rooms & Cottages</h2>
            <p className="rooms-intro">Discover your perfect stay with our selection of comfortable and luxurious rooms.</p>

            {rooms.length === 0 ? (
                <p>No rooms currently available. Please check back later!</p>
            ) : (
                <div className="rooms-list">
                    {rooms.map((room) => (
                        <div key={room.id} className="room-card">
                            <img
                                src={room.imageUrl || `https://placehold.co/400x250/007bff/ffffff?text=${room.type.replace(/\s/g, '+')}+${room.roomNumber}`}
                                alt={`${room.type} - Room ${room.roomNumber}`}
                                className="room-image"
                                onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/400x250/cccccc/333333?text=Image+Not+Found"; }}
                            />
                            <div className="room-info">
                                <h3>{room.type} (Room {room.roomNumber})</h3>
                                <p className="room-description">{room.description}</p>
                                <div className="room-details">
                                    <p>
                                        <strong>Price:</strong> ${
                                            typeof room.pricePerNight === 'number'
                                                ? room.pricePerNight.toFixed(2)
                                                : 'N/A'
                                        } / night
                                    </p>
                                    <p><strong>Capacity:</strong> {room.capacity} guests</p>
                                </div>
                                <button
                                    className="book-now-button"
                                    onClick={() => handleBookNow(room.id)}
                                >
                                    Book Now
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RoomsPage;