import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { formatDate } from '../utils/helpers';

export const useProductionData = () => {
  const [resources, setResources] = useState([]);
  const [products, setProducts] = useState([]); 
  const [orders, setOrders] = useState([]);     
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ... (код подписки на коллекции resources, products, reports остается прежним)
    const unsubResources = onSnapshot(collection(db, 'resources'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setResources(list.sort((a,b) => a.name.localeCompare(b.name)));
    });
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(list);
    });
    const unsubReports = onSnapshot(collection(db, 'reports'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(list.sort((a,b) => b.createdAt - a.createdAt)); 
      setLoading(false);
    });

    // Для заказов (orders)
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(list.sort((a,b) => b.createdAt - a.createdAt));
    });

    return () => { unsubResources(); unsubProducts(); unsubOrders(); unsubReports(); };
  }, []);

  // --- ЗАКАЗЫ (ОБНОВЛЕНО) ---
  const addOrder = async () => {
    const now = Date.now();
    await addDoc(collection(db, 'orders'), {
      orderNumber: 'Новый', clientName: '', deadline: '', status: 'active',
      customStatus: 'metal', // Статус по умолчанию: Ждем металл
      paymentDate: formatDate(new Date()), // Дата оплаты (сегодня по умолчанию)
      statusHistory: [{ status: 'metal', timestamp: now }], // История для таймеров
      createdAt: now, finishedAt: null
    });
  };

  const updateOrder = async (id, field, value) => {
      // Если меняем статус, пишем историю для таймера
      if (field === 'customStatus') {
          const order = orders.find(o => o.id === id);
          if (order) {
              const history = order.statusHistory || [];
              const newHistory = [...history, { status: value, timestamp: Date.now() }];
              await updateDoc(doc(db, 'orders', id), { 
                  [field]: value, 
                  statusHistory: newHistory 
              });
              return;
          }
      }
      // Обычное обновление
      await updateDoc(doc(db, 'orders', id), { [field]: value });
  };
  
  const finishOrder = async (id) => {
      if(confirm('Завершить заказ и перенести в отчеты?')) {
        await updateDoc(doc(db, 'orders', id), { status: 'completed', finishedAt: new Date().toISOString() });
      }
  };
  const restoreOrder = async (id) => updateDoc(doc(db, 'orders', id), { status: 'active', finishedAt: null });
  const deleteOrder = async (id) => { if(confirm('Удалить заказ?')) await deleteDoc(doc(db, 'orders', id)); };

  // ... (Остальной код products, resources, reports без изменений)
  // ... (Вставь сюда код для products и resources из предыдущего ответа, если он нужен целиком, но изменения были только в addOrder/updateOrder)
  
  // (Для краткости привожу только возвращаемый объект, он стандартный)
  
  // --- ИЗДЕЛИЯ ---
  const addProduct = async (orderId = null) => {
    await addDoc(collection(db, 'products'), {
      orderId: orderId, name: 'Новое изделие', quantity: 1, startDate: formatDate(new Date()),
      status: 'active', operations: [], createdAt: Date.now()
    });
  };
  const updateProduct = async (id, field, value) => updateDoc(doc(db, 'products', id), { [field]: value });
  const deleteProduct = async (id) => { if(confirm('Удалить позицию?')) await deleteDoc(doc(db, 'products', id)); };

  // --- ОПЕРАЦИИ ---
  const addOperation = async (productId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const maxSeq = product.operations.length > 0 ? Math.max(...product.operations.map(o => o.sequence)) : 0;
    const newOps = [...product.operations, {
      id: Date.now(), name: 'Сварка', resourceIds: [], minutesPerUnit: 60, actualMinutes: 0, sequence: maxSeq + 1
    }];
    await updateDoc(doc(db, 'products', productId), { operations: newOps });
  };
  const updateOperation = async (productId, opId, field, value) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const newOps = product.operations.map(op => op.id === opId ? { ...op, [field]: value } : op);
    await updateDoc(doc(db, 'products', productId), { operations: newOps });
  };
  const toggleResourceForOp = async (productId, opId, resourceId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const newOps = product.operations.map(op => {
        if (op.id !== opId) return op;
        const cIds = Array.isArray(op.resourceIds) ? op.resourceIds : [];
        return { ...op, resourceIds: cIds.includes(resourceId) ? cIds.filter(i => i !== resourceId) : [...cIds, resourceId] };
    });
    await updateDoc(doc(db, 'products', productId), { operations: newOps });
  };
  const deleteOperation = async (productId, opId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const newOps = product.operations.filter(op => op.id !== opId);
    await updateDoc(doc(db, 'products', productId), { operations: newOps });
  };

  // --- РЕСУРСЫ ---
  const addResource = async (data) => addDoc(collection(db, 'resources'), { 
      name: data.name || 'Новый сотрудник', 
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
      dailyEfficiency: {}, safetyViolations: {},
      status: 'active'
  });

  const updateResource = async (id, field, value) => {
      const res = resources.find(r => r.id === id);
      const updates = { [field]: value };
      if (field === 'baseRate') {
          const today = new Date().toISOString().split('T')[0];
          const history = res.rateHistory || [];
          const hasTodayEntry = history.find(h => h.date === today);
          let newHistory = [];
          if(hasTodayEntry) {
              newHistory = history.map(h => h.date === today ? { ...h, rate: value } : h);
          } else {
              newHistory = [...history, { date: today, rate: value }];
          }
          updates.rateHistory = newHistory;
      }
      await updateDoc(doc(db, 'resources', id), updates);
  };

  const updateResourceSchedule = async (id, dateStr, hours, type = null) => {
      const res = resources.find(r => r.id === id);
      if(!res) return;
      const currentSchedule = res.scheduleOverrides || {};
      const newSchedule = { ...currentSchedule, [dateStr]: parseFloat(hours) };
      const currentReasons = res.scheduleReasons || {};
      const newReasons = { ...currentReasons };
      if (type) newReasons[dateStr] = type; else delete newReasons[dateStr];
      await updateDoc(doc(db, 'resources', id), { scheduleOverrides: newSchedule, scheduleReasons: newReasons });
  };

  const updateResourceEfficiency = async (id, dateStr, percent) => {
      const res = resources.find(r => r.id === id);
      if(!res) return;
      const currentEff = res.dailyEfficiency || {};
      const newEff = { ...currentEff, [dateStr]: parseFloat(percent) };
      await updateDoc(doc(db, 'resources', id), { dailyEfficiency: newEff });
  };

  const updateResourceSafety = async (id, dateStr, violationData) => { 
      const res = resources.find(r => r.id === id);
      if(!res) return;
      const current = res.safetyViolations || {};
      const newViolations = { ...current };
      if (violationData) newViolations[dateStr] = violationData; else delete newViolations[dateStr];
      await updateDoc(doc(db, 'resources', id), { safetyViolations: newViolations });
  };

  const fireResource = async (id) => updateDoc(doc(db, 'resources', id), { status: 'fired', firedAt: new Date().toISOString() });
  const deleteResource = async (id) => { if(confirm('Удалить навсегда?')) await deleteDoc(doc(db, 'resources', id)); };
  const addReport = async (data) => addDoc(collection(db, 'reports'), data);
  const deleteReport = async (id) => deleteDoc(doc(db, 'reports', id));

  return {
    resources, setResources: updateResource, updateResourceSchedule, updateResourceEfficiency, updateResourceSafety,
    products, setProducts, orders, setOrders: updateOrder, 
    reports, setReports: addReport, loading,
    actions: {
        addOrder, updateOrder, deleteOrder, finishOrder, restoreOrder,
        addProduct, updateProduct, deleteProduct,
        addOperation, updateOperation, toggleResourceForOp, deleteOperation,
        addResource, updateResource, updateResourceSchedule, updateResourceEfficiency, updateResourceSafety,
        fireResource, deleteResource, addReport, deleteReport
    }
  };
};