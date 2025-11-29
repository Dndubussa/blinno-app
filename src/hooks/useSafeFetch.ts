/**
 * Hook for safe data fetching in useEffect with automatic error handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { handleError, ErrorContext } from '@/lib/errorHandler';

interface UseSafeFetchOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: any) => void;
  showToast?: boolean;
  toastTitle?: string;
  logError?: boolean;
  enabled?: boolean;
  dependencies?: any[];
}

export function useSafeFetch<T = any>(
  fetchFn: () => Promise<T>,
  context?: ErrorContext,
  options?: UseSafeFetchOptions<T>
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const {
    onSuccess,
    onError,
    showToast = true,
    toastTitle,
    logError = true,
    enabled = true,
    dependencies = []
  } = options || {};

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      
      // Check if component is still mounted
      if (!isMountedRef.current || signal.aborted) {
        return;
      }

      setData(result);
      setError(null);

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err: any) {
      // Ignore abort errors
      if (err.name === 'AbortError' || signal.aborted) {
        return;
      }

      // Check if component is still mounted
      if (!isMountedRef.current) {
        return;
      }

      setError(err);

      // Handle error
      handleError(err, context, {
        showToast,
        toastTitle,
        logError,
      });

      if (onError) {
        onError(err);
      }
    } finally {
      if (isMountedRef.current && !signal.aborted) {
        setLoading(false);
      }
    }
  }, [enabled, fetchFn, context, showToast, toastTitle, logError, onSuccess, onError, ...dependencies]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
  };
}

