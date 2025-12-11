import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { formatDate } from '../utils/helpers';

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

  const addOrder = async () => {
    const now = Date.now();
    await addDoc(collection(db, 'orders'), {
      orderNumber: 'Новый', clientName: '', deadline: '', status: 'active',
      customStatus: 'metal', paymentDate: formatDate(new Date()),
      statusHistory: [{ status: 'metal', timestamp: now }], createdAt: now, finishedAt: null
    });
  };

  const updateOrder = async (id, field, value) => {
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
  };

  const finishOrder = async (id) => { 
      if(confirm('Завершить заказ?')) {
          await updateDoc(doc(db, 'orders', id), { status: 'completed', finishedAt: new Date().toISOString() }); 
      }
  };
  
  const restoreOrder = async (id) => updateDoc(doc(db, 'orders', id), { status: 'active', finishedAt: null });
  
  const deleteOrder = async (id) => { 
      if(confirm('Удалить заказ?')) {
          await deleteDoc(doc(db, 'orders', id)); 
      }
  };

  const addProduct = async (orderId = null, initialDate = null) => { 
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
  };

  const updateProduct = async (id, field, value) => updateDoc(doc(db, 'products', id), { [field]: value });
  
  const deleteProduct = async (id) => { 
      if(confirm('Удалить позицию?')) {
          await deleteDoc(doc(db, 'products', id)); 
      }
  };

  // --- ОБНОВЛЕННАЯ ФУНКЦИЯ: ПОЛНОЕ КЛОНИРОВАНИЕ ОПЕРАЦИЙ ---
  const copyOperationsToAll = async (sourceProductId) => {
      const sourceProduct = products.find(p => p.id === sourceProductId);
      if (!sourceProduct || !sourceProduct.operations.length) return;

      const orderId = sourceProduct.orderId;
      // Находим другие изделия в этом заказе
      const siblings = products.filter(p => p.orderId === orderId && p.id !== sourceProductId);
      
      if (siblings.length === 0) {
          alert("В этом заказе нет других изделий");
          return;
      }

      if (!confirm(`Скопировать операции (${sourceProduct.operations.length} шт.) во все остальные изделия (${siblings.length} шт.) этого заказа?\n\nБудут скопированы: Исполнители, Плановое время, Фактическое время.`)) return;

      const batch = writeBatch(db);

      siblings.forEach(prod => {
          // Создаем полную копию операций
          const newOps = sourceProduct.operations.map(op => ({
              ...op, // Копируем всё: name, minutesPerUnit, sequence, actualMinutes
              id: Date.now() + Math.random(), // Генерируем новый уникальный ID для операции
              resourceIds: [...(op.resourceIds || [])] // Копируем массив исполнителей (создаем новый массив)
          }));
          
          const ref = doc(db, 'products', prod.id);
          batch.update(ref, { operations: newOps });
      });

      await batch.commit();
  };

  const addOperation = async (productId, initialName = 'Сварка') => {
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

  // --- Resources ---
  const addResource = async (data) => addDoc(collection(db, 'resources'), { 
      name: data.name || 'Новый', position: data.position || 'Рабочий',
      phone: data.phone || '', address: data.address || '', dob: data.dob || '',
      photoUrl: data.photoUrl || '', hoursPerDay: parseFloat(data.hoursPerDay) || 8, 
      workWeekends: data.workWeekends || false, scheduleOverrides: {}, scheduleReasons: {},
      baseRate: parseFloat(data.baseRate) || 3000, rateHistory: [],
      employmentDate: data.employmentDate || new Date().toISOString().split('T')[0],
      dailyEfficiency: {}, safetyViolations: {}, status: 'active'
  });

  const updateResource = async (id, field, value) => {
      const res = resources.find(r => r.id === id);
      const updates = { [field]: value };
      if (field === 'baseRate') {
          const oldRate = res.baseRate; 
          const empDate = res.employmentDate || '2023-01-01';
          const today = new Date().toISOString().split('T')[0];
          let history = res.rateHistory ? [...res.rateHistory] : [];
          if (history.length === 0) history.push({ date: empDate, rate: oldRate });
          const hasTodayIndex = history.findIndex(h => h.date === today);
          if (hasTodayIndex >= 0) history[hasTodayIndex].rate = value;
          else history.push({ date: today, rate: value });
          updates.rateHistory = history;
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
  
  const deleteResource = async (id) => { 
      if(confirm('Удалить навсегда?')) {
          await deleteDoc(doc(db, 'resources', id)); 
      }
  };

  const addReport = async (data) => addDoc(collection(db, 'reports'), data);
  const deleteReport = async (id) => deleteDoc(doc(db, 'reports', id));

  return {
    resources, setResources: updateResource, updateResourceSchedule, updateResourceEfficiency, updateResourceSafety,
    products, setProducts, orders, setOrders: updateOrder, reports, setReports: addReport, loading,
    actions: {
        addOrder, updateOrder, deleteOrder, finishOrder, restoreOrder,
        addProduct, updateProduct, deleteProduct, copyOperationsToAll, 
        addOperation, updateOperation, toggleResourceForOp, deleteOperation,
        addResource, updateResource, updateResourceSchedule, updateResourceEfficiency, updateResourceSafety,
        fireResource, deleteResource, addReport, deleteReport
    }
  };
};