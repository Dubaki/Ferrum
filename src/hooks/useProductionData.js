import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { formatDate } from '../utils/helpers';
import { showSuccess, showError, getFirebaseErrorMessage } from '../utils/toast';
import { deleteDrawing } from '../utils/supabaseStorage';

export const useProductionData = () => {
  const [resources, setResources] = useState([]);
  const [products, setProducts] = useState([]); 
  const [orders, setOrders] = useState([]);     
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribes = [];

    const createSnapshotPromise = (collectionName, setState, sortFn = null) => {
      return new Promise(resolve => {
        const unsubscribe = onSnapshot(collection(db, collectionName), (snapshot) => {
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setState(sortFn ? list.sort(sortFn) : list);
          resolve(); // Resolve the promise on the first snapshot
        });
        unsubscribes.push(unsubscribe); // Add unsubscribe to the list
      });
    };

    const resourcePromise = createSnapshotPromise('resources', setResources, (a,b) => a.name.localeCompare(b.name));
    const productsPromise = createSnapshotPromise('products', setProducts);
    const ordersPromise = createSnapshotPromise('orders', setOrders, (a,b) => b.createdAt - a.createdAt);
    const reportsPromise = createSnapshotPromise('reports', setReports, (a,b) => b.createdAt - a.createdAt);

    Promise.all([resourcePromise, productsPromise, ordersPromise, reportsPromise])
      .then(() => setLoading(false))
      .catch(error => {
        console.error("Error loading initial data:", error);
        showError("Ошибка при загрузке данных.");
        setLoading(false); // Ensure loading is false even on error
      });

    return () => {
      unsubscribes.forEach(unsub => unsub()); // Unsubscribe all listeners
    };
  }, []);

  // --- Actions ---

  const addOrder = useCallback(async (data) => {
    try {
      const now = Date.now();
      await addDoc(collection(db, 'orders'), {
        orderNumber: data?.orderNumber || 'Новый',
        clientName: data?.clientName || '',
        deadline: data?.deadline || '',
        status: 'active',
        customStatus: data?.customStatus || 'metal',
        isProductOrder: data?.isProductOrder || false, // ИСПРАВЛЕНИЕ: Сохраняем тип заказа
        drawingsDeadline: data?.drawingsDeadline || null,
        materialsDeadline: data?.materialsDeadline || null,
        paintDeadline: data?.paintDeadline || null, // Добавил paintDeadline который отсутствовал
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
  }, [showSuccess, showError, getFirebaseErrorMessage, db]);

  const addStatusHistory = (order, status, role, note = '') => {
    const history = order.statusHistory || [];
    return [...history, { status, timestamp: Date.now(), role, note }];
  };

  const updateOrder = useCallback(async (id, field, value, userRole = 'admin') => {
    try {
      const order = orders.find(o => o.id === id);
      if (!order) return;

      if (field === 'customStatus') {
        const newHistory = addStatusHistory(order, value, userRole, `Статус изменён на: ${value}`);
        await updateDoc(doc(db, 'orders', id), { [field]: value, statusHistory: newHistory });
        return;
      }
      
      // Для других важных полей тоже можем писать в историю
      const importantFields = {
        'isImportant': value ? 'Отмечен как важный' : 'Снята отметка важности',
        'drawingsArrived': value ? 'КМД получены' : 'Отметка КМД снята',
        'materialsArrived': value ? 'Металл получен' : 'Отметка металла снята',
        'paintArrived': value ? 'Краска получена' : 'Отметка краски снята'
      };

      if (importantFields[field]) {
        const newHistory = addStatusHistory(order, order.customStatus, userRole, importantFields[field]);
        await updateDoc(doc(db, 'orders', id), { [field]: value, statusHistory: newHistory });
        return;
      }

      await updateDoc(doc(db, 'orders', id), { [field]: value });
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  }, [orders, showError, getFirebaseErrorMessage, db]);

  const finishOrder = useCallback(async (id) => {
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
  }, [products, showError, showSuccess, getFirebaseErrorMessage, db]);

  const restoreOrder = useCallback(async (id) => {
    try {
      await updateDoc(doc(db, 'orders', id), { status: 'active', finishedAt: null, shippedAt: null });
      showSuccess('Заказ восстановлен');
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  }, [showSuccess, showError, getFirebaseErrorMessage, db]);

  // --- ОТГРУЗКИ ---

  // Переместить заказ в раздел отгрузок
  const moveToShipping = useCallback(async (id, userRole = 'admin') => {
    try {
      const order = orders.find(o => o.id === id);
      if (!order) return;

      const newHistory = addStatusHistory(order, order.customStatus, userRole, 'Перемещён в отгрузки (на склад)');

      // Помечаем заказ как в отгрузке
      await updateDoc(doc(db, 'orders', id), {
        inShipping: true,
        shippingToday: false,
        statusHistory: newHistory
      });

      // Автоматически завершаем все незавершённые операции
      const orderProducts = products.filter(p => p.orderId === id);

      for (const product of orderProducts) {
        const hasUnfinishedOps = product.operations?.some(op => (op.actualMinutes || 0) === 0);

        if (hasUnfinishedOps) {
          const productRef = doc(db, 'products', product.id);
          const updatedOps = product.operations.map(op => {
            // Если операция не выполнена - проставляем плановое время (или минимум 1 минуту)
            if ((op.actualMinutes || 0) === 0) {
              const plannedTime = op.minutesPerUnit || 1; // Минимум 1 минута
              return { ...op, actualMinutes: plannedTime };
            }
            return op;
          });
          await updateDoc(productRef, { operations: updatedOps });
        }
      }

      showSuccess('Заказ перемещён в отгрузки (все операции завершены)');
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  }, [orders, products, showSuccess, showError, getFirebaseErrorMessage, db]);

  // Вернуть заказ из отгрузок в заказы
  const returnFromShipping = useCallback(async (id, userRole = 'admin') => {
    try {
      const order = orders.find(o => o.id === id);
      if (!order) return;

      const newHistory = addStatusHistory(order, order.customStatus, userRole, 'Возвращён из отгрузок в работу');

      await updateDoc(doc(db, 'orders', id), {
        inShipping: false,
        shippingToday: false,
        statusHistory: newHistory
      });
      showSuccess('Заказ возвращён в работу');
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  }, [orders, showSuccess, showError, getFirebaseErrorMessage, db]);

  // Отметить/снять отметку "отгрузка сегодня"
  const toggleShippingToday = useCallback(async (id, userRole = 'admin') => {
    try {
      const order = orders.find(o => o.id === id);
      if (!order) return;

      const note = !order.shippingToday ? 'Отмечен к отгрузке на сегодня' : 'Отметка "на сегодня" снята';
      const newHistory = addStatusHistory(order, order.customStatus, userRole, note);

      await updateDoc(doc(db, 'orders', id), {
        shippingToday: !order.shippingToday,
        statusHistory: newHistory
      });
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  }, [orders, showError, getFirebaseErrorMessage, db]);

  const completeShipping = useCallback(async (id, userRole = 'admin') => {
    try {
      const order = orders.find(o => o.id === id);
      if (!order) return;

      const newHistory = addStatusHistory(order, 'completed', userRole, 'Заказ отгружен (Архив)');

      const updates = {
        status: 'completed',
        inShipping: false,
        shippingToday: false,
        shippedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        statusHistory: newHistory
      };

      // Удаляем чертежи из Supabase Storage и помечаем как удалённые
      if (order?.drawings && order.drawings.length > 0) {
        // Физически удаляем файлы из Supabase Storage
        const deletePromises = order.drawings
          .filter(d => !d.deleted && d.path) // Только активные файлы с путем
          .map(drawing =>
            deleteDrawing(drawing.path).catch(err => {
              console.error(`Ошибка удаления файла ${drawing.path}:`, err);
              // Не прерываем процесс если не удалось удалить файл
            })
          );

        await Promise.all(deletePromises);

        // Помечаем все чертежи как удалённые в метаданных
        updates.drawings = order.drawings.map(d => ({ ...d, deleted: true }));
      }

      await updateDoc(doc(db, 'orders', id), updates);
      showSuccess('Заказ отгружен и перемещён в архив');
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  }, [orders, deleteDrawing, showSuccess, showError, getFirebaseErrorMessage, db]);

  const deleteOrder = useCallback(async (id) => {
    try {
      await deleteDoc(doc(db, 'orders', id));
      showSuccess('Заказ удалён');
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  }, [showSuccess, showError, getFirebaseErrorMessage, db]);

  // --- ЧЕРТЕЖИ (Cloudinary) ---

  // Вспомогательная функция для удаления undefined значений из объекта
  const cleanUndefined = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(cleanUndefined);
    }

    const cleaned = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== undefined) {
        cleaned[key] = typeof value === 'object' ? cleanUndefined(value) : value;
      }
    });
    return cleaned;
  };

  // Добавить чертёж к заказу (метаданные)
  const addDrawingToOrder = useCallback(async (orderId, drawingData) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const currentDrawings = order.drawings || [];

      // Очищаем undefined значения перед добавлением
      const cleanedData = cleanUndefined({ ...drawingData, deleted: false });
      const newDrawings = [...currentDrawings, cleanedData];

      await updateDoc(doc(db, 'orders', orderId), { drawings: newDrawings });
      showSuccess('Чертёж загружен');
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  }, [orders, cleanUndefined, showSuccess, showError, getFirebaseErrorMessage, db]);

  // Удалить чертёж (пометить как deleted)
  const deleteDrawingFromOrder = useCallback(async (orderId, filePath) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const currentDrawings = order.drawings || [];
      const newDrawings = currentDrawings.map(d =>
        d.path === filePath ? { ...d, deleted: true } : d
      );

      await updateDoc(doc(db, 'orders', orderId), { drawings: newDrawings });
      showSuccess('Чертёж удалён');
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  }, [orders, showSuccess, showError, getFirebaseErrorMessage, db]);

  // --- ПРОДУКТЫ ---
  const addProduct = useCallback(async (orderId = null, initialDate = null) => {
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
  }, [formatDate, showError, getFirebaseErrorMessage, db]);

  // Пакетное добавление из пресетов
  const addProductsBatch = useCallback(async (orderId, presetItems) => {
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
          isResale: item.isResale || false, // ИСПРАВЛЕНИЕ: Учитываем флаг товара из item
          createdAt: Date.now()
        });
      }
      showSuccess(`Добавлено изделий: ${presetItems.length}`);
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  }, [formatDate, showSuccess, showError, getFirebaseErrorMessage, db]);

  const updateProduct = useCallback(async (id, field, value) => {
    try {
      await updateDoc(doc(db, 'products', id), { [field]: value });
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  }, [showError, getFirebaseErrorMessage, db]);

  const deleteProduct = useCallback(async (id) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      showSuccess('Изделие удалено');
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  }, [showSuccess, showError, getFirebaseErrorMessage, db]);

  const copyOperationsToAll = useCallback(async (sourceProductId) => {
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
  }, [products, showError, showSuccess, getFirebaseErrorMessage, db]);

  const addOperation = useCallback(async (productId, initialName = 'Новая операция') => {
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
  }, [products, showError, getFirebaseErrorMessage, db]);

  const updateOperation = useCallback(async (productId, opId, field, value) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;
      const newOps = product.operations.map(op => op.id === opId ? { ...op, [field]: value } : op);
      await updateDoc(doc(db, 'products', productId), { operations: newOps });
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  }, [products, showError, getFirebaseErrorMessage, db]);

  const toggleResourceForOp = useCallback(async (productId, opId, resourceId) => {
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
  }, [products, showError, getFirebaseErrorMessage, db]);

  const deleteOperation = useCallback(async (productId, opId) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;
      const newOps = product.operations.filter(op => op.id !== opId);
      await updateDoc(doc(db, 'products', productId), { operations: newOps });
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  }, [products, showError, getFirebaseErrorMessage, db]);

  const moveOperationUp = useCallback(async (productId, opId) => {
    try {
      console.log('moveOperationUp called', { productId, opId });
      const product = products.find(p => p.id === productId);
      if (!product) {
        console.log('Product not found');
        return;
      }

      // ВАЖНО: Сначала сортируем операции по sequence
      const sortedOps = [...product.operations].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
      console.log('Sorted ops:', sortedOps.map(op => ({ name: op.name, seq: op.sequence })));

      const idx = sortedOps.findIndex(op => op.id === opId);
      console.log('Found index:', idx);

      if (idx <= 0) {
        console.log('Already first, cannot move up');
        return; // Уже первая
      }

      // Меняем местами
      [sortedOps[idx - 1], sortedOps[idx]] = [sortedOps[idx], sortedOps[idx - 1]];
      console.log('After swap:', sortedOps.map(op => ({ name: op.name, seq: op.sequence })));

      // Пересчитываем sequence
      sortedOps.forEach((op, i) => op.sequence = i + 1);
      console.log('After resequence:', sortedOps.map(op => ({ name: op.name, seq: op.sequence })));

      await updateDoc(doc(db, 'products', productId), { operations: sortedOps });
      console.log('Updated in Firebase');
    } catch (error) {
      console.error('moveOperationUp error:', error);
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  }, [products, showError, getFirebaseErrorMessage, db]);

  const moveOperationDown = useCallback(async (productId, opId) => {
    try {
      console.log('moveOperationDown called', { productId, opId });
      const product = products.find(p => p.id === productId);
      if (!product) {
        console.log('Product not found');
        return;
      }

      // ВАЖНО: Сначала сортируем операции по sequence
      const sortedOps = [...product.operations].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
      console.log('Sorted ops:', sortedOps.map(op => ({ name: op.name, seq: op.sequence })));

      const idx = sortedOps.findIndex(op => op.id === opId);
      console.log('Found index:', idx);

      if (idx < 0 || idx >= sortedOps.length - 1) {
        console.log('Already last, cannot move down');
        return; // Уже последняя
      }

      // Меняем местами
      [sortedOps[idx], sortedOps[idx + 1]] = [sortedOps[idx + 1], sortedOps[idx]];
      console.log('After swap:', sortedOps.map(op => ({ name: op.name, seq: op.sequence })));

      // Пересчитываем sequence
      sortedOps.forEach((op, i) => op.sequence = i + 1);
      console.log('After resequence:', sortedOps.map(op => ({ name: op.name, seq: op.sequence })));

      await updateDoc(doc(db, 'products', productId), { operations: sortedOps });
      console.log('Updated in Firebase');
    } catch (error) {
      console.error('moveOperationDown error:', error);
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  }, [products, showError, getFirebaseErrorMessage, db]);

  // --- Resources ---
  const addResource = useCallback(async (data) => {
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
  }, [showSuccess, showError, getFirebaseErrorMessage, db]);

  const updateResource = useCallback(async (id, field, value) => {
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

      // ИСПРАВЛЕНИЕ: При установке даты трудоустройства обнуляем все смены ДО этой даты
      if (field === 'employmentDate' && value) {
        const currentSchedule = res.scheduleOverrides || {};
        const newSchedule = {};

        // Проходим по всем сменам и обнуляем те, что ДО даты трудоустройства
        Object.keys(currentSchedule).forEach(dateStr => {
          if (dateStr < value) {
            newSchedule[dateStr] = 0; // Обнуляем смены до даты трудоустройства
          } else {
            newSchedule[dateStr] = currentSchedule[dateStr]; // Оставляем как есть
          }
        });

        updates.scheduleOverrides = newSchedule;
      }

      await updateDoc(doc(db, 'resources', id), updates);
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  }, [resources, showError, getFirebaseErrorMessage, db]);

  const updateResourceSchedule = useCallback(async (id, dateStr, hours, type = null) => {
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
  }, [resources, showError, getFirebaseErrorMessage, db]);

  const updateResourceEfficiency = useCallback(async (id, dateStr, percent) => {
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
  }, [resources, showError, getFirebaseErrorMessage, db]);

  const updateResourceSafety = useCallback(async (id, dateStr, violationData) => {
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
  }, [resources, showError, getFirebaseErrorMessage, db]);

  const fireResource = useCallback(async (id) => {
    try {
      await updateDoc(doc(db, 'resources', id), { status: 'fired', firedAt: new Date().toISOString() });
      showSuccess('Сотрудник уволен');
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  }, [showSuccess, showError, getFirebaseErrorMessage, db]);

  const deleteResource = useCallback(async (id) => {
    try {
      await deleteDoc(doc(db, 'resources', id));
      showSuccess('Сотрудник удалён');
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  }, [showSuccess, showError, getFirebaseErrorMessage, db]);

  const addReport = useCallback(async (data) => {
    try {
      await addDoc(collection(db, 'reports'), data);
      showSuccess('Отчёт сохранён');
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  }, [showSuccess, showError, getFirebaseErrorMessage, db]);

  const deleteReport = useCallback(async (id) => {
    try {
      await deleteDoc(doc(db, 'reports', id));
      showSuccess('Отчёт удалён');
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  }, [showSuccess, showError, getFirebaseErrorMessage, db]);

  const memoizedActions = useMemo(() => ({
    addOrder, updateOrder, deleteOrder, finishOrder, restoreOrder,
    moveToShipping, returnFromShipping, toggleShippingToday, completeShipping,
    addDrawingToOrder, deleteDrawingFromOrder,
    addProduct, addProductsBatch, updateProduct, deleteProduct, copyOperationsToAll,
    addOperation, updateOperation, toggleResourceForOp, deleteOperation,
    moveOperationUp, moveOperationDown,
    addResource, updateResource, updateResourceSchedule, updateResourceEfficiency, updateResourceSafety,
    fireResource, deleteResource, addReport, deleteReport
  }), [
    addOrder, updateOrder, deleteOrder, finishOrder, restoreOrder,
    moveToShipping, returnFromShipping, toggleShippingToday, completeShipping,
    addDrawingToOrder, deleteDrawingFromOrder,
    addProduct, addProductsBatch, updateProduct, deleteProduct, copyOperationsToAll,
    addOperation, updateOperation, toggleResourceForOp, deleteOperation,
    moveOperationUp, moveOperationDown,
    addResource, updateResource, updateResourceSchedule, updateResourceEfficiency, updateResourceSafety,
    fireResource, deleteResource, addReport, deleteReport
  ]);

  return {
    resources, setResources,
    products, setProducts,
    orders, setOrders,
    reports, setReports,
    loading,
    actions: memoizedActions
  };
};