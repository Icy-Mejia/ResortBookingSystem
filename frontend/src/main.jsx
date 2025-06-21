// Path: frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client'; // Import ReactDOM for React 18+
import App from './App.jsx'; // Import your main App component

// Render the React application into the DOM
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App /> {/* Your main application component */}
  </React.StrictMode>,
);