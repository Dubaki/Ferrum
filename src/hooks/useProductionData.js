import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '../firebase'; // Импорт нашей базы данных
import { formatDate } from '../utils/helpers';

export const useProductionData = () => {
  const [resources, setResources] = useState([]);
  const [products, setProducts] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- 1. СЛУШАЕМ БАЗУ ДАННЫХ (REAL-TIME) ---
  // Этот useEffect срабатывает при старте и "подписывается" на обновления.
  // Как только кто-то (вы или коллега) меняет данные в Firebase, 
  // эти функции запускаются автоматически и обновляют экран.
  
  useEffect(() => {
    // Слушаем коллекцию сотрудников
    const unsubResources = onSnapshot(collection(db, 'resources'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Сортируем по имени, чтобы список не прыгал
      setResources(list.sort((a,b) => a.name.localeCompare(b.name)));
    });

    // Слушаем коллекцию заказов
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(list);
    });

    // Слушаем коллекцию отчетов
    const unsubReports = onSnapshot(collection(db, 'reports'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Сортируем: самые новые отчеты сверху
      setReports(list.sort((a,b) => b.createdAt - a.createdAt)); 
      setLoading(false);
    });

    // Когда вкладка закрывается, отписываемся от прослушивания
    return () => {
      unsubResources();
      unsubProducts();
      unsubReports();
    };
  }, []);


  // --- 2. ФУНКЦИИ УПРАВЛЕНИЯ (CRUD) ---
  // Эти функции отправляют команды в Firebase

  // === ЗАКАЗЫ (Products) ===
  const addProduct = async () => {
    const newProduct = {
      name: 'Новый заказ',
      quantity: 1,
      startDate: formatDate(new Date()),
      status: 'active',
      operations: [],
      createdAt: Date.now() // Нужно для сортировки
    };
    // addDoc автоматически создает уникальный ID документа
    await addDoc(collection(db, 'products'), newProduct);
  };

  const updateProduct = async (id, field, value) => {
    const productRef = doc(db, 'products', id);
    // updateDoc меняет только указанное поле, не трогая остальные
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

  // === ОПЕРАЦИИ (Operations) ===
  // В Firebase операции хранятся ВНУТРИ документа заказа (как массив).
  // Поэтому мы скачиваем массив, меняем его и перезаписываем обратно в заказ.
  
  const addOperation = async (productId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Находим максимальный sequence (номер по порядку)
    const maxSeq = product.operations.length > 0 ? Math.max(...product.operations.map(o => o.sequence)) : 0;
    
    const newOperation = {
      id: Date.now(), // Используем время как уникальный ID операции
      name: 'Новая операция',
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
      // Если ID уже есть - убираем, если нет - добавляем
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

  // === СОТРУДНИКИ (Resources) ===
  const addResource = async () => {
     await addDoc(collection(db, 'resources'), {
       name: 'Новый сотрудник',
       hoursPerDay: 8,
       schedule: {} // Здесь будет храниться календарь (больничные/отпуска)
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

  // === ОТЧЕТЫ (Reports) ===
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
    setResources: updateResource, // Перенаправляем для совместимости с ResourcesTab
    products, 
    setProducts,
    reports, 
    setReports: addReport, // Перенаправляем для совместимости с ReportsTab
    loading,
    actions: {
        addProduct, updateProduct, toggleProductStatus, deleteProduct,
        addOperation, updateOperation, toggleResourceForOp, deleteOperation,
        addResource, updateResource, deleteResource,
        addReport, deleteReport 
    }
  };
};