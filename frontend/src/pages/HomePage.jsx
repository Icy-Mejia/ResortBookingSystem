// Path: frontend/src/pages/HomePage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css'; // Create this CSS file next if you want specific styling

function HomePage() {
  return (
    <div className="home-container">
      <section className="hero-section">
        <h1>Welcome to Resort Booking</h1>
        <p>Your perfect getaway starts here. Explore our luxurious rooms and book your stay today!</p>
        <Link to="/rooms" className="btn btn-primary">Explore Rooms</Link>
      </section>

      <section className="features-section">
        <h2>Why Choose Us?</h2>
        <div className="features-grid">
          <div className="feature-item">
            <h3>Best Prices</h3>
            <p>We offer competitive rates without compromising on quality.</p>
          </div>
          <div className="feature-item">
            <h3>Luxury Rooms</h3>
            <p>Experience unparalleled comfort and elegance in every room.</p>
          </div>
          <div className="feature-item">
            <h3>Easy Booking</h3>
            <p>Our seamless online booking system makes reservations a breeze.</p>
          </div>
          <div className="feature-item">
            <h3>Exceptional Service</h3>
            <p>Our dedicated staff ensures your stay is perfect.</p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2>Ready for Your Vacation?</h2>
        <p>Sign up now to get exclusive deals and make your first booking!</p>
        <Link to="/register" className="btn btn-secondary">Register Now</Link>
      </section>
    </div>
  );
}

export default HomePage;