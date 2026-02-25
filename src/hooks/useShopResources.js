import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { DEFAULT_SHOP_RESOURCES } from '../utils/shopResourcesConfig';

// ─────────────────────────────────────────────────────────────
// ХРАНЕНИЕ ПРОИЗВОДСТВЕННЫХ УЧАСТКОВ В FIREBASE
// Коллекция: 'shopResources'
// ─────────────────────────────────────────────────────────────

export const useShopResources = () => {
  const [shopResources, setShopResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'shopResources'),
      async (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // Первый запуск: коллекция пуста → инициализируем дефолтными ресурсами
        if (list.length === 0) {
          await initializeDefaults();
        } else {
          // Сортируем по фиксированному порядку
          const ORDER = ['bandsaw', 'plasma', 'weld_lg1', 'weld_lg2', 'weld_st1', 'weld_st2', 'fitters', 'paint'];
          list.sort((a, b) => {
            const ai = ORDER.indexOf(a.id);
            const bi = ORDER.indexOf(b.id);
            if (ai === -1 && bi === -1) return 0;
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
          });
          setShopResources(list);
          setLoading(false);
        }
      },
      (error) => {
        console.error('useShopResources: ошибка подписки:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Инициализация дефолтных 8 ресурсов одним batch-запросом
  const initializeDefaults = useCallback(async () => {
    try {
      const batch = writeBatch(db);
      DEFAULT_SHOP_RESOURCES.forEach((resource) => {
        const ref = doc(collection(db, 'shopResources'), resource.id);
        batch.set(ref, {
          ...resource,
          efficiencyCoeff: 1.0,
          createdAt: Date.now(),
        });
      });
      await batch.commit();
      console.log('✅ shopResources: инициализировано', DEFAULT_SHOP_RESOURCES.length, 'участков');
    } catch (error) {
      console.error('shopResources: ошибка инициализации:', error);
      setLoading(false);
    }
  }, []);

  // Обновить поле участка (например, hoursPerDay, isAvailable, efficiencyCoeff)
  const updateShopResource = useCallback(async (id, field, value) => {
    try {
      await updateDoc(doc(db, 'shopResources', id), { [field]: value, updatedAt: Date.now() });
    } catch (error) {
      console.error('updateShopResource:', error);
    }
  }, []);

  // Сброс к дефолтным настройкам
  const resetToDefaults = useCallback(async () => {
    try {
      const batch = writeBatch(db);
      DEFAULT_SHOP_RESOURCES.forEach((resource) => {
        const ref = doc(db, 'shopResources', resource.id);
        batch.set(ref, {
          ...resource,
          efficiencyCoeff: 1.0,
          createdAt: Date.now(),
        });
      });
      await batch.commit();
    } catch (error) {
      console.error('resetToDefaults:', error);
    }
  }, []);

  return {
    shopResources,
    loading,
    actions: {
      updateShopResource,
      resetToDefaults,
    },
  };
};
