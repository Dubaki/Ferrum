import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { formatDate } from '../utils/helpers';
import { showSuccess, showError, getFirebaseErrorMessage } from '../utils/toast';

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
    }
  };
};
