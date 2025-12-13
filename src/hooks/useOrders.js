import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { formatDate } from '../utils/helpers';
import { showSuccess, showError, getFirebaseErrorMessage } from '../utils/toast';

export const useOrders = (products) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(list.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const addOrder = async (data) => {
    try {
      const now = Date.now();
      await addDoc(collection(db, 'orders'), {
        orderNumber: data?.orderNumber || 'Новый',
        clientName: data?.clientName || '',
        deadline: data?.deadline || '',
        status: 'active',
        customStatus: data?.customStatus || 'metal',
        drawingsDeadline: data?.drawingsDeadline || null,
        materialsDeadline: data?.materialsDeadline || null,
        paymentDate: formatDate(new Date()),
        statusHistory: [{ status: data?.customStatus || 'metal', timestamp: now }],
        createdAt: now,
        finishedAt: null
      });
      showSuccess('Заказ создан');
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  const updateOrder = async (id, field, value) => {
    try {
      if (field === 'customStatus') {
        const order = orders.find(o => o.id === id);
        if (order) {
          const history = order.statusHistory || [];
          const newHistory = [...history, { status: value, timestamp: Date.now() }];
          await updateDoc(doc(db, 'orders', id), { [field]: value, statusHistory: newHistory });
          return;
        }
      }
      await updateDoc(doc(db, 'orders', id), { [field]: value });
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  const finishOrder = async (id) => {
    try {
      const orderProducts = products.filter(p => p.orderId === id);
      const incompleteOperations = [];
      orderProducts.forEach(prod => {
        prod.operations.forEach(op => {
          if (!op.actualMinutes || op.actualMinutes <= 0) {
            incompleteOperations.push(`${prod.name} -> ${op.name}`);
          }
        });
      });
      if (incompleteOperations.length > 0) {
        showError(`Не проставлено время для: ${incompleteOperations.slice(0, 3).join(', ')}${incompleteOperations.length > 3 ? '...' : ''}`);
        return false;
      }
      await updateDoc(doc(db, 'orders', id), { status: 'completed', finishedAt: new Date().toISOString() });
      showSuccess('Заказ завершён');
      return true;
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  const restoreOrder = async (id) => {
    try {
      await updateDoc(doc(db, 'orders', id), { status: 'active', finishedAt: null });
      showSuccess('Заказ восстановлен');
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  const deleteOrder = async (id) => {
    try {
      await deleteDoc(doc(db, 'orders', id));
      showSuccess('Заказ удалён');
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  return {
    orders,
    loading,
    actions: {
      addOrder,
      updateOrder,
      finishOrder,
      restoreOrder,
      deleteOrder,
    }
  };
};
