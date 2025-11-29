/**
 * Hook for safe async operations with automatic error handling
 */

import { useState, useCallback } from 'react';
import { handleError, safeAsync, ErrorContext } from '@/lib/errorHandler';

interface UseSafeAsyncOptions {
  showToast?: boolean;
  toastTitle?: string;
  logError?: boolean;
  onError?: (error: any) => void;
  onSuccess?: (data: any) => void;
}

export function useSafeAsync<T = any>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(
    async (
      asyncFn: () => Promise<T>,
      context?: ErrorContext,
      options?: UseSafeAsyncOptions
    ): Promise<T | undefined> => {
      setLoading(true);
      setError(null);

      try {
        const result = await asyncFn();
        setData(result);
        setError(null);
        
        if (options?.onSuccess) {
          options.onSuccess(result);
        }
        
        return result;
      } catch (err: any) {
        setError(err);
        
        // Handle error
        handleError(err, context, {
          showToast: options?.showToast ?? true,
          toastTitle: options?.toastTitle,
          logError: options?.logError ?? true,
        });
        
        if (options?.onError) {
          options.onError(err);
        }
        
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setError(null);
    setData(null);
    setLoading(false);
  }, []);

  return {
    execute,
    loading,
    error,
    data,
    reset,
  };
}

