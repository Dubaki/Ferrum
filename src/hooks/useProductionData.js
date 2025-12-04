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
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Сотрудники
    const unsubResources = onSnapshot(collection(db, 'resources'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setResources(list.sort((a,b) => a.name.localeCompare(b.name)));
    });

    // 2. Заказы
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(list);
    });

    // 3. Отчеты
    const unsubReports = onSnapshot(collection(db, 'reports'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(list.sort((a,b) => b.createdAt - a.createdAt)); 
      setLoading(false);
    });

    return () => {
      unsubResources();
      unsubProducts();
      unsubReports();
    };
  }, []);

  // --- ACTIONS ---

  // === Products ===
  const addProduct = async () => {
    const todayStr = formatDate(new Date());
    const newProduct = {
      name: 'Новый заказ',
      quantity: 1,
      startDate: todayStr,
      deadline: todayStr, // <-- НОВОЕ ПОЛЕ: Срок сдачи
      status: 'active',
      operations: [],
      createdAt: Date.now()
    };
    await addDoc(collection(db, 'products'), newProduct);
  };

  const updateProduct = async (id, field, value) => {
    const productRef = doc(db, 'products', id);
    await updateDoc(productRef, { [field]: value });
  };

  const toggleProductStatus = async (id) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const newStatus = product.status === 'active' ? 'completed' : 'active';
    await updateDoc(doc(db, 'products', id), { status: newStatus });
  };

  const deleteProduct = async (id) => {
    if(confirm('Вы уверены, что хотите удалить заказ?')) {
      await deleteDoc(doc(db, 'products', id));
    }
  };

  // === Operations ===
  const addOperation = async (productId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const maxSeq = product.operations.length > 0 ? Math.max(...product.operations.map(o => o.sequence)) : 0;
    
    const newOperation = {
      id: Date.now(),
      name: 'Сварка', // Значение по умолчанию из списка
      resourceIds: [],
      minutesPerUnit: 60,
      sequence: maxSeq + 1
    };

    const newOperations = [...product.operations, newOperation];
    await updateDoc(doc(db, 'products', productId), { operations: newOperations });
  };

  const updateOperation = async (productId, opId, field, value) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Мы больше НЕ сохраняем новые операции в глобальный список (addStandardOperation удален)

    const newOperations = product.operations.map(op => 
      op.id === opId ? { ...op, [field]: value } : op
    );
    await updateDoc(doc(db, 'products', productId), { operations: newOperations });
  };

  const toggleResourceForOp = async (productId, opId, resourceId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const newOperations = product.operations.map(op => {
      if (op.id !== opId) return op;
      const currentIds = op.resourceIds || [];
      const newIds = currentIds.includes(resourceId) 
        ? currentIds.filter(id => id !== resourceId) 
        : [...currentIds, resourceId];
      return { ...op, resourceIds: newIds };
    });
    await updateDoc(doc(db, 'products', productId), { operations: newOperations });
  };

  const deleteOperation = async (productId, opId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const newOperations = product.operations.filter(op => op.id !== opId);
    await updateDoc(doc(db, 'products', productId), { operations: newOperations });
  };

  // === Resources ===
  const addResource = async () => {
     await addDoc(collection(db, 'resources'), {
       name: 'Новый сотрудник',
       hoursPerDay: 8,
       schedule: {}
     });
  };

  const updateResource = async (id, field, value) => {
      await updateDoc(doc(db, 'resources', id), { [field]: value });
  };
  
  const deleteResource = async (id) => {
      if(confirm('Удалить сотрудника?')) {
        await deleteDoc(doc(db, 'resources', id));
      }
  };

  // === Reports ===
  const addReport = async (reportData) => {
     await addDoc(collection(db, 'reports'), reportData);
  };
  
  const deleteReport = async (id) => {
      if(confirm('Удалить отчет?')) {
        await deleteDoc(doc(db, 'reports', id));
      }
  };

  return {
    resources, 
    setResources: updateResource, 
    products, 
    setProducts,
    reports, 
    setReports: addReport,
    loading,
    actions: {
        addProduct, updateProduct, toggleProductStatus, deleteProduct,
        addOperation, updateOperation, toggleResourceForOp, deleteOperation,
        addResource, updateResource, deleteResource,
        addReport, deleteReport
    }
  };
};