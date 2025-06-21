// Path: frontend/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';

import HomePage from './pages/HomePage';
import RoomsPage from './pages/RoomsPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import BookingsPage from './pages/BookingsPage';
import BookRoomPage from './pages/BookRoomPage';
import NotFoundPage from './pages/NotFoundPage';

import { AuthProvider } from './context/AuthContext';

import './App.css';
import './index.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Header />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/rooms" element={<RoomsPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/my-bookings" element={<BookingsPage />} />
              <Route path="/book-room/:roomId" element={<BookRoomPage />} />
              
              <Route path="*" element={<NotFoundPage />} /> 
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;