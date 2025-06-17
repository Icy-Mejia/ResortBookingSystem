// Load environment variables from .env file
require('dotenv').config();

// Import necessary Node.js modules
const express = require('express');    // Our web framework
const mysql = require('mysql2/promise'); // For interacting with MySQL (using promise-based methods)
const cors = require('cors');          // For Cross-Origin Resource Sharing
const bcrypt = require('bcryptjs');    // For password hashing
const jwt = require('jsonwebtoken');   // For JSON Web Tokens (authentication)

// Initialize the Express application
const app = express();
// Set the port from environment variables or default to 5000
const PORT = process.env.PORT || 5000;

// --- Middleware Setup ---
// Enable CORS for all routes, allowing your frontend to make requests
app.use(cors());
// Enable Express to parse JSON formatted request bodies (e.g., from frontend forms)
app.use(express.json());

// --- Middleware for protecting routes ---
// This middleware will verify JWT tokens sent with requests
const authMiddleware = (req, res, next) => {
    // console.log('Received headers:', req.headers); // Diagnostic log - uncomment if needed for debugging

    // Get token from the 'Authorization' header (e.g., "Bearer <token>")
    const token = req.header('Authorization');

    // If no token is provided, deny authorization
    if (!token) {
        return res.status(401).json({ message: 'No authentication token provided. Authorization denied.' });
    }

    // Extract the actual token string (remove "Bearer " prefix)
    const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    try {
        // Verify the token using the secret key from .env
        const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);
        // Attach the decoded user payload (id, role) to the request object
        req.user = decoded; // Now, req.user will contain { id: user.id, role: user.role }
        next(); // Proceed to the next middleware or route handler
    } catch (err) {
        // If token is invalid or expired, deny authorization
        // console.error("JWT Verification Error:", err.message); // Uncomment for more detailed error
        res.status(401).json({ message: 'Authentication token is invalid or expired.' });
    }
};

// Middleware to authorize specific roles
// This allows restricting access to routes based on user role (e.g., only 'admin', 'customer service')
const authorizeRoles = (...roles) => { // Takes a list of allowed roles (e.g., 'admin', 'customer service')
    return (req, res, next) => {
        // Check if user info is attached (meaning authMiddleware ran successfully) and if the user's role is in the allowed list
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied. You do not have the necessary permissions.' });
        }
        next(); // User has required role, proceed
    };
};

// --- Database Connection (MySQL) ---
let connection; // Declare a variable to hold the database connection outside the function

async function connectToDatabase() {
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE
        });
        console.log('MySQL Database Connected successfully!');

        // Ping the database to keep the connection alive (optional, but good practice for long-running servers)
        setInterval(async () => {
            try {
                await connection.ping();
                // console.log('MySQL connection pinged successfully.'); // Uncomment for verbose logging
            } catch (err) {
                console.error('MySQL connection ping error:', err.message);
                // Attempt to re-establish connection if ping fails
                await connection.end(); // Close the broken connection
                await connectToDatabase(); // Try to reconnect
            }
        }, 60 * 60 * 1000); // Ping every hour (60 minutes * 60 seconds * 1000 ms)

    } catch (err) {
        console.error('MySQL Database connection error:', err.message);
        console.error('Please ensure XAMPP MySQL server is running and .env file credentials are correct.');
        // Exit the process if we can't connect to the database, as the app won't function without it
        process.exit(1); 
    }
}

// Call the function to connect to the database when the server starts
connectToDatabase();

// --- API Endpoints ---

// A simple test route to ensure the backend server is running and accessible
app.get('/', (req, res) => {
    res.send('Backend server is running!');
});

// DFD Data Flow: Registration (from Guest)
// This allows new guests to create an account within the system.
app.post('/api/register', async (req, res) => {
    const { username, password, role } = req.body;

    // Basic server-side validation
    if (!username || !password) {
        return res.status(400).json({ message: 'Please enter all required fields: username and password.' });
    }

    try {
        // Check if a user with the given username already exists in the users table
        const [users] = await connection.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length > 0) {
            return res.status(400).json({ message: 'Username already exists. Please choose a different one.' });
        }

        // Hash the password for security
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Determine the role for the new user
        const assignedRole = (role && ['guest', 'admin', 'customer service'].includes(role.toLowerCase())) ? role.toLowerCase() : 'guest';

        // Insert the new user into the 'users' table
        const [result] = await connection.execute(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, hashedPassword, assignedRole]
        );

        const userId = result.insertId;

        // Generate a JSON Web Token (JWT) for the newly registered user
        const token = jwt.sign(
            { id: userId, role: assignedRole },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(201).json({
            message: 'User registered successfully!',
            token,
            user: {
                id: userId,
                username,
                role: assignedRole
            }
        });

    } catch (err) {
        console.error('Error during registration:', err.message);
        res.status(500).json({ message: 'Server error during registration. Please try again later.' });
    }
});

// DFD Data Flow: Log In (from Guest, Admin, Customer Service)
// This allows existing users (Guests, Admin, Customer Service) to log into the system.
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    // Basic server-side validation
    if (!username || !password) {
        return res.status(400).json({ message: 'Please enter both username and password.' });
    }

    try {
        // Check if the user exists in the 'users' table
        const [users] = await connection.execute('SELECT * FROM users WHERE username = ?', [username]);
        const user = users[0];

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials. User not found.' });
        }

        // Compare the provided password with the hashed password stored in the database
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials. Password incorrect.' });
        }

        // Generate a JWT for the authenticated user
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            message: 'Logged in successfully!',
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });

    } catch (err) {
        console.error('Error during login:', err.message);
        res.status(500).json({ message: 'Server error during login. Please try again later.' });
    }
});

// DFD Data Flow: Room Pricing Info (to Guest)
// Allows guests to view available rooms and their prices.
app.get('/api/rooms', async (req, res) => {
    try {
        // Find all rooms that are marked as available
        const [rows] = await connection.execute('SELECT id, roomNumber, type, pricePerNight, capacity, description, imageUrl, isAvailable FROM rooms WHERE isAvailable = TRUE');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching available rooms:', err.message);
        res.status(500).json({ message: 'Server error fetching room information.' });
    }
});

// DFD Data Flow: Manage Room & Cottage Prices (from Admin)
// These routes require admin authentication and authorization.

// Get All Rooms (Admin Only - includes unavailable rooms for management)
app.get('/api/admin/rooms', authMiddleware, authorizeRoles('admin'), async (req, res) => {
    try {
        const [rows] = await connection.execute('SELECT id, roomNumber, type, pricePerNight, capacity, description, imageUrl, isAvailable FROM rooms');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching admin rooms:', err.message);
        res.status(500).json({ message: 'Server error fetching room data for admin.' });
    }
});

// Add New Room (Admin Only)
app.post('/api/admin/rooms', authMiddleware, authorizeRoles('admin'), async (req, res) => {
    const { roomNumber, type, pricePerNight, capacity, description, imageUrl, isAvailable } = req.body;

    if (!roomNumber || !type || !pricePerNight || isNaN(pricePerNight) || pricePerNight <= 0 || !capacity || isNaN(capacity) || capacity <= 0) {
        return res.status(400).json({ message: 'Please enter all required room fields: number, type, price, and capacity, and ensure price/capacity are positive numbers.' });
    }

    try {
        const [existingRooms] = await connection.execute('SELECT id FROM rooms WHERE roomNumber = ?', [roomNumber]);
        if (existingRooms.length > 0) {
            return res.status(400).json({ message: 'Room number already exists. Please choose a different one.' });
        }

        const roomIsAvailable = (typeof isAvailable === 'boolean') ? isAvailable : true; 

        const [result] = await connection.execute(
            'INSERT INTO rooms (roomNumber, type, pricePerNight, capacity, description, imageUrl, isAvailable) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [roomNumber, type, pricePerNight, capacity, description, imageUrl || null, roomIsAvailable]
        );

        const roomId = result.insertId;

        res.status(201).json({
            message: 'Room added successfully!',
            room: { id: roomId, roomNumber, type, pricePerNight, capacity, description, imageUrl, isAvailable: roomIsAvailable, createdAt: new Date() }
        });

    } catch (err) {
        console.error('Error adding room:', err.message);
        res.status(500).json({ message: 'Server error adding room.' });
    }
});

// Update Room Details (Admin Only)
app.put('/api/admin/rooms/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
    const roomId = req.params.id;
    const { roomNumber, type, pricePerNight, capacity, description, imageUrl, isAvailable } = req.body;

    try {
        const [existingRoomRows] = await connection.execute('SELECT * FROM rooms WHERE id = ?', [roomId]);
        const room = existingRoomRows[0];
        if (!room) {
            return res.status(404).json({ message: 'Room not found.' });
        }

        if (roomNumber && roomNumber !== room.roomNumber) {
            const [duplicateRooms] = await connection.execute('SELECT id FROM rooms WHERE roomNumber = ? AND id != ?', [roomNumber, roomId]);
            if (duplicateRooms.length > 0) {
                return res.status(400).json({ message: 'New room number already exists for another room.' });
            }
        }

        const updateFields = [];
        const updateValues = [];

        if (roomNumber !== undefined) { updateFields.push('roomNumber = ?'); updateValues.push(roomNumber); }
        if (type !== undefined) { updateFields.push('type = ?'); updateValues.push(type); }
        if (pricePerNight !== undefined) { updateFields.push('pricePerNight = ?'); updateValues.push(pricePerNight); }
        if (capacity !== undefined) { updateFields.push('capacity = ?'); updateValues.push(capacity); }
        if (description !== undefined) { updateFields.push('description = ?'); updateValues.push(description); }
        if (imageUrl !== undefined) { updateFields.push('imageUrl = ?'); updateValues.push(imageUrl); }
        if (isAvailable !== undefined) { updateFields.push('isAvailable = ?'); updateValues.push(isAvailable); }

        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'No fields provided for update.' });
        }

        const query = `UPDATE rooms SET ${updateFields.join(', ')} WHERE id = ?`;
        await connection.execute(query, [...updateValues, roomId]);

        const [updatedRoomRows] = await connection.execute('SELECT id, roomNumber, type, pricePerNight, capacity, description, imageUrl, isAvailable FROM rooms WHERE id = ?', [roomId]);

        res.json({
            message: 'Room updated successfully!',
            room: updatedRoomRows[0]
        });

    } catch (err) {
        console.error('Error updating room:', err.message);
        res.status(500).json({ message: 'Server error updating room.' });
    }
});

// Delete Room (Admin Only)
app.delete('/api/admin/rooms/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
    const roomId = req.params.id;

    try {
        const [existingRoomRows] = await connection.execute('SELECT id FROM rooms WHERE id = ?', [roomId]);
        if (existingRoomRows.length === 0) {
            return res.status(404).json({ message: 'Room not found.' });
        }

        await connection.execute('DELETE FROM rooms WHERE id = ?', [roomId]);

        res.json({ message: 'Room deleted successfully!' });

    } catch (err) {
        console.error('Error deleting room:', err.message);
        res.status(500).json({ message: 'Server error deleting room.' });
    }
});

// DFD Data Flow: Make Reservation (from Guest, Admin, Customer Service)
// Create a new booking for any logged-in user.
app.post('/api/bookings', authMiddleware, async (req, res) => {
    const { room_id, check_in_date, check_out_date, guests } = req.body;
    const userId = req.user.id; // Get user ID from authenticated token

    // Basic validation
    if (!room_id || !check_in_date || !check_out_date || !guests) {
        return res.status(400).json({ message: 'Please provide room ID, check-in date, check-out date, and number of guests.' });
    }
    if (isNaN(guests) || guests <= 0) {
        return res.status(400).json({ message: 'Number of guests must be a positive number.' });
    }

    // Convert dates to Date objects for comparison
    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date to start of day

    if (checkIn.getTime() >= checkOut.getTime()) {
        return res.status(400).json({ message: 'Check-out date must be after check-in date.' });
    }
    if (checkIn.getTime() < today.getTime()) {
        return res.status(400).json({ message: 'Check-in date cannot be in the past.' });
    }

    let room;
    try {
        // 1. Get room details and check availability/capacity
        const [roomRows] = await connection.execute(
            'SELECT id, pricePerNight, capacity, isAvailable FROM rooms WHERE id = ?',
            [room_id]
        );
        room = roomRows[0];

        if (!room) {
            return res.status(404).json({ message: 'Room not found.' });
        }
        if (!room.isAvailable) {
            return res.status(400).json({ message: 'This room is currently not available for booking.' });
        }
        if (guests > room.capacity) {
            return res.status(400).json({ message: `Number of guests exceeds room capacity (${room.capacity}).` });
        }

        // 2. Check for overlapping bookings
        const [overlappingBookings] = await connection.execute(
            `SELECT id FROM bookings
             WHERE room_id = ?
               AND status IN ('pending', 'confirmed') -- Consider these as unavailable dates
               AND (
                    (check_in_date <= ? AND check_out_date > ?) OR -- Existing booking starts before or on new check-out and ends after new check-in
                    (check_in_date < ? AND check_out_date >= ?)    -- Existing booking starts before new check-in and ends after or on new check-out
               )`,
            [room_id, checkOut.toISOString().slice(0, 10), checkIn.toISOString().slice(0, 10),
                      checkOut.toISOString().slice(0, 10), checkIn.toISOString().slice(0, 10)]
        );

        if (overlappingBookings.length > 0) {
            return res.status(409).json({ message: 'This room is already booked for some part of the requested dates.' });
        }

        // 3. Calculate total price
        const oneDay = 24 * 60 * 60 * 1000; // milliseconds in a day
        const numberOfNights = Math.round(Math.abs((checkOut - checkIn) / oneDay));
        const totalPrice = numberOfNights * room.pricePerNight;

        // 4. Create the booking
        const [result] = await connection.execute(
            'INSERT INTO bookings (room_id, user_id, check_in_date, check_out_date, guests, total_price) VALUES (?, ?, ?, ?, ?, ?)',
            [room_id, userId, check_in_date, check_out_date, guests, totalPrice]
        );

        const bookingId = result.insertId;

        res.status(201).json({
            message: 'Booking created successfully!',
            booking: {
                id: bookingId,
                room_id,
                user_id: userId,
                check_in_date,
                check_out_date,
                guests,
                total_price: totalPrice,
                status: 'pending' // Default status from DB
            }
        });

    } catch (err) {
        console.error('Error creating booking:', err.message);
        res.status(500).json({ message: 'Server error creating booking.' });
    }
});

// DFD Data Flow: View Reservations (to Guest, Admin, Customer Service - specific to user)
// Get all bookings for the currently authenticated user.
app.get('/api/bookings/my', authMiddleware, async (req, res) => {
    const userId = req.user.id; // Get user ID from authenticated token

    try {
        const [bookings] = await connection.execute(
            `SELECT
                b.id,
                b.room_id,
                r.roomNumber,
                r.type AS roomType,
                r.pricePerNight,
                b.user_id,
                u.username AS bookedBy,
                b.check_in_date,
                b.check_out_date,
                b.guests,
                b.total_price,
                b.status,
                b.created_at,
                b.updated_at
             FROM bookings b
             JOIN rooms r ON b.room_id = r.id
             JOIN users u ON b.user_id = u.id
             WHERE b.user_id = ?
             ORDER BY b.created_at DESC`,
            [userId]
        );

        res.json(bookings);

    } catch (err) {
        console.error('Error fetching user bookings:', err.message);
        res.status(500).json({ message: 'Server error fetching your bookings.' });
    }
});

// DFD Data Flow: View All Reservations (to Admin, Customer Service)
// Get all bookings in the system (for management purposes).
app.get('/api/admin/bookings', authMiddleware, authorizeRoles('admin', 'customer service'), async (req, res) => {
    try {
        const [allBookings] = await connection.execute(
            `SELECT
                b.id,
                b.room_id,
                r.roomNumber,
                r.type AS roomType,
                r.pricePerNight,
                b.user_id,
                u.username AS bookedBy,
                b.check_in_date,
                b.check_out_date,
                b.guests,
                b.total_price,
                b.status,
                b.created_at,
                b.updated_at
             FROM bookings b
             JOIN rooms r ON b.room_id = r.id
             JOIN users u ON b.user_id = u.id
             ORDER BY b.created_at DESC`
        );

        res.json(allBookings);

    } catch (err) {
        console.error('Error fetching all bookings for admin:', err.message);
        res.status(500).json({ message: 'Server error fetching all bookings.' });
    }
});

// DFD Data Flow: Manage Booking Status (from Admin, Customer Service)
// Update the status of a specific booking.
app.put('/api/admin/bookings/:id/status', authMiddleware, authorizeRoles('admin', 'customer service'), async (req, res) => {
    const bookingId = req.params.id;
    const { status } = req.body;

    // Define allowed booking statuses
    const allowedStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];

    if (!status || !allowedStatuses.includes(status.toLowerCase())) {
        return res.status(400).json({ message: `Invalid status provided. Allowed statuses are: ${allowedStatuses.join(', ')}.` });
    }

    try {
        // Check if the booking exists
        const [existingBookingRows] = await connection.execute('SELECT id, status FROM bookings WHERE id = ?', [bookingId]);
        if (existingBookingRows.length === 0) {
            return res.status(404).json({ message: 'Booking not found.' });
        }

        // Update the booking status
        await connection.execute(
            'UPDATE bookings SET status = ?, updated_at = NOW() WHERE id = ?',
            [status.toLowerCase(), bookingId]
        );

        res.json({ message: `Booking ${bookingId} status updated to ${status.toLowerCase()} successfully!` });

    } catch (err) {
        console.error('Error updating booking status:', err.message);
        res.status(500).json({ message: 'Server error updating booking status.' });
    }
});

// DFD Data Flow: Cancel Reservation (from Guest, Admin, Customer Service)
// Allows the user who made the booking (or an admin/CS) to cancel it.
app.put('/api/bookings/:id/cancel', authMiddleware, async (req, res) => {
    const bookingId = req.params.id;
    const userId = req.user.id; // User attempting the cancellation
    const userRole = req.user.role; // Role of the user attempting the cancellation

    try {
        const [bookingRows] = await connection.execute('SELECT user_id, status FROM bookings WHERE id = ?', [bookingId]);
        const booking = bookingRows[0];

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found.' });
        }

        // Check if the user is authorized to cancel this booking
        // - If it's the booking owner AND not an admin/CS, they must own it.
        // - If it's an admin or customer service, they can cancel any booking.
        const isOwner = booking.user_id === userId;
        const isAdminOrCS = ['admin', 'customer service'].includes(userRole);

        if (!isOwner && !isAdminOrCS) {
            return res.status(403).json({ message: 'Access denied. You can only cancel your own bookings.' });
        }

        // Check if the booking is already cancelled or completed
        if (booking.status === 'cancelled') {
            return res.status(400).json({ message: 'Booking is already cancelled.' });
        }
        if (booking.status === 'completed') {
            return res.status(400).json({ message: 'Cannot cancel a completed booking.' });
        }

        // Update the booking status to 'cancelled'
        await connection.execute(
            'UPDATE bookings SET status = ?, updated_at = NOW() WHERE id = ?',
            ['cancelled', bookingId]
        );

        res.json({ message: `Booking ${bookingId} has been successfully cancelled.` });

    } catch (err) {
        console.error('Error cancelling booking:', err.message);
        res.status(500).json({ message: 'Server error cancelling booking.' });
    }
});

// --- DFD Data Flow: View Customer Details & Manage User Accounts (from Admin) ---
// These routes allow admins to manage user accounts.

// Get All Users (Admin Only)
app.get('/api/admin/users', authMiddleware, authorizeRoles('admin'), async (req, res) => {
    try {
        // Exclude password hash from the response for security
        const [users] = await connection.execute('SELECT id, username, role, created_at FROM users');
        res.json(users);
    } catch (err) {
        console.error('Error fetching all users:', err.message);
        res.status(500).json({ message: 'Server error fetching user accounts.' });
    }
});

// Get User by ID (Admin Only)
app.get('/api/admin/users/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
    const userId = req.params.id;
    try {
        const [userRows] = await connection.execute('SELECT id, username, role, created_at FROM users WHERE id = ?', [userId]);
        const user = userRows[0];
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.json(user);
    } catch (err) {
        console.error('Error fetching user by ID:', err.message);
        res.status(500).json({ message: 'Server error fetching user details.' });
    }
});

// Update User Role (Admin Only)
app.put('/api/admin/users/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
    const userId = req.params.id;
    const { role } = req.body;

    if (!role || !['guest', 'admin', 'customer service'].includes(role.toLowerCase())) {
        return res.status(400).json({ message: 'Invalid role provided. Allowed roles are: guest, admin, customer service.' });
    }

    try {
        const [userRows] = await connection.execute('SELECT id, role FROM users WHERE id = ?', [userId]);
        const user = userRows[0];
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Prevent an admin from demoting themselves or the primary admin account
        // This is a common security practice. Adjust logic as needed.
        if (userId === req.user.id && role.toLowerCase() !== 'admin') {
            return res.status(403).json({ message: 'Administrators cannot demote their own account directly.' });
        }
        // More stringent check: prevent changing primary admin role (e.g., if ID 1 is the super admin)
        // if (userId === 1 && user.role === 'admin' && role.toLowerCase() !== 'admin') {
        //     return res.status(403).json({ message: 'Cannot change the role of the primary admin account.' });
        // }

        await connection.execute('UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?', [role.toLowerCase(), userId]);

        res.json({ message: `User ${userId} role updated to ${role.toLowerCase()} successfully!` });

    } catch (err) {
        console.error('Error updating user role:', err.message);
        res.status(500).json({ message: 'Server error updating user role.' });
    }
});

// Delete User (Admin Only)
app.delete('/api/admin/users/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
    const userId = req.params.id;

    try {
        const [userRows] = await connection.execute('SELECT id, username, role FROM users WHERE id = ?', [userId]);
        const userToDelete = userRows[0];
        if (!userToDelete) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Prevent an admin from deleting their own account
        if (userId === req.user.id) {
            return res.status(403).json({ message: 'You cannot delete your own account.' });
        }

        // Prevent deletion of primary admin account (e.g., if ID 1 is the super admin)
        // if (userToDelete.id === 1 && userToDelete.role === 'admin') {
        //     return res.status(403).json({ message: 'Cannot delete the primary admin account.' });
        // }

        // Before deleting the user, consider how to handle their associated bookings.
        // Options:
        // 1. Delete associated bookings (CASCADE DELETE in SQL schema).
        // 2. Nullify user_id in bookings (if user_id can be NULL in bookings table).
        // 3. Prevent deletion if user has active bookings.
        // For now, we assume your database schema has ON DELETE CASCADE or you're aware of the implications.
        await connection.execute('DELETE FROM users WHERE id = ?', [userId]);

        res.json({ message: `User ${userToDelete.username} (ID: ${userId}) deleted successfully.` });

    } catch (err) {
        console.error('Error deleting user:', err.message);
        // Specifically check for foreign key constraint errors if not using CASCADE DELETE
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ message: 'Cannot delete user because they have existing bookings. Please delete their bookings first or consider marking the user as inactive instead.' });
        }
        res.status(500).json({ message: 'Server error deleting user.' });
    }
});


// --- Example Protected Routes (for testing authentication and roles) ---
// This route can be accessed by any logged-in user (guest, admin, customer service)
app.get('/api/protected', authMiddleware, (req, res) => {
    res.json({
        message: `Welcome, ${req.user.username || 'user'}! You are logged in as a ${req.user.role}. This is a protected route.`,
        user: req.user
    });
});

// This route can ONLY be accessed by an 'admin' user
app.get('/api/admin/dashboard', authMiddleware, authorizeRoles('admin'), (req, res) => {
    res.json({
        message: `Welcome to the Admin Dashboard, ${req.user.username}! You have access to admin functionalities.`,
        user: req.user
    });
});


// --- Start the server ---
// Makes the Express app listen for incoming requests on the specified port
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});