import { useState, useEffect } from 'react';

// Дата полной остановки приложения: 27 августа 2026 года 00:00:00
const EXPIRATION_DATE = new Date('2026-08-27T00:00:00');
const STORAGE_KEY = 'ferrum_unlocked_subscription_v1';
const MASTER_PASSWORDS = ['fer25_paid'];

export function useTrialTimer() {
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  const [daysLeft, setDaysLeft] = useState(15);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const diffTime = EXPIRATION_DATE.getTime() - now.getTime();
      const calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      setDaysLeft(calculatedDays > 0 ? calculatedDays : 0);
      setIsExpired(diffTime <= 0);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000); // Обновлять каждую минуту

    return () => clearInterval(interval);
  }, []);

  const unlock = (enteredPassword) => {
    if (!enteredPassword) return false;

    const cleanPass = enteredPassword.trim().toLowerCase();
    const isValid = MASTER_PASSWORDS.some(p => p.toLowerCase() === cleanPass);

    if (isValid) {
      localStorage.setItem(STORAGE_KEY, 'true');
      setIsUnlocked(true);
      return true;
    }
    return false;
  };

  const lockAgain = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsUnlocked(false);
  };

  return {
    daysLeft,
    isExpired,
    isUnlocked,
    unlock,
    lockAgain,
    expirationDate: EXPIRATION_DATE
  };
}
