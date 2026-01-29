import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { uploadInvoice, deleteInvoice } from '../utils/supabaseStorage';
import { showSuccess, showError, getFirebaseErrorMessage } from '../utils/toast';

export const useSupplyRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const createRequest = async (data) => {
    try {
      const now = Date.now();
      const requestNumber = generateRequestNumber();

      await addDoc(collection(db, 'supplyRequests'), {
        requestNumber,
        items: data.items || [],
        orders: data.orders || [],
        department: data.department || 'Химмаш',
        creatorComment: data.comment || '', // <-- Added comment field
        desiredDate: data.desiredDate || null,
        status: 'with_supplier',
        invoiceFile: null,
        invoiceFileName: null,
        invoicePath: null,
        approvals: {
          technologist: false, technologistAt: null,
          shopManager: false, shopManagerAt: null,
          director: false, directorAt: null,
          accountant: false, accountantAt: null
        },
        deliveryDate: null,
        deliveredAt: null,
        createdBy: data.createdBy || 'technologist',
        createdAt: now,
        updatedAt: now,
        statusHistory: [{ status: 'with_supplier', timestamp: now, role: data.createdBy || 'technologist', note: data.comment ? `Заявка создана. Комментарий: ${data.comment}` : 'Заявка создана, передана снабженцу' }]
      });

      showSuccess(`Заявка ${requestNumber} создана`);
      return requestNumber;
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

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

  const deleteRequest = async (id) => {
    try {
      const request = requests.find(r => r.id === id);
      if (request?.invoicePath) {
        try {
          await deleteInvoice(request.invoicePath);
        } catch (e) {
          console.warn('Could not delete invoice file:', e);
        }
      }
      await deleteDoc(doc(db, 'supplyRequests', id));
      showSuccess('Заявка удалена');
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  const addStatusHistory = (request, status, role, note) => {
    const history = request.statusHistory || [];
    return [...history, { status, timestamp: Date.now(), role, note }];
  };

  const attachInvoice = async (id, file) => {
    const request = requests.find(r => r.id === id);
    if (!request) throw new Error('Заявка не найдена');

    try {
      const result = await uploadInvoice(file, request.requestNumber);
      await updateRequest(id, {
        status: 'invoice_attached',
        invoiceFile: result.url,
        invoiceFileName: result.name,
        invoicePath: result.path,
        statusHistory: addStatusHistory(request, 'invoice_attached', 'supplier', `Счёт прикреплён: ${result.name}`)
      });
      showSuccess('Счёт прикреплён');
    } catch (error) {
      console.error('attachInvoice error:', error);
      throw error;
    }
  };

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

  const markDelivered = async (id) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;
    const now = new Date().toISOString().split('T')[0];
    if (request.invoicePath) {
      try {
        await deleteInvoice(request.invoicePath);
      } catch (e) {
        console.warn('Could not delete invoice file:', e);
      }
    }
    await updateRequest(id, {
      status: 'delivered',
      deliveredAt: now,
      invoiceFile: null,
      invoiceFileName: null,
      invoicePath: null,
      statusHistory: addStatusHistory(request, 'delivered', 'supplier', 'Доставлено')
    });
    showSuccess('Доставка подтверждена');
  };

  const rejectRequest = async (id, role, reason) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;
    const newStatus = 'invoice_attached';
    const clearApprovals = {
      'approvals.technologist': false, 'approvals.technologistAt': null,
      'approvals.shopManager': false, 'approvals.shopManagerAt': null,
      'approvals.director': false, 'approvals.directorAt': null
    };
    await updateRequest(id, {
      status: newStatus,
      ...clearApprovals,
      statusHistory: addStatusHistory(request, newStatus, role, `Отклонено: ${reason || 'без причины'}`)
    });
    showSuccess('Заявка отклонена');
  };

  const alertRequests = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return requests.filter(r => {
      if (r.status !== 'awaiting_delivery' || !r.deliveryDate) return false;
      const deliveryDate = new Date(r.deliveryDate);
      deliveryDate.setHours(0, 0, 0, 0);
      return deliveryDate <= tomorrow;
    });
  }, [requests]);

  const hasSupplyAlert = alertRequests.length > 0;

  return {
    requests,
    loading,
    hasSupplyAlert,
    actions: {
      createRequest, updateRequest, deleteRequest, attachInvoice, submitForApproval,
      approveTechnologist, approveShopManager, approveDirector, markPaid, setDeliveryDate,
      markDelivered, rejectRequest
    }
  };
};
