import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global Error Handler for Mobile Debugging
window.onerror = (msg, url, line, col, error) => {
  console.error('🚀 App Error:', { msg, url, line, col, error });
  return false;
};

// Prevent double tap zoom on iOS
if (typeof document !== 'undefined') {
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
