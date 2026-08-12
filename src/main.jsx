import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import './index.css';

// Автоматическая регистрация и проверка новой версии на сервере
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
  },
  onOfflineReady() {},
});

// 1. Автоматическая принудительная перезагрузка вкладки у пользователей при выкатке нового обновления
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  // 2. Периодическая проверка наличия обновлений на сервере каждые 5 минут без участия пользователя
  setInterval(() => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (let registration of registrations) {
        registration.update();
      }
    });
  }, 5 * 60 * 1000);
}

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