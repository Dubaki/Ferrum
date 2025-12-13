import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { showSuccess, showError, getFirebaseErrorMessage } from '../utils/toast';

export const useResources = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'resources'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setResources(list.sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const addResource = async (data) => {
    try {
      await addDoc(collection(db, 'resources'), {
        name: data.name || 'Новый',
        position: data.position || 'Рабочий',
        phone: data.phone || '',
        address: data.address || '',
        dob: data.dob || '',
        photoUrl: data.photoUrl || '',
        hoursPerDay: parseFloat(data.hoursPerDay) || 8,
        workWeekends: data.workWeekends || false,
        scheduleOverrides: {},
        scheduleReasons: {},
        baseRate: parseFloat(data.baseRate) || 3000,
        rateHistory: [],
        employmentDate: data.employmentDate || new Date().toISOString().split('T')[0],
        dailyEfficiency: {},
        safetyViolations: {},
        status: 'active'
      });
      showSuccess('Сотрудник добавлен');
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  const updateResource = async (id, field, value) => {
    try {
      const res = resources.find(r => r.id === id);
      const updates = { [field]: value };
      if (field === 'baseRate') {
        const empDate = res.employmentDate || '2023-01-01';
        const today = new Date().toISOString().split('T')[0];
        let history = res.rateHistory ? [...res.rateHistory] : [];
        if (history.length === 0) history.push({ date: empDate, rate: res.baseRate });
        const hasTodayIndex = history.findIndex(h => h.date === today);
        if (hasTodayIndex >= 0) history[hasTodayIndex].rate = value;
        else history.push({ date: today, rate: value });
        updates.rateHistory = history;
      }
      await updateDoc(doc(db, 'resources', id), updates);
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  const updateResourceSchedule = async (id, dateStr, hours, type = null) => {
    try {
      const res = resources.find(r => r.id === id);
      if (!res) return;
      const currentSchedule = res.scheduleOverrides || {};
      const newSchedule = { ...currentSchedule, [dateStr]: parseFloat(hours) };
      const currentReasons = res.scheduleReasons || {};
      const newReasons = { ...currentReasons };
      if (type) newReasons[dateStr] = type;
      else delete newReasons[dateStr];
      await updateDoc(doc(db, 'resources', id), { scheduleOverrides: newSchedule, scheduleReasons: newReasons });
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  const updateResourceEfficiency = async (id, dateStr, percent) => {
    try {
      const res = resources.find(r => r.id === id);
      if (!res) return;
      const currentEff = res.dailyEfficiency || {};
      const newEff = { ...currentEff, [dateStr]: parseFloat(percent) };
      await updateDoc(doc(db, 'resources', id), { dailyEfficiency: newEff });
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  const updateResourceSafety = async (id, dateStr, violationData) => {
    try {
      const res = resources.find(r => r.id === id);
      if (!res) return;
      const current = res.safetyViolations || {};
      const newViolations = { ...current };
      if (violationData) newViolations[dateStr] = violationData;
      else delete newViolations[dateStr];
      await updateDoc(doc(db, 'resources', id), { safetyViolations: newViolations });
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  const fireResource = async (id) => {
    try {
      await updateDoc(doc(db, 'resources', id), { status: 'fired', firedAt: new Date().toISOString() });
      showSuccess('Сотрудник уволен');
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  const deleteResource = async (id) => {
    try {
      await deleteDoc(doc(db, 'resources', id));
      showSuccess('Сотрудник удалён');
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  return {
    resources,
    loading,
    actions: {
      addResource,
      updateResource,
      updateResourceSchedule,
      updateResourceEfficiency,
      updateResourceSafety,
      fireResource,
      deleteResource,
    }
  };
};
