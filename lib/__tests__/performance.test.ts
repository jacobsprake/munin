import { debounce, throttle, memoize, paginateIncidents } from '../performance';

describe('Performance Utilities', () => {
  describe('debounce', () => {
    it('delays function execution', () => {
      jest.useFakeTimers();
      const fn = jest.fn();
      const debounced = debounce(fn, 100);
      debounced();
      debounced();
      debounced();
      expect(fn).not.toHaveBeenCalled();
      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });
  });

  describe('throttle', () => {
    it('limits function call frequency', () => {
      jest.useFakeTimers();
      const fn = jest.fn();
      const throttled = throttle(fn, 100);
      throttled();
      throttled();
      throttled();
      expect(fn).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(100);
      throttled();
      expect(fn).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });
  });

  describe('memoize', () => {
    it('caches function results', () => {
      let callCount = 0;
      const expensive = (x: number) => { callCount++; return x * 2; };
      const memoized = memoize(expensive);
      expect(memoized(5)).toBe(10);
      expect(memoized(5)).toBe(10);
      expect(callCount).toBe(1);
    });
  });

  describe('paginateIncidents', () => {
    it('returns paginated result object', () => {
      const items = Array.from({ length: 25 }, (_, i) => ({ id: i }));
      const result = paginateIncidents(items, 1, 10);
      expect(result.items).toHaveLength(10);
      expect(result.totalPages).toBe(3);
      expect(result.currentPage).toBe(1);
      expect(result.hasNext).toBe(true);
    });

    it('returns last page correctly', () => {
      const items = Array.from({ length: 25 }, (_, i) => ({ id: i }));
      const result = paginateIncidents(items, 3, 10);
      expect(result.items).toHaveLength(5);
      expect(result.hasNext).toBe(false);
    });
  });
});
