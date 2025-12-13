import { describe, it, expect, vi } from 'vitest';
import { getFirebaseErrorMessage } from './toast';

describe('toast utilities', () => {
  describe('getFirebaseErrorMessage', () => {
    it('should return correct message for permission-denied', () => {
      const error = { code: 'permission-denied' };
      expect(getFirebaseErrorMessage(error)).toBe('Нет прав доступа');
    });

    it('should return correct message for unavailable', () => {
      const error = { code: 'unavailable' };
      expect(getFirebaseErrorMessage(error)).toBe('Сервер недоступен. Проверьте подключение');
    });

    it('should return error message for unknown error codes', () => {
      const error = { code: 'unknown-error', message: 'Custom error message' };
      expect(getFirebaseErrorMessage(error)).toBe('Custom error message');
    });

    it('should return default message for undefined error', () => {
      expect(getFirebaseErrorMessage(undefined)).toBe('Произошла ошибка');
    });

    it('should return default message for null error', () => {
      expect(getFirebaseErrorMessage(null)).toBe('Произошла ошибка');
    });
  });
});
