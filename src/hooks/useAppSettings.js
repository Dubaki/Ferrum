import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { showError } from '../utils/toast';

const SETTINGS_COLLECTION = 'settings';
const PAYROLL_DOC = 'payroll';

export const useAppSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, SETTINGS_COLLECTION, PAYROLL_DOC);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      } else {
        // Если документа нет, используем пустой объект
        setSettings({});
      }
      setLoading(false);
    }, (error) => {
      showError('Ошибка загрузки настроек');
      console.error('Error fetching app settings:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateSettings = async (newSettings) => {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, PAYROLL_DOC);
      // setDoc с merge: true обновит или создаст документ
      await setDoc(docRef, newSettings, { merge: true });
    } catch (error) {
      showError('Ошибка сохранения настроек');
      console.error('Error updating app settings:', error);
      throw error;
    }
  };

  return { settings, loading, updateSettings };
};
