// Path: backend/server.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs'); // For password hashing
const jwt = require('jsonwebtoken'); // For creating and verifying tokens
const cors = require('cors'); // Import cors

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET; // Access JWT_SECRET from .env

// Connect to SQLite database
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Initialize database tables
        db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'user' -- 'user' or 'admin'
            );

            CREATE TABLE IF NOT EXISTS rooms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                room_number TEXT UNIQUE NOT NULL,
                description TEXT,
                price_per_night REAL NOT NULL,
                capacity INTEGER NOT NULL,
                image_url TEXT,
                availability BOOLEAN DEFAULT 1 -- 1 for available, 0 for booked/unavailable
            );

            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                room_id INTEGER NOT NULL,
                check_in_date TEXT NOT NULL,
                check_out_date TEXT NOT NULL,
                guests INTEGER NOT NULL,
                total_price REAL NOT NULL,
                status TEXT DEFAULT 'confirmed', -- e.g., 'confirmed', 'cancelled', 'pending'
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (room_id) REFERENCES rooms(id)
            );
        `);

        // Seed a default admin user if not exists (optional)
        db.get("SELECT * FROM users WHERE username = 'admin'", [], (err, row) => {
            if (!row) {
                bcrypt.hash('adminpassword', 10, (err, hash) => {
                    if (err) {
                        console.error('Error hashing admin password:', err.message);
                        return;
                    }
                    db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['admin', hash, 'admin'], (err) => {
                        if (err) {
                            console.error('Error seeding admin user:', err.message);
                        } else {
                            console.log('Admin user seeded.');
                        }
                    });
                });
            }
        });

        // Seed some default rooms if not exists (optional)
        db.get("SELECT COUNT(*) as count FROM rooms", [], (err, row) => {
            if (row.count === 0) {
                const rooms = [
                    { type: 'Standard Room', room_number: '101', description: 'Cozy room with a garden view.', price_per_night: 100.00, capacity: 2, image_url: 'https://images.unsplash.com/photo-1596436889110-6127702888d3?q=80&w=1770&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
                    { type: 'Deluxe Room', room_number: '201', description: 'Spacious room with a city view and king-size bed.', price_per_night: 150.00, capacity: 3, image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1770&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
                    { type: 'Suite', room_number: '301', description: 'Luxury suite with separate living area and balcony.', price_per_night: 250.00, capacity: 4, image_url: 'https://images.unsplash.com/photo-1540541338287-f82e0e402b92?q=80&w=1770&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
                    { type: 'Family Cottage', room_number: '401', description: 'Spacious cottage ideal for families, with two bedrooms.', price_per_night: 300.00, capacity: 5, image_url: 'https://images.unsplash.com/photo-1571004381273-90d402324e93?q=80&w=1770&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }
                ];
                const stmt = db.prepare("INSERT INTO rooms (type, room_number, description, price_per_night, capacity, image_url) VALUES (?, ?, ?, ?, ?, ?)");
                rooms.forEach(room => {
                    stmt.run(room.type, room.room_number, room.description, room.price_per_night, room.capacity, room.image_url);
                });
                stmt.finalize(() => {
                    console.log('Default rooms seeded.');
                });
            }
        });
    }
});

// Middleware
app.use(express.json()); // For parsing application/json
app.use(cors()); // Use cors middleware

// JWT verification middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ message: 'Authorization token required' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT verification error:', err);
            return res.status(403).json({ message: 'Token invalid or expired' });
        }
        req.user = user; // Attach user payload to request
        next();
    });
};

// --- API Routes ---

// User Registration
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            return res.status(500).json({ message: 'Error hashing password', error: err.message });
        }
        const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
        db.run(sql, [username, hash], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed: users.username')) {
                    return res.status(409).json({ message: 'Username already exists' });
                }
                return res.status(500).json({ message: 'Error registering user', error: err.message });
            }
            res.status(201).json({ message: 'User registered successfully', userId: this.lastID });
        });
    });
});

// User Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    const sql = 'SELECT * FROM users WHERE username = ?';
    db.get(sql, [username], (err, user) => {
        if (err) {
            return res.status(500).json({ message: 'Error retrieving user', error: err.message });
        }
        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                return res.status(500).json({ message: 'Error comparing passwords', error: err.message });
            }
            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid username or password' });
            }

            // User authenticated, create JWT
            const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
            res.json({ message: 'Logged in successfully', token, user: { id: user.id, username: user.username, role: user.role } });
        });
    });
});

// Get all rooms (public)
app.get('/api/rooms', (req, res) => {
    const sql = 'SELECT id, type, room_number, description, price_per_night, capacity, image_url, availability FROM rooms';
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ message: 'Error retrieving rooms', error: err.message });
            return;
        }
        const rooms = rows.map(row => ({
            id: row.id,
            type: row.type,
            roomNumber: row.room_number,
            description: row.description,
            pricePerNight: row.price_per_night,
            capacity: row.capacity,
            imageUrl: row.image_url,
            availability: row.availability === 1
        }));
        res.json(rooms);
    });
});

// NEW ROUTE: Get a single room by ID (public)
app.get('/api/rooms/:id', (req, res) => {
    const roomId = req.params.id;
    const sql = 'SELECT id, type, room_number, description, price_per_night, capacity, image_url, availability FROM rooms WHERE id = ?';

    db.get(sql, [roomId], (err, row) => {
        if (err) {
            console.error('Error retrieving room by ID:', err.message);
            res.status(500).json({ message: 'Error retrieving room', error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ message: 'Room not found' });
            return;
        }
        const room = {
            id: row.id,
            type: row.type,
            roomNumber: row.room_number,
            description: row.description,
            pricePerNight: row.price_per_night,
            capacity: row.capacity,
            imageUrl: row.image_url,
            availability: row.availability === 1
        };
        res.json(room);
    });
});

// Create a new booking (requires authentication)
app.post('/api/bookings', authenticateToken, (req, res) => {
    const { room_id, check_in_date, check_out_date, guests } = req.body;
    const user_id = req.user.id; // User ID from authenticated token

    if (!room_id || !check_in_date || !check_out_date || !guests) {
        return res.status(400).json({ message: 'All booking fields are required.' });
    }

    // Convert dates to Date objects for comparison
    const inDate = new Date(check_in_date);
    const outDate = new Date(check_out_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date

    if (inDate < today) {
        return res.status(400).json({ message: 'Check-in date cannot be in the past.' });
    }
    if (outDate <= inDate) {
        return res.status(400).json({ message: 'Check-out date must be after check-in date.' });
    }

    db.get('SELECT price_per_night, capacity FROM rooms WHERE id = ?', [room_id], (err, room) => {
        if (err) {
            return res.status(500).json({ message: 'Error retrieving room price', error: err.message });
        }
        if (!room) {
            return res.status(404).json({ message: 'Room not found.' });
        }
        if (guests > room.capacity) {
            return res.status(400).json({ message: `Number of guests exceeds room capacity (${room.capacity}).` });
        }

        // Check for room availability for the given dates
        const checkAvailabilitySql = `
            SELECT COUNT(*) AS count FROM bookings
            WHERE room_id = ?
            AND (
                (check_in_date <= ? AND check_out_date > ?) OR
                (check_in_date < ? AND check_out_date >= ?)
            )
            AND status = 'confirmed'
        `;
        db.get(checkAvailabilitySql, [room_id, check_out_date, check_in_date, check_out_date, check_in_date], (err, result) => {
            if (err) {
                console.error('Error checking room availability:', err.message);
                return res.status(500).json({ message: 'Error checking room availability', error: err.message });
            }

            if (result.count > 0) {
                return res.status(409).json({ message: 'Room is not available for the selected dates.' });
            }

            // Calculate total price
            const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
            const diffDays = Math.round(Math.abs((outDate - inDate) / oneDay));
            const totalPrice = diffDays * room.price_per_night;

            const sql = 'INSERT INTO bookings (user_id, room_id, check_in_date, check_out_date, guests, total_price) VALUES (?, ?, ?, ?, ?, ?)';
            db.run(sql, [user_id, room_id, check_in_date, check_out_date, guests, totalPrice], function (err) {
                if (err) {
                    console.error('Error creating booking:', err.message); // Log the specific error
                    return res.status(500).json({ message: 'Error creating booking', error: err.message });
                }
                res.status(201).json({ message: 'Booking created successfully', bookingId: this.lastID, totalPrice: totalPrice });
            });
        });
    });
});

// Get bookings for the authenticated user
app.get('/api/bookings/my', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const sql = `
        SELECT
            b.id,
            b.check_in_date,
            b.check_out_date,
            b.guests,
            b.total_price,
            b.status,
            b.created_at,
            r.type AS roomType,
            r.room_number AS roomNumber,
            r.price_per_night AS roomPricePerNight -- Include room details
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC
    `;
    db.all(sql, [userId], (err, rows) => {
        if (err) {
            res.status(500).json({ message: 'Error retrieving user bookings', error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});