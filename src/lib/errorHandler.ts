/**
 * Comprehensive Error Handling Utilities
 * 
 * Provides centralized error handling, logging, and user-friendly error display
 */

import * as Sentry from "@/lib/sentry";
import { toast } from "@/hooks/use-toast";

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  additionalData?: Record<string, any>;
}

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public context?: ErrorContext,
    public isRetryable?: boolean
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Network error detection
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  // Check for network-related error messages
  const networkErrorMessages = [
    'network',
    'fetch',
    'connection',
    'timeout',
    'failed to fetch',
    'networkerror',
    'network request failed',
    'internet',
    'offline'
  ];
  
  const errorMessage = (error.message || error.toString() || '').toLowerCase();
  return networkErrorMessages.some(msg => errorMessage.includes(msg));
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  // Network errors are retryable
  if (isNetworkError(error)) return true;
  
  // 5xx server errors are retryable
  if (error.status >= 500 && error.status < 600) return true;
  
  // Timeout errors are retryable
  if (error.name === 'TimeoutError' || error.message?.includes('timeout')) return true;
  
  // Rate limit errors (429) are retryable
  if (error.status === 429) return true;
  
  return false;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: any): string {
  if (!error) return 'An unexpected error occurred';
  
  // Handle AppError
  if (error instanceof AppError) {
    return error.message;
  }
  
  // Handle network errors
  if (isNetworkError(error)) {
    return 'Network connection error. Please check your internet connection and try again.';
  }
  
  // Handle HTTP status codes
  if (error.status || error.statusCode) {
    const status = error.status || error.statusCode;
    switch (status) {
      case 400:
        return error.message || 'Invalid request. Please check your input and try again.';
      case 401:
        return 'You are not authorized. Please sign in and try again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 408:
        return 'Request timed out. Please try again.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      case 504:
        return 'Request timed out. Please try again.';
      default:
        return error.message || `An error occurred (${status}). Please try again.`;
    }
  }
  
  // Handle specific error types
  if (error.name === 'TypeError' && error.message?.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  
  if (error.name === 'TimeoutError') {
    return 'Request timed out. Please try again.';
  }
  
  // Return error message if available, otherwise generic message
  return error.message || error.toString() || 'An unexpected error occurred';
}

/**
 * Log error with context
 */
export function logError(error: any, context?: ErrorContext): void {
  const errorMessage = error?.message || error?.toString() || 'Unknown error';
  const errorStack = error?.stack;
  
  // Console logging (always)
  console.error('Error occurred:', {
    message: errorMessage,
    stack: errorStack,
    context,
    error
  });
  
  // Sentry logging (production only)
  if (import.meta.env.PROD && Sentry.Sentry) {
    try {
      Sentry.Sentry.withScope((scope: any) => {
        if (context?.component) {
          scope.setTag('component', context.component);
        }
        if (context?.action) {
          scope.setTag('action', context.action);
        }
        if (context?.userId) {
          scope.setUser({ id: context.userId });
        }
        if (context?.additionalData) {
          scope.setContext('additional', context.additionalData);
        }
        Sentry.Sentry.captureException(error);
      });
    } catch (sentryError) {
      console.error('Failed to log to Sentry:', sentryError);
    }
  }
}

/**
 * Handle and display error to user
 */
export function handleError(
  error: any,
  context?: ErrorContext,
  options?: {
    showToast?: boolean;
    toastTitle?: string;
    logError?: boolean;
  }
): void {
  const {
    showToast = true,
    toastTitle = 'Error',
    logError: shouldLog = true
  } = options || {};
  
  // Log error
  if (shouldLog) {
    logError(error, context);
  }
  
  // Show toast notification
  if (showToast) {
    const message = getUserFriendlyMessage(error);
    toast({
      title: toastTitle,
      description: message,
      variant: 'destructive',
    });
  }
}

/**
 * Safe async wrapper - catches and handles errors
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  context?: ErrorContext,
  options?: {
    showToast?: boolean;
    logError?: boolean;
    defaultValue?: T;
  }
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    handleError(error, context, options);
    return options?.defaultValue;
  }
}

/**
 * Retry mechanism for retryable operations
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    delay?: number;
    backoff?: boolean;
    retryableCheck?: (error: any) => boolean;
  }
): Promise<T> {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = true,
    retryableCheck = isRetryableError
  } = options || {};
  
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      if (!retryableCheck(error)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const waitTime = backoff ? delay * Math.pow(2, attempt) : delay;
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
}

/**
 * Timeout wrapper for promises
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage?: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new AppError(
          timeoutMessage || `Operation timed out after ${timeoutMs}ms`,
          'TIMEOUT',
          408,
          undefined,
          true
        ));
      }, timeoutMs);
    })
  ]);
}

/**
 * Handle unhandled promise rejections
 */
export function setupUnhandledRejectionHandler(): void {
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const error = event.reason;
    
    // Log error
    logError(error, {
      component: 'Global',
      action: 'UnhandledPromiseRejection',
      additionalData: {
        promise: error?.toString()
      }
    });
    
    // Show user-friendly error
    handleError(error, {
      component: 'Global',
      action: 'UnhandledPromiseRejection'
    });
    
    // Prevent default browser console error (we've handled it)
    event.preventDefault();
  });
}

/**
 * Handle window errors
 */
export function setupWindowErrorHandler(): void {
  window.addEventListener('error', (event: ErrorEvent) => {
    const error = event.error || new Error(event.message);
    
    // Log error
    logError(error, {
      component: 'Global',
      action: 'WindowError',
      additionalData: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    });
    
    // Show user-friendly error
    handleError(error, {
      component: 'Global',
      action: 'WindowError'
    });
  });
}

/**
 * Initialize all global error handlers
 */
export function initializeErrorHandling(): void {
  setupUnhandledRejectionHandler();
  setupWindowErrorHandler();
  
  console.log('Error handling initialized');
}

