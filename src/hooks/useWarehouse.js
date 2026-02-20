import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { showSuccess, showError } from '../utils/toast';

export const useWarehouse = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'warehouseItems'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setItems(list);
      setLoading(false);
    }, (error) => {
      showError('Ошибка загрузки складских позиций');
      console.error('Error fetching warehouse items:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addItem = async (data) => {
    try {
      await addDoc(collection(db, 'warehouseItems'), {
        title: data.title,
        unit: data.unit || 'шт',
        minStock: data.minStock || 0,
        monthlyVolume: data.monthlyVolume || 0,
        note: data.note || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      showSuccess('Позиция добавлена на склад');
    } catch (error) {
      showError('Ошибка добавления позиции');
      console.error('Error adding warehouse item:', error);
    }
  };

  const updateItem = async (id, updates) => {
    try {
      const ref = doc(db, 'warehouseItems', id);
      await updateDoc(ref, { ...updates, updatedAt: Date.now() });
    } catch (error) {
      showError('Ошибка обновления позиции');
      console.error('Error updating warehouse item:', error);
    }
  };

  const deleteItem = async (id) => {
    try {
      await deleteDoc(doc(db, 'warehouseItems', id));
      showSuccess('Позиция удалена');
    } catch (error) {
      showError('Ошибка удаления позиции');
      console.error('Error deleting warehouse item:', error);
    }
  };

  return {
    items,
    loading,
    actions: { addItem, updateItem, deleteItem },
  };
};
