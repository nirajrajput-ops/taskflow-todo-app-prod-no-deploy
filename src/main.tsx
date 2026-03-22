import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { seedData } from './utils/seedData'

// Expose seed function for development
declare global {
  interface Window {
    seedData: () => void;
    pendo: any;
  }
}
window.seedData = seedData;

window.pendo.initialize({
  visitor: {
    id: ''
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
