import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { uploadInvoice, deleteInvoice } from '../utils/supabaseStorage';
import { showSuccess, showError, getFirebaseErrorMessage } from '../utils/toast';
import { getRoleLabel } from '../utils/supplyRoles';
import { notifyRoles, buildNotificationMessage } from '../utils/telegramNotify';

export const useSupplyRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'supplyRequests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => {
        const data = doc.data();
        // Адаптация старых заявок к новой структуре с несколькими счетами
        if (!data.invoices && data.invoiceFile) {
          data.invoices = [{
            url: data.invoiceFile,
            name: data.invoiceFileName || 'Счёт',
            path: data.invoicePath || 'legacy-path', // Временно, если path не сохранялся
            uploadedAt: data.updatedAt || Date.now(),
            uploadedBy: 'legacy'
          }];
          // Очищаем старые поля, чтобы не было дублирования и путаницы
          delete data.invoiceFile;
          delete data.invoiceFileName;
          delete data.invoicePath;
        } else if (!data.invoices) {
          data.invoices = []; // Убедимся, что invoices всегда массив
        }
        // Извлечение причины отклонения из истории, если поле отсутствует
        if (!data.rejectionReason && data.statusHistory && data.statusHistory.length > 0) {
          const lastRejection = [...data.statusHistory].reverse().find(e =>
            e.status === 'rejected' || (e.note && e.note.includes('Отклонено'))
          );
          if (lastRejection && lastRejection.note) {
            // Форматы: "Отклонено (Директор): причина" или "Отклонено: причина"
            const match = lastRejection.note.match(/Отклонено(?:\s*\([^)]+\))?:\s*(.*)/);
            data.rejectionReason = match ? match[1].trim() : lastRejection.note;
            data.rejectedByRole = lastRejection.role || null;
          }
        }
        return { id: doc.id, ...data };
      });
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
        invoices: [], // Массив для хранения нескольких счетов
        approvals: {
          technologist: false, technologistAt: null,
          shopManager: false, shopManagerAt: null,
          director: false, directorAt: null,
          vesta: false, vestaAt: null
        },
        deliveryDate: null,
        deliveredAt: null,
        createdBy: data.createdBy || 'technologist',
        createdAt: now,
        updatedAt: now,
        invoiceRequestCount: 1, // <--- NEW FIELD
        statusHistory: [{ status: 'with_supplier', timestamp: now, role: data.createdBy || 'technologist', note: data.comment ? `Заявка создана. Комментарий: ${data.comment}` : 'Заявка создана, передана снабженцу' }]
      });

      showSuccess(`Заявка ${requestNumber} создана`);

      const createdRequest = { requestNumber, items: data.items || [] };
      notifyRoles(['supplier'], buildNotificationMessage(createdRequest, 'created'));

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
      if (request?.invoices && request.invoices.length > 0) {
        for (const invoice of request.invoices) {
          try {
            await deleteInvoice(invoice.path);
          } catch (e) {
            console.warn('Could not delete invoice file:', e);
          }
        }
      }
      // Также удаляем старые одиночные поля, если они существуют (для обратной совместимости)
      if (request?.invoicePath) {
        try {
          await deleteInvoice(request.invoicePath);
        } catch (e) {
          console.warn('Could not delete legacy invoice file:', e);
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
      const currentInvoices = request.invoices || [];
      const newInvoice = {
        url: result.url,
        name: result.name,
        path: result.path,
        uploadedAt: Date.now(),
        uploadedBy: 'supplier' // Или userRole
      };
      const updatedInvoices = [...currentInvoices, newInvoice];

      const wasRejected = request.status === 'rejected';
      await updateRequest(id, {
        status: 'invoice_attached',
        invoices: updatedInvoices,
        // Чистим данные отклонения при повторном прикреплении
        ...(wasRejected && { rejectionReason: null, rejectedByRole: null }),
        // Удаляем старые поля, если они существуют
        invoiceFile: null,
        invoiceFileName: null,
        invoicePath: null,
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
    if (!request.invoices || request.invoices.length === 0) {
      showError('Сначала прикрепите счёт');
      return;
    }
    const newInvoiceRequestCount = request.status === 'rejected' ? (request.invoiceRequestCount || 1) + 1 : (request.invoiceRequestCount || 1);
    await updateRequest(id, {
      status: 'pending_tech_approval',
      rejectionReason: null, // Clear rejection reason
      rejectedByRole: null,  // Clear rejected by role
      invoiceRequestCount: newInvoiceRequestCount,
      statusHistory: addStatusHistory(request, 'pending_tech_approval', 'supplier', 'Отправлено на согласование технологу')
    });
    showSuccess('Заявка отправлена на согласование');
    notifyRoles(['technologist'], buildNotificationMessage(request, 'submitted_for_approval'));
  };

  const approveTechnologist = async (id) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;
    await updateRequest(id, {
      status: 'pending_shop_approval',
      'approvals.technologist': true,
      'approvals.technologistAt': Date.now(),
      rejectionReason: null, // Clear rejection reason
      rejectedByRole: null,  // Clear rejected by role
      invoiceRequestCount: 1, // Reset count on approval
      statusHistory: addStatusHistory(request, 'pending_shop_approval', 'technologist', 'Технолог согласовал')
    });
    showSuccess('Согласовано');
    notifyRoles(['shopManager'], buildNotificationMessage(request, 'approved_technologist'));
  };

  const approveShopManager = async (id) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;
    await updateRequest(id, {
      status: 'pending_director_approval',
      'approvals.shopManager': true,
      'approvals.shopManagerAt': Date.now(),
      rejectionReason: null, // Clear rejection reason
      rejectedByRole: null,  // Clear rejected by role
      invoiceRequestCount: 1, // Reset count on approval
      statusHistory: addStatusHistory(request, 'pending_director_approval', 'shopManager', 'Начальник цеха согласовал')
    });
    showSuccess('Согласовано');
    notifyRoles(['director'], buildNotificationMessage(request, 'approved_shop_manager'));
  };

  const approveDirector = async (id) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;
    await updateRequest(id, {
      status: 'pending_payment',
      'approvals.director': true,
      'approvals.directorAt': Date.now(),
      rejectionReason: null, // Clear rejection reason
      rejectedByRole: null,  // Clear rejected by role
      invoiceRequestCount: 1, // Reset count on approval
      statusHistory: addStatusHistory(request, 'pending_payment', 'director', 'Директор согласовал, передано на оплату')
    });
    showSuccess('Согласовано');
    notifyRoles(['vesta'], buildNotificationMessage(request, 'approved_director'));
  };

  const markPaid = async (id) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;
    await updateRequest(id, {
      status: 'paid',
      'approvals.vesta': true,
      'approvals.vestaAt': Date.now(),
      statusHistory: addStatusHistory(request, 'paid', 'vesta', 'Оплачено')
    });
    showSuccess('Оплата подтверждена');
    notifyRoles(['supplier'], buildNotificationMessage(request, 'paid'));
  };

  const markAsInQueue = async (id) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;
    await updateRequest(id, {
      status: 'in_queue_payment',
      statusHistory: addStatusHistory(request, 'in_queue_payment', 'vesta', 'Поставлено в очередь на оплату')
    });
    showSuccess('Заявка поставлена в очередь на оплату');
  };

  const setDeliveryDate = async (id, date, supplierAddress = null, supplierPhone = null) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;
    await updateRequest(id, {
      status: 'awaiting_delivery',
      deliveryDate: date,
      supplierAddress: supplierAddress, // Store new field
      supplierPhone: supplierPhone,     // Store new field
      statusHistory: addStatusHistory(request, 'awaiting_delivery', 'supplier', `Срок доставки: ${date}. Адрес: ${supplierAddress || 'не указан'}. Телефон: ${supplierPhone || 'не указан'}`)
    });
    showSuccess('Срок доставки установлен');
    notifyRoles(['shopManager', 'master', 'technologist'], buildNotificationMessage(request, 'delivery_date_set', { date }));
  };

  const markDelivered = async (id) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;
    const now = new Date().toISOString().split('T')[0];
    if (request?.invoices && request.invoices.length > 0) {
      for (const invoice of request.invoices) {
        try {
          await deleteInvoice(invoice.path);
        } catch (e) {
          console.warn('Could not delete invoice file:', e);
        }
      }
    }
    // Также удаляем старые одиночные поля, если они существуют (для обратной совместимости)
    if (request.invoicePath) {
      try {
        await deleteInvoice(request.invoicePath);
      } catch (e) {
        console.warn('Could not delete legacy invoice file:', e);
      }
    }
    await updateRequest(id, {
      status: 'delivered',
      deliveredAt: now,
      invoices: [], // Очищаем массив счетов
      invoiceFile: null, // Для обратной совместимости
      invoiceFileName: null, // Для обратной совместимости
      invoicePath: null, // Для обратной совместимости
      statusHistory: addStatusHistory(request, 'delivered', 'supplier', 'Доставлено')
    });
    showSuccess('Доставка подтверждена');
    const createdByRole = request.createdBy || 'technologist';
    notifyRoles([createdByRole], buildNotificationMessage(request, 'delivered'));
  };

  const rejectRequest = async (id, role, reason) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;

    // Технолог отклоняет → к снабженцу. Все остальные → сначала к технологу.
    const isToSupplier = role === 'technologist';
    const newStatus = isToSupplier ? 'rejected' : 'pending_tech_approval';
    const notifyRole = isToSupplier ? ['supplier'] : ['technologist'];
    const noteTarget = isToSupplier ? ', возврат снабженцу' : ', передано технологу';

    const clearApprovals = {
      'approvals.technologist': false, 'approvals.technologistAt': null,
      'approvals.shopManager': false, 'approvals.shopManagerAt': null,
      'approvals.director': false, 'approvals.directorAt': null
    };
    await updateRequest(id, {
      status: newStatus,
      rejectionReason: reason || 'Причина не указана',
      rejectedByRole: role,
      ...clearApprovals,
      statusHistory: addStatusHistory(request, newStatus, role, `Отклонено (${getRoleLabel(role)}): ${reason || 'без причины'}${noteTarget}`)
    });
    showSuccess('Заявка отклонена');
    notifyRoles(notifyRole, buildNotificationMessage(request, 'rejected', { role, reason }));
  };

  const editRequest = async (id, data) => {
    const request = requests.find(r => r.id === id);
    if (!request) throw new Error('Заявка не найдена');

    try {
      await updateRequest(id, {
        items: data.items || request.items,
        orders: data.orders || request.orders,
        desiredDate: data.desiredDate !== undefined ? data.desiredDate : request.desiredDate,
        creatorComment: data.comment !== undefined ? data.comment : request.creatorComment,
        statusHistory: addStatusHistory(request, request.status, data.createdBy || request.createdBy, 'Заявка отредактирована')
      });
      showSuccess('Заявка обновлена');
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
  };

  const detachInvoice = async (id, invoicePathToRemove) => { // Принимаем invoicePathToRemove
    const request = requests.find(r => r.id === id);
    if (!request) throw new Error('Заявка не найдена');
    if (!request.invoices || request.invoices.length === 0) throw new Error('Счет не прикреплен');

    const invoiceToRemove = request.invoices.find(inv => inv.path === invoicePathToRemove);
    if (!invoiceToRemove) throw new Error('Счет не найден в заявке');

    try {
      await deleteInvoice(invoicePathToRemove); // Удаляем конкретный файл из Supabase Storage

      const updatedInvoices = request.invoices.filter(inv => inv.path !== invoicePathToRemove);

      const newStatus = updatedInvoices.length === 0 ? 'with_supplier' : request.status; // Если счетов нет, статус 'with_supplier'
      await updateRequest(id, {
        invoices: updatedInvoices,
        status: newStatus,
        statusHistory: addStatusHistory(request, newStatus, 'supplier', `Счёт ${invoiceToRemove.name} откреплён${updatedInvoices.length === 0 ? ', ожидается новый счёт' : ''}`)
      });
      showSuccess('Счёт откреплён');
    } catch (error) {
      console.error('detachInvoice error:', error);
      showError(getFirebaseErrorMessage(error));
      throw error;
    }
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
      createRequest, updateRequest, deleteRequest, editRequest, attachInvoice, submitForApproval,
      approveTechnologist, approveShopManager, approveDirector, markPaid, setDeliveryDate,
      markDelivered, rejectRequest, detachInvoice, markAsInQueue
    }
  };
};
