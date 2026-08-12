import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import './index.css';

// Автоматическая проверка и сброс устаревшего кэша при каждом закладочном входе
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
  },
  onOfflineReady() {},
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#f8fafc',
            borderRadius: '8px',
          },
          success: {
            iconTheme: { primary: '#22c55e', secondary: '#f8fafc' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#f8fafc' },
            duration: 5000,
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);