import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
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

        // Множественные позиции
        items: data.items || [],

        // Множественные заказы
        orders: data.orders || [],

        // Желаемая дата (общая для заявки)
        desiredDate: data.desiredDate || null,

        // Сразу к снабженцу на запрос счёта
        status: 'with_supplier',

        // Файл счёта (загружается снабженцем)
        invoiceFile: null,
        invoiceFileName: null,

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
        statusHistory: [{ status: 'with_supplier', timestamp: now, role: data.createdBy || 'technologist', note: 'Заявка создана, передана снабженцу' }]
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

  // Снабженец загружает файл счёта
  const uploadInvoiceFile = async (file, requestNumber) => {
    try {
      const timestamp = Date.now();
      const fileName = `${requestNumber}_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `invoices/${fileName}`);

      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      return { url: downloadURL, fileName: file.name };
    } catch (error) {
      showError('Ошибка загрузки файла');
      throw error;
    }
  };

  // Снабженец прикрепляет счёт к заявке
  const attachInvoice = async (id, file) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;

    const { url, fileName } = await uploadInvoiceFile(file, request.requestNumber);

    await updateRequest(id, {
      status: 'invoice_attached',
      invoiceFile: url,
      invoiceFileName: fileName,
      statusHistory: addStatusHistory(request, 'invoice_attached', 'supplier', `Счёт прикреплён: ${fileName}`)
    });
    showSuccess('Счёт прикреплён');
  };

  // Снабженец отправляет на согласование технологу
  const submitForApproval = async (id) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;

    if (!request.invoiceFile) {
      showError('Сначала прикрепите счёт');
      return;
    }

    await updateRequest(id, {
      status: 'pending_tech_approval',
      statusHistory: addStatusHistory(request, 'pending_tech_approval', 'supplier', 'Отправлено на согласование технологу')
    });
    showSuccess('Заявка отправлена на согласование');
  };

  // Технолог согласовывает счёт → к начальнику цеха
  const approveTechnologist = async (id) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;

    await updateRequest(id, {
      status: 'pending_shop_approval',
      'approvals.technologist': true,
      'approvals.technologistAt': Date.now(),
      statusHistory: addStatusHistory(request, 'pending_shop_approval', 'technologist', 'Технолог согласовал')
    });
    showSuccess('Согласовано');
  };

  // Начальник цеха согласовывает → к директору
  const approveShopManager = async (id) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;

    await updateRequest(id, {
      status: 'pending_director_approval',
      'approvals.shopManager': true,
      'approvals.shopManagerAt': Date.now(),
      statusHistory: addStatusHistory(request, 'pending_director_approval', 'shopManager', 'Начальник цеха согласовал')
    });
    showSuccess('Согласовано');
  };

  // Директор согласовывает → к бухгалтеру на оплату
  const approveDirector = async (id) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;

    await updateRequest(id, {
      status: 'pending_payment',
      'approvals.director': true,
      'approvals.directorAt': Date.now(),
      statusHistory: addStatusHistory(request, 'pending_payment', 'director', 'Директор согласовал, передано на оплату')
    });
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

    // Определяем предыдущий статус и какие approvals очищать
    let newStatus = 'invoice_attached'; // по умолчанию возвращаем снабженцу
    let clearApprovals = {};

    if (request.status === 'pending_tech_approval') {
      // Технолог отклонил → возвращаем снабженцу (счёт прикреплён)
      newStatus = 'invoice_attached';
    } else if (request.status === 'pending_shop_approval') {
      // Начальник цеха отклонил → возвращаем технологу
      newStatus = 'pending_tech_approval';
      clearApprovals = { 'approvals.technologist': false, 'approvals.technologistAt': null };
    } else if (request.status === 'pending_director_approval') {
      // Директор отклонил → возвращаем начальнику цеха
      newStatus = 'pending_shop_approval';
      clearApprovals = { 'approvals.shopManager': false, 'approvals.shopManagerAt': null };
    } else if (request.status === 'pending_payment') {
      // Бухгалтер отклонил → возвращаем директору
      newStatus = 'pending_director_approval';
      clearApprovals = { 'approvals.director': false, 'approvals.directorAt': null };
    }

    await updateRequest(id, {
      status: newStatus,
      ...clearApprovals,
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
      attachInvoice,
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
