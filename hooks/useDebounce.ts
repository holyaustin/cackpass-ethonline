// /hooks/useDebounce.ts
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Standard Value Debouncer
 * Delays updating a state value until a user stops typing or interacting.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * High-Performance Action Throttler
 * Guarantees a function fires at most once every X milliseconds.
 * Ensures the absolute final execution frame is caught and processed.
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const lastRan = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef<T>(callback);

  // Sync the latest callback reference to prevent dependency recreation cycles
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Clean up any stray background timers if the component unmounts mid-action
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeRemaining = delay - (now - lastRan.current);

      // Clear any pending trailing-edge executions
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (timeRemaining <= 0) {
        // Option A: Cooldown has passed. Execute the function immediately.
        lastRan.current = now;
        callbackRef.current(...args);
      } else {
        // Option B: User is actively hitting the throttle. 
        // Queue the trailing edge action to guarantee the final state isn't lost.
        timeoutRef.current = setTimeout(() => {
          lastRan.current = Date.now();
          callbackRef.current(...args);
        }, timeRemaining);
      }
    },
    [delay]
  ) as T;
}
