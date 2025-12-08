import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc
} from 'firebase/firestore';
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

    return () => {
      unsubResources();
      unsubProducts();
      unsubOrders();
      unsubReports();
    };
  }, []);

  // --- ЗАКАЗЫ ---
  const addOrder = async () => {
    await addDoc(collection(db, 'orders'), {
      orderNumber: '', clientName: '', deadline: '', status: 'active',
      createdAt: Date.now(), finishedAt: null
    });
  };
  const updateOrder = async (id, field, value) => updateDoc(doc(db, 'orders', id), { [field]: value });
  const finishOrder = async (id) => {
      if(confirm('Завершить заказ и перенести в отчеты?')) {
        await updateDoc(doc(db, 'orders', id), { status: 'completed', finishedAt: new Date().toISOString() });
      }
  };
  const restoreOrder = async (id) => {
      if(confirm('Вернуть заказ в активную работу?')) {
        await updateDoc(doc(db, 'orders', id), { status: 'active', finishedAt: null });
      }
  };
  const deleteOrder = async (id) => {
    if(confirm('Удалить заказ навсегда?')) await deleteDoc(doc(db, 'orders', id));
  };

  // --- ИЗДЕЛИЯ ---
  const addProduct = async (orderId = null) => {
    const todayStr = formatDate(new Date());
    await addDoc(collection(db, 'products'), {
      orderId: orderId, name: 'Новое изделие', quantity: 1, startDate: todayStr,
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
      hoursPerDay: 8, 
      scheduleOverrides: {},
      baseRate: parseFloat(data.baseRate) || 3000,
      employmentDate: data.employmentDate || new Date().toISOString().split('T')[0],
      dailyEfficiency: {},
      status: 'active'
  });

  const updateResource = async (id, field, value) => updateDoc(doc(db, 'resources', id), { [field]: value });
  const updateResourceSchedule = async (id, dateStr, hours) => {
      const res = resources.find(r => r.id === id);
      if(!res) return;
      const currentSchedule = res.scheduleOverrides || {};
      const newSchedule = { ...currentSchedule, [dateStr]: parseFloat(hours) };
      await updateDoc(doc(db, 'resources', id), { scheduleOverrides: newSchedule });
  };
  const updateResourceEfficiency = async (id, dateStr, percent) => {
      const res = resources.find(r => r.id === id);
      if(!res) return;
      const currentEff = res.dailyEfficiency || {};
      const newEff = { ...currentEff, [dateStr]: parseFloat(percent) };
      await updateDoc(doc(db, 'resources', id), { dailyEfficiency: newEff });
  };

  const fireResource = async (id) => {
      if(confirm('Уволить сотрудника? Он будет перенесен в архив.')) {
          await updateDoc(doc(db, 'resources', id), { 
              status: 'fired', 
              firedAt: new Date().toISOString() 
          });
      }
  };

  const deleteResource = async (id) => {
      if(confirm('ВНИМАНИЕ: Удалить сотрудника навсегда? История по нему может пропасть.')) {
          await deleteDoc(doc(db, 'resources', id));
      }
  };

  const addReport = async (data) => addDoc(collection(db, 'reports'), data);
  const deleteReport = async (id) => deleteDoc(doc(db, 'reports', id));

  return {
    resources, setResources: updateResource, updateResourceSchedule, updateResourceEfficiency,
    products, setProducts, orders, setOrders: updateOrder, 
    reports, setReports: addReport, loading,
    actions: {
        addOrder, updateOrder, deleteOrder, finishOrder, restoreOrder,
        addProduct, updateProduct, deleteProduct,
        addOperation, updateOperation, toggleResourceForOp, deleteOperation,
        addResource, updateResource, updateResourceSchedule, updateResourceEfficiency, 
        fireResource, deleteResource, // Добавили fireResource
        addReport, deleteReport
    }
  };
};