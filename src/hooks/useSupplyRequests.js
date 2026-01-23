import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { showSuccess, showError, getFirebaseErrorMessage } from '../utils/toast';

export const useSupplyRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Подписка на коллекцию supplyRequests
  useEffect(() => {
    const q = query(collection(db, 'supplyRequests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(list);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching supply requests:', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Генерация номера заявки
  const generateRequestNumber = () => {
    const year = new Date().getFullYear().toString().slice(-2);
    const existingNumbers = requests
      .map(r => r.requestNumber)
      .filter(n => n && n.startsWith(`СН-${year}`))
      .map(n => parseInt(n.split('-')[1]?.slice(2) || '0', 10))
      .filter(n => !isNaN(n));

    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const newNumber = (maxNumber + 1).toString().padStart(3, '0');
    return `СН-${year}${newNumber}`;
  };

  // Создание заявки
  const createRequest = async (data) => {
    try {
      const now = Date.now();
      const requestNumber = generateRequestNumber();

      await addDoc(collection(db, 'supplyRequests'), {
        requestNumber,
        orderId: data.orderId || null,
        orderNumber: data.orderNumber || '',

        title: data.title,
        description: data.description || '',
        quantity: data.quantity,
        unit: data.unit,
        desiredDate: data.desiredDate || null,

        status: 'new',

        approvals: {
          technologist: false,
          technologistAt: null,
          shopManager: false,
          shopManagerAt: null,
          director: false,
          directorAt: null,
          accountant: false,
          accountantAt: null
        },

        deliveryDate: null,
        deliveredAt: null,

        createdBy: data.createdBy || 'technologist',
        createdAt: now,
        updatedAt: now,
        statusHistory: [{ status: 'new', timestamp: now, role: data.createdBy || 'technologist', note: 'Заявка создана' }]
      });

      showSuccess(`Заявка ${requestNumber} создана`);
      return requestNumber;
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  // Обновление заявки
  const updateRequest = async (id, updates) => {
    try {
      await updateDoc(doc(db, 'supplyRequests', id), {
        ...updates,
        updatedAt: Date.now()
      });
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  // Удаление заявки
  const deleteRequest = async (id) => {
    try {
      await deleteDoc(doc(db, 'supplyRequests', id));
      showSuccess('Заявка удалена');
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  // Добавление записи в историю статусов
  const addStatusHistory = (request, status, role, note) => {
    const history = request.statusHistory || [];
    return [...history, { status, timestamp: Date.now(), role, note }];
  };

  // --- Workflow методы ---

  // Снабженец запрашивает счёт
  const requestInvoice = async (id) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;

    await updateRequest(id, {
      status: 'invoice_requested',
      statusHistory: addStatusHistory(request, 'invoice_requested', 'supplier', 'Запрошен счёт')
    });
    showSuccess('Счёт запрошен');
  };

  // Снабженец отправляет на согласование технологу
  const submitForApproval = async (id) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;

    await updateRequest(id, {
      status: 'pending_tech_approval',
      statusHistory: addStatusHistory(request, 'pending_tech_approval', 'supplier', 'Отправлено на согласование технологу')
    });
    showSuccess('Заявка отправлена на согласование');
  };

  // Технолог согласовывает счёт
  const approveTechnologist = async (id) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;

    await updateRequest(id, {
      status: 'pending_management',
      'approvals.technologist': true,
      'approvals.technologistAt': Date.now(),
      statusHistory: addStatusHistory(request, 'pending_management', 'technologist', 'Технолог согласовал')
    });
    showSuccess('Согласовано');
  };

  // Начальник цеха согласовывает
  const approveShopManager = async (id) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;

    await updateRequest(id, {
      'approvals.shopManager': true,
      'approvals.shopManagerAt': Date.now(),
      statusHistory: addStatusHistory(request, 'pending_management', 'shopManager', 'Начальник цеха согласовал')
    });

    // Проверяем, согласовал ли директор
    if (request.approvals.director) {
      await updateRequest(id, {
        status: 'pending_payment',
        statusHistory: addStatusHistory(request, 'pending_payment', 'shopManager', 'Все руководители согласовали')
      });
    }
    showSuccess('Согласовано');
  };

  // Директор согласовывает
  const approveDirector = async (id) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;

    await updateRequest(id, {
      'approvals.director': true,
      'approvals.directorAt': Date.now(),
      statusHistory: addStatusHistory(request, 'pending_management', 'director', 'Директор согласовал')
    });

    // Проверяем, согласовал ли начальник цеха
    if (request.approvals.shopManager) {
      await updateRequest(id, {
        status: 'pending_payment',
        statusHistory: addStatusHistory(request, 'pending_payment', 'director', 'Все руководители согласовали')
      });
    }
    showSuccess('Согласовано');
  };

  // Бухгалтер отмечает оплату
  const markPaid = async (id) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;

    await updateRequest(id, {
      status: 'paid',
      'approvals.accountant': true,
      'approvals.accountantAt': Date.now(),
      statusHistory: addStatusHistory(request, 'paid', 'accountant', 'Оплачено')
    });
    showSuccess('Оплата подтверждена');
  };

  // Снабженец указывает срок доставки
  const setDeliveryDate = async (id, date) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;

    await updateRequest(id, {
      status: 'awaiting_delivery',
      deliveryDate: date,
      statusHistory: addStatusHistory(request, 'awaiting_delivery', 'supplier', `Срок доставки: ${date}`)
    });
    showSuccess('Срок доставки установлен');
  };

  // Снабженец отмечает доставку
  const markDelivered = async (id) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;

    const now = new Date().toISOString().split('T')[0];
    await updateRequest(id, {
      status: 'delivered',
      deliveredAt: now,
      statusHistory: addStatusHistory(request, 'delivered', 'supplier', 'Доставлено')
    });
    showSuccess('Доставка подтверждена');
  };

  // Отклонение заявки (с возвратом на предыдущий статус)
  const rejectRequest = async (id, role, reason) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;

    let newStatus = 'new';
    if (request.status === 'pending_tech_approval') {
      newStatus = 'invoice_requested';
    } else if (request.status === 'pending_management') {
      newStatus = 'pending_tech_approval';
    } else if (request.status === 'pending_payment') {
      newStatus = 'pending_management';
    }

    await updateRequest(id, {
      status: newStatus,
      statusHistory: addStatusHistory(request, newStatus, role, `Отклонено: ${reason || 'без причины'}`)
    });
    showSuccess('Заявка отклонена');
  };

  // --- Вычисляемые списки ---

  // Заявки в работе (не оплачены и не доставлены)
  const inProgressRequests = useMemo(() => {
    return requests.filter(r => !['paid', 'awaiting_delivery', 'delivered'].includes(r.status));
  }, [requests]);

  // Оплаченные заявки (включая ожидающие доставки и доставленные)
  const paidRequests = useMemo(() => {
    return requests.filter(r => ['paid', 'awaiting_delivery', 'delivered'].includes(r.status));
  }, [requests]);

  // Заявки, требующие внимания (срок доставки сегодня, завтра или просрочен)
  const alertRequests = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return requests.filter(r => {
      if (r.status !== 'awaiting_delivery' || !r.deliveryDate) return false;

      const deliveryDate = new Date(r.deliveryDate);
      deliveryDate.setHours(0, 0, 0, 0);

      // Просрочено, сегодня или завтра
      return deliveryDate <= tomorrow;
    });
  }, [requests]);

  // Есть ли заявки, требующие внимания
  const hasSupplyAlert = alertRequests.length > 0;

  return {
    requests,
    loading,
    inProgressRequests,
    paidRequests,
    alertRequests,
    hasSupplyAlert,
    actions: {
      createRequest,
      updateRequest,
      deleteRequest,
      requestInvoice,
      submitForApproval,
      approveTechnologist,
      approveShopManager,
      approveDirector,
      markPaid,
      setDeliveryDate,
      markDelivered,
      rejectRequest
    }
  };
};
