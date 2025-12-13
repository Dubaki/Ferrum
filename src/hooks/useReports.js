import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { showSuccess, showError, getFirebaseErrorMessage } from '../utils/toast';

export const useReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'reports'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(list.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const addReport = async (data) => {
    try {
      await addDoc(collection(db, 'reports'), data);
      showSuccess('Отчёт сохранён');
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  const deleteReport = async (id) => {
    try {
      await deleteDoc(doc(db, 'reports', id));
      showSuccess('Отчёт удалён');
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  return {
    reports,
    loading,
    actions: {
      addReport,
      deleteReport,
    }
  };
};
