import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Дата полной остановки приложения: 27 августа 2026 года 00:00:00
const EXPIRATION_DATE = new Date('2026-08-27T00:00:00');
const STORAGE_KEY = 'ferrum_unlocked_subscription_v1';
const MASTER_PASSWORD = import.meta.env.VITE_SUBSCRIPTION_UNLOCK_PASS || 'feroplatil00';

export function useTrialTimer() {
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  const [daysLeft, setDaysLeft] = useState(15);
  const [isExpired, setIsExpired] = useState(false);

  // Синхронизация статуса разблокировки через Firestore для ВСЕХ пользователей
  useEffect(() => {
    try {
      const unsub = onSnapshot(
        doc(db, 'settings', 'subscription'),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.isUnlocked) {
              localStorage.setItem(STORAGE_KEY, 'true');
              setIsUnlocked(true);
            }
          }
        },
        (error) => {
          console.warn('Firebase subscription sync warning:', error);
        }
      );

      return () => unsub();
    } catch (e) {
      console.warn('Firestore subscription status hook error:', e);
    }
  }, []);

  // Отсчет дней до 27 августа 2026
  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const diffTime = EXPIRATION_DATE.getTime() - now.getTime();
      const calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      setDaysLeft(calculatedDays > 0 ? calculatedDays : 0);
      setIsExpired(diffTime <= 0);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000); // Каждую минуту

    return () => clearInterval(interval);
  }, []);

  const unlock = async (enteredPassword) => {
    if (!enteredPassword) return false;

    const cleanPass = enteredPassword.trim();
    if (cleanPass === MASTER_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, 'true');
      setIsUnlocked(true);

      // Глобальная разблокировка в Firebase Firestore для ВСЕХ пользователей
      try {
        await setDoc(
          doc(db, 'settings', 'subscription'),
          { 
            isUnlocked: true, 
            unlockedAt: new Date().toISOString() 
          },
          { merge: true }
        );
      } catch (err) {
        console.error('Error saving subscription status to Firestore:', err);
      }

      return true;
    }
    return false;
  };

  const lockAgain = async () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsUnlocked(false);
    try {
      await setDoc(
        doc(db, 'settings', 'subscription'),
        { isUnlocked: false },
        { merge: true }
      );
    } catch (e) {
      console.error(e);
    }
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
