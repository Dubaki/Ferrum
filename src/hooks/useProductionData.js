import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { formatDate } from '../utils/helpers';
import { showSuccess, showError, getFirebaseErrorMessage } from '../utils/toast';

export const useProductionData = () => {
  const [resources, setResources] = useState([]);
  const [products, setProducts] = useState([]); 
  const [orders, setOrders] = useState([]);     
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubResources = onSnapshot(collection(db, 'resources'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setResources(list.sort((a,b) => a.name.localeCompare(b.name)));
    });
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(list);
    });
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(list.sort((a,b) => b.createdAt - a.createdAt));
    });
    const unsubReports = onSnapshot(collection(db, 'reports'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(list.sort((a,b) => b.createdAt - a.createdAt)); 
      setLoading(false);
    });
    return () => { unsubResources(); unsubProducts(); unsubOrders(); unsubReports(); };
  }, []);

  // --- Actions ---

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

  // --- ОТГРУЗКИ ---

  // Переместить заказ в раздел отгрузок
  const moveToShipping = async (id) => {
    try {
      await updateDoc(doc(db, 'orders', id), {
        inShipping: true,
        shippingToday: false
      });
      showSuccess('Заказ перемещён в отгрузки');
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  // Вернуть заказ из отгрузок в заказы
  const returnFromShipping = async (id) => {
    try {
      await updateDoc(doc(db, 'orders', id), {
        inShipping: false,
        shippingToday: false
      });
      showSuccess('Заказ возвращён в работу');
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  // Отметить/снять отметку "отгрузка сегодня"
  const toggleShippingToday = async (id) => {
    try {
      const order = orders.find(o => o.id === id);
      if (!order) return;
      await updateDoc(doc(db, 'orders', id), {
        shippingToday: !order.shippingToday
      });
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  // Завершить отгрузку - перенести в архив с фиксацией даты
  const completeShipping = async (id) => {
    try {
      await updateDoc(doc(db, 'orders', id), {
        status: 'completed',
        inShipping: false,
        shippingToday: false,
        shippedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString()
      });
      showSuccess('Заказ отгружен и перемещён в архив');
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

  // --- ПРОДУКТЫ ---
  const addProduct = async (orderId = null, initialDate = null) => {
    try {
      const startDate = initialDate || formatDate(new Date());
      const docRef = await addDoc(collection(db, 'products'), {
        orderId,
        name: 'Новое изделие',
        quantity: 1,
        startDate: startDate,
        status: 'active',
        operations: [],
        createdAt: Date.now()
      });
      return docRef.id;
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  // Пакетное добавление из пресетов
  const addProductsBatch = async (orderId, presetItems) => {
    try {
      const startDate = formatDate(new Date());

      for (const item of presetItems) {
        const ops = item.ops.map((op, index) => ({
          id: Date.now() + index + Math.random(),
          name: op.name,
          minutesPerUnit: op.minutes,
          actualMinutes: 0,
          resourceIds: [],
          sequence: index + 1
        }));

        await addDoc(collection(db, 'products'), {
          orderId,
          name: item.name,
          quantity: 1,
          startDate: startDate,
          status: 'active',
          operations: ops,
          createdAt: Date.now()
        });
      }
      showSuccess(`Добавлено изделий: ${presetItems.length}`);
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  const updateProduct = async (id, field, value) => {
    try {
      await updateDoc(doc(db, 'products', id), { [field]: value });
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  const deleteProduct = async (id) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      showSuccess('Изделие удалено');
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  const copyOperationsToAll = async (sourceProductId) => {
    try {
      const sourceProduct = products.find(p => p.id === sourceProductId);
      if (!sourceProduct || !sourceProduct.operations.length) {
        showError('Нет операций для копирования');
        return;
      }
      const orderId = sourceProduct.orderId;
      const siblings = products.filter(p => p.orderId === orderId && p.id !== sourceProductId);
      if (siblings.length === 0) {
        showError('В этом заказе нет других изделий');
        return;
      }
      const batch = writeBatch(db);
      siblings.forEach(prod => {
        const newOps = sourceProduct.operations.map(op => ({
          ...op,
          id: Date.now() + Math.random(),
          resourceIds: [...(op.resourceIds || [])]
        }));
        const ref = doc(db, 'products', prod.id);
        batch.update(ref, { operations: newOps });
      });
      await batch.commit();
      showSuccess(`Операции скопированы в ${siblings.length} изделий`);
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  const addOperation = async (productId, initialName = 'Новая операция') => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;
      const maxSeq = product.operations.length > 0 ? Math.max(...product.operations.map(o => o.sequence)) : 0;
      const newOps = [...product.operations, {
        id: Date.now(),
        name: initialName,
        resourceIds: [],
        minutesPerUnit: 60,
        actualMinutes: 0,
        sequence: maxSeq + 1
      }];
      await updateDoc(doc(db, 'products', productId), { operations: newOps });
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  const updateOperation = async (productId, opId, field, value) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;
      const newOps = product.operations.map(op => op.id === opId ? { ...op, [field]: value } : op);
      await updateDoc(doc(db, 'products', productId), { operations: newOps });
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  const toggleResourceForOp = async (productId, opId, resourceId) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;
      const newOps = product.operations.map(op => {
        if (op.id !== opId) return op;
        const cIds = Array.isArray(op.resourceIds) ? op.resourceIds : [];
        return { ...op, resourceIds: cIds.includes(resourceId) ? cIds.filter(i => i !== resourceId) : [...cIds, resourceId] };
      });
      await updateDoc(doc(db, 'products', productId), { operations: newOps });
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  const deleteOperation = async (productId, opId) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;
      const newOps = product.operations.filter(op => op.id !== opId);
      await updateDoc(doc(db, 'products', productId), { operations: newOps });
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  // --- Resources ---
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
    resources, setResources: updateResource, updateResourceSchedule, updateResourceEfficiency, updateResourceSafety,
    products, setProducts, orders, setOrders: updateOrder, reports, setReports: addReport, loading,
    actions: {
        addOrder, updateOrder, deleteOrder, finishOrder, restoreOrder,
        moveToShipping, returnFromShipping, toggleShippingToday, completeShipping,
        addProduct, addProductsBatch, updateProduct, deleteProduct, copyOperationsToAll,
        addOperation, updateOperation, toggleResourceForOp, deleteOperation,
        addResource, updateResource, updateResourceSchedule, updateResourceEfficiency, updateResourceSafety,
        fireResource, deleteResource, addReport, deleteReport
    }
  };
};