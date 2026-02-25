import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { formatDate } from '../utils/helpers';
import { showSuccess, showError, getFirebaseErrorMessage } from '../utils/toast';
import { generateRoute } from '../utils/routeGenerator';

export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const addProduct = async (orderId = null, initialDate = null, planningParams = null) => {
    try {
      const startDate = initialDate || formatDate(new Date());
      let operations = [];

      // Если переданы параметры планирования — генерируем техмаршрут автоматически
      if (planningParams) {
        const route = generateRoute({
          id: planningParams.id || 'new_mark',
          weight_kg: parseFloat(planningParams.weight_kg) || 0,
          quantity: parseInt(planningParams.quantity) || 1,
          complexity: planningParams.complexity || 'medium',
          sizeCategory: planningParams.sizeCategory || 'medium',
          hasProfileCut: planningParams.hasProfileCut !== false,
          hasSheetCut: planningParams.hasSheetCut === true,
          needsCrane: parseFloat(planningParams.weight_kg) > 50,
          needsRolling: planningParams.needsRolling === true
        });

        operations = route.map(op => ({
          id: Date.now() + Math.random(),
          name: op.label,
          minutesPerUnit: Math.round(op.hours * 60),
          actualMinutes: 0,
          resourceIds: [op.preferredResourceId],
          sequence: op.sequence,
          stage: op.stage,
          plannedHours: op.hours
        }));
      }

      const docRef = await addDoc(collection(db, 'products'), {
        orderId,
        name: planningParams?.id || 'Новое изделие',
        quantity: planningParams?.quantity || 1,
        startDate: startDate,
        status: 'active',
        operations: operations,
        createdAt: Date.now(),
        // Сохраняем параметры для AI
        weight_kg: planningParams?.weight_kg || 0,
        sizeCategory: planningParams?.sizeCategory || 'medium',
        complexity: planningParams?.complexity || 'medium'
      });
      return docRef.id;
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  const addProductsBatch = async (orderId, presetItems) => {
    try {
      const startDate = formatDate(new Date());

      for (const item of presetItems) {
        let ops = [];
        
        if (item.ops && item.ops.length > 0) {
          // Старый формат пресетов
          ops = item.ops.map((op, index) => ({
            id: Date.now() + index + Math.random(),
            name: op.name,
            minutesPerUnit: op.minutes,
            actualMinutes: 0,
            resourceIds: [],
            sequence: index + 1
          }));
        } else if (item.weight_kg) {
          // Новый формат КМД (AI-планирование)
          const route = generateRoute({
            id: item.name,
            weight_kg: item.weight_kg,
            quantity: item.quantity || 1,
            complexity: item.complexity || 'medium',
            sizeCategory: item.sizeCategory || 'medium',
            hasProfileCut: item.hasProfileCut !== false,
            hasSheetCut: item.hasSheetCut === true,
            needsCrane: item.weight_kg > 50
          });
          
          ops = route.map(op => ({
            id: Date.now() + Math.random(),
            name: op.label,
            minutesPerUnit: Math.round(op.hours * 60),
            actualMinutes: 0,
            resourceIds: [op.preferredResourceId],
            sequence: op.sequence,
            stage: op.stage,
            plannedHours: op.hours
          }));
        }

        await addDoc(collection(db, 'products'), {
          orderId,
          name: item.name,
          quantity: item.quantity || 1,
          startDate: startDate,
          status: 'active',
          operations: ops,
          createdAt: Date.now(),
          weight_kg: item.weight_kg || 0,
          sizeCategory: item.sizeCategory || 'medium',
          complexity: item.complexity || 'medium'
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

  // Операции
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

  const moveOperationUp = async (productId, opId) => {
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
  };

  const moveOperationDown = async (productId, opId) => {
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
  };

  return {
    products,
    loading,
    actions: {
      addProduct,
      addProductsBatch,
      updateProduct,
      deleteProduct,
      copyOperationsToAll,
      addOperation,
      updateOperation,
      toggleResourceForOp,
      deleteOperation,
      moveOperationUp,
      moveOperationDown,
    }
  };
};
