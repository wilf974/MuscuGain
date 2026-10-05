import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from './components/ui/Toast';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { runMigrations } from './utils/storage';

// Migration du stockage AVANT le 1er rendu (les états React lisent le schéma à jour).
runMigrations();

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
