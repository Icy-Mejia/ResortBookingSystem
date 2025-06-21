// Path: frontend/src/api.js
import axios from 'axios';

// Create an Axios instance with the backend base URL
const api = axios.create({
    baseURL: 'http://localhost:5000/api', // Matches your backend server's API base URL
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;