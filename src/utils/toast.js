import toast from 'react-hot-toast';

// Centralized toast notifications with consistent styling

export const showSuccess = (message) => {
  toast.success(message);
};

export const showError = (message) => {
  toast.error(message);
};

export const showLoading = (message = 'Загрузка...') => {
  return toast.loading(message);
};

export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
};

export const showPromise = (promise, messages) => {
  return toast.promise(promise, {
    loading: messages.loading || 'Загрузка...',
    success: messages.success || 'Готово!',
    error: messages.error || 'Ошибка!',
  });
};

// Firebase-specific error messages
export const getFirebaseErrorMessage = (error) => {
  const errorCode = error?.code || '';

  const errorMessages = {
    'permission-denied': 'Нет прав доступа',
    'unavailable': 'Сервер недоступен. Проверьте подключение',
    'cancelled': 'Операция отменена',
    'deadline-exceeded': 'Превышено время ожидания',
    'not-found': 'Данные не найдены',
    'already-exists': 'Запись уже существует',
    'resource-exhausted': 'Превышен лимит запросов',
    'failed-precondition': 'Операция невозможна в текущем состоянии',
    'aborted': 'Операция прервана',
    'invalid-argument': 'Неверные данные',
  };

  return errorMessages[errorCode] || error?.message || 'Произошла ошибка';
};
