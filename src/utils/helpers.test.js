import { describe, it, expect } from 'vitest';
import { formatDate, isWeekend, getMonthDays, getOpColor, getResourceHoursForDate } from './helpers';

describe('helpers', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-03-15');
      const result = formatDate(date);
      expect(result).toBe('2024-03-15');
    });

    it('should pad single digit months and days', () => {
      const date = new Date('2024-01-05');
      const result = formatDate(date);
      expect(result).toBe('2024-01-05');
    });
  });

  describe('isWeekend', () => {
    it('should return true for Saturday', () => {
      const saturday = new Date('2024-03-16'); // Saturday
      expect(isWeekend(saturday)).toBe(true);
    });

    it('should return true for Sunday', () => {
      const sunday = new Date('2024-03-17'); // Sunday
      expect(isWeekend(sunday)).toBe(true);
    });

    it('should return false for weekdays', () => {
      const monday = new Date('2024-03-18'); // Monday
      expect(isWeekend(monday)).toBe(false);
    });
  });

  describe('getMonthDays', () => {
    it('should return all days of February 2024 (leap year)', () => {
      const days = getMonthDays(2024, 1); // February is month 1
      expect(days.length).toBe(29);
    });

    it('should return all days of January', () => {
      const days = getMonthDays(2024, 0); // January is month 0
      expect(days.length).toBe(31);
    });
  });

  describe('getOpColor', () => {
    it('should return a valid color class', () => {
      const color = getOpColor(0);
      expect(color).toMatch(/^bg-\w+-500$/);
    });

    it('should cycle through colors', () => {
      const color1 = getOpColor(0);
      const color2 = getOpColor(8);
      expect(color1).toBe(color2);
    });
  });

  describe('getResourceHoursForDate', () => {
    it('should return 0 for weekend', () => {
      const resource = { hoursPerDay: 8 };
      const saturday = new Date('2024-03-16');
      expect(getResourceHoursForDate(resource, saturday)).toBe(0);
    });

    it('should return default hours for weekday', () => {
      const resource = { hoursPerDay: 8 };
      const monday = new Date('2024-03-18');
      expect(getResourceHoursForDate(resource, monday)).toBe(8);
    });

    it('should return 0 for sick leave', () => {
      const resource = {
        hoursPerDay: 8,
        schedule: { '2024-03-18': { type: 'sick' } }
      };
      const monday = new Date('2024-03-18');
      expect(getResourceHoursForDate(resource, monday)).toBe(0);
    });

    it('should return 0 for vacation', () => {
      const resource = {
        hoursPerDay: 8,
        schedule: { '2024-03-18': { type: 'vacation' } }
      };
      const monday = new Date('2024-03-18');
      expect(getResourceHoursForDate(resource, monday)).toBe(0);
    });
  });
});
