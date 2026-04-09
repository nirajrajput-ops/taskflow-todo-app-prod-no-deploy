import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { seedData } from './utils/seedData'
import { storage } from './utils/storage'

// Expose seed function for development
declare global {
  interface Window {
    seedData: () => void;
    pendo: any;
  }
}
window.seedData = seedData;

const userMeta = storage.getUserMeta();

window.pendo.initialize({
  visitor: {
    id: '',
    totalTemplatesCreated: userMeta?.totalTemplatesCreated ?? 0,
    hasUsedTemplates: userMeta?.hasUsedTemplates ?? false,
    lastTemplateUsedAt: userMeta?.lastTemplateUsedAt ?? null
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
