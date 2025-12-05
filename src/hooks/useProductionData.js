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
  const [products, setProducts] = useState([]); // Это "Позиции" внутри заказов
  const [orders, setOrders] = useState([]);     // НОВОЕ: Это сами "Заказы" (Папки)
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Загрузка Ресурсов
    const unsubResources = onSnapshot(collection(db, 'resources'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setResources(list.sort((a,b) => a.name.localeCompare(b.name)));
    });

    // 2. Загрузка Позиций (Изделий)
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(list);
    });

    // 3. НОВОЕ: Загрузка Заказов (Папок)
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Сортируем: сначала новые
      setOrders(list.sort((a,b) => b.createdAt - a.createdAt));
    });

    // 4. Загрузка Отчетов
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

  // --- ACTIONS ---

  // НОВОЕ: Создать Группу-Заказ
  const addOrder = async () => {
    const newOrder = {
      orderNumber: 'Новый договор',
      clientName: 'Клиент...',
      deadline: '',
      status: 'active',
      createdAt: Date.now()
    };
    await addDoc(collection(db, 'orders'), newOrder);
  };

  // НОВОЕ: Обновить Заказ
  const updateOrder = async (id, field, value) => {
    await updateDoc(doc(db, 'orders', id), { [field]: value });
  };

  // НОВОЕ: Удалить Заказ (и предупредить, если внутри есть позиции - логика в UI)
  const deleteOrder = async (id) => {
    if(confirm('Удалить этот заказ (папку)? Позиции внутри останутся без привязки.')) {
      await deleteDoc(doc(db, 'orders', id));
    }
  };

  // ОБНОВЛЕНО: Создать позицию (теперь принимает orderId)
  const addProduct = async (orderId = null) => {
    const todayStr = formatDate(new Date());
    const newProduct = {
      orderId: orderId, // Привязка к папке
      name: 'Новое изделие',
      quantity: 1,
      startDate: todayStr,
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
    if(confirm('Удалить эту позицию из заказа?')) {
      await deleteDoc(doc(db, 'products', id));
    }
  };

  // --- OPERATIONS LOGIC (Без изменений, но сохраняем actualMinutes) ---
  const addOperation = async (productId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const maxSeq = product.operations.length > 0 ? Math.max(...product.operations.map(o => o.sequence)) : 0;
    
    const newOperation = {
      id: Date.now(),
      name: 'Сварка',
      resourceIds: [],
      minutesPerUnit: 60,
      actualMinutes: 0,
      sequence: maxSeq + 1
    };
    const newOperations = [...product.operations, newOperation];
    await updateDoc(doc(db, 'products', productId), { operations: newOperations });
  };

  const updateOperation = async (productId, opId, field, value) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
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

  // --- RESOURCES & REPORTS ---
  const addResource = async () => addDoc(collection(db, 'resources'), { name: 'Новый', hoursPerDay: 8 });
  const updateResource = async (id, field, value) => updateDoc(doc(db, 'resources', id), { [field]: value });
  const deleteResource = async (id) => deleteDoc(doc(db, 'resources', id));
  const addReport = async (data) => addDoc(collection(db, 'reports'), data);
  const deleteReport = async (id) => deleteDoc(doc(db, 'reports', id));

  return {
    resources, setResources: updateResource, 
    products, setProducts,
    orders, setOrders: updateOrder, // Экспортируем orders
    reports, setReports: addReport,
    loading,
    actions: {
        addOrder, updateOrder, deleteOrder, // Экспортируем действия с заказами
        addProduct, updateProduct, toggleProductStatus, deleteProduct,
        addOperation, updateOperation, toggleResourceForOp, deleteOperation,
        addResource, updateResource, deleteResource,
        addReport, deleteReport
    }
  };
};