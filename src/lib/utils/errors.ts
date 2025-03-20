// Error types
export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public debugInfo?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string, debugInfo?: any) {
    super(message, 'NETWORK_ERROR', debugInfo);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, debugInfo?: any) {
    super(message, 'VALIDATION_ERROR', debugInfo);
    this.name = 'ValidationError';
  }
}

export class AuthError extends AppError {
  constructor(message: string, debugInfo?: any) {
    super(message, 'AUTH_ERROR', debugInfo);
    this.name = 'AuthError';
  }
}

// Error messages
export const ERROR_MESSAGES = {
  default: 'An unexpected error occurred. Please try again.',
  network: 'Unable to connect to the server. Please check your connection.',
  validation: 'Please check your input and try again.',
  auth: 'Authentication error. Please sign in again.',
  notFound: 'The requested resource was not found.',
  serverError: 'Server error. Please try again later.',
  invalidInput: 'Please check your input values.',
  inquiry: {
    invalidWarehouse: 'Invalid or missing warehouse ID',
    invalidWarehouse: 'Invalid warehouse selected.',
    invalidSpace: 'Invalid space selected.',
    invalidSpaceSize: 'Requested space exceeds available capacity.',
    invalidDateRange: 'Invalid date range selected.',
    invalidMessage: 'Message is required.',
    warehouseInactive: 'This warehouse is not currently accepting inquiries.',
    duplicateInquiry: 'You already have a pending inquiry for this space.',
    serverError: 'Failed to submit inquiry. Please try again.',
    networkError: 'Network error while submitting inquiry. Please check your connection.',
  },
  warehouse: {
    invalidSpaceType: 'Invalid space type selected.',
    invalidPricing: 'Invalid pricing configuration.',
    invalidSize: 'Invalid size value.',
    invalidPrice: 'Invalid price value.',
    invalidDate: 'Invalid date range.',
  },
  file: {
    uploadError: 'Failed to upload file.',
    downloadError: 'Failed to download file.',
  },
  permissions: {
    insufficientPermissions: 'You do not have permission to perform this action.',
  }
} as const;

export class InquiryError extends AppError {
  constructor(message: string, debugInfo?: any) {
    super(message, 'INQUIRY_ERROR', debugInfo);
    this.name = 'InquiryError';
  }
}

export class PermissionError extends AppError {
  constructor(message: string, debugInfo?: any) {
    super(message, 'PERMISSION_ERROR', debugInfo);
    this.name = 'PermissionError';
  }
}

export class FileError extends AppError {
  constructor(message: string, debugInfo?: any) {
    super(message, 'FILE_ERROR', debugInfo);
    this.name = 'FileError';
  }
}
// Debug mode
const DEBUG = import.meta.env.MODE === 'development';

// Import debug utilities
import { logDebug, formatDebugError } from './debug';

// Error handler
export async function handleError(error: unknown, context?: string): Promise<AppError> {
  // Log error in development
  if (DEBUG) {
    console.error(`Error in ${context || 'unknown context'}:`, error);
  }

  // Log error to debug system
  await logDebug({
    function_name: context || 'unknown',
    error_message: formatDebugError(error),
    input_params: {
      error_type: error instanceof Error ? error.constructor.name : typeof error,
      error_message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }
  });

  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    // Convert known error types
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return new NetworkError(ERROR_MESSAGES.network, error);
    }
    if (error.message.includes('validation')) {
      return new ValidationError(ERROR_MESSAGES.validation, error);
    }
    if (error.message.includes('auth') || error.message.includes('unauthorized')) {
      return new AuthError(ERROR_MESSAGES.auth, error);
    }
    if (error.message.includes('permission') || error.message.includes('access denied')) {
      return new PermissionError(ERROR_MESSAGES.permissions.insufficientPermissions, error);
    }
    if (error.message.includes('inquiry')) {
      return new InquiryError(error.message, error);
    }
    if (error.message.includes('upload') || error.message.includes('download')) {
      return new FileError(
        error.message.includes('upload') 
          ? ERROR_MESSAGES.file.uploadError 
          : ERROR_MESSAGES.file.downloadError,
        error
      );
    }
    
    return new AppError(error.message, undefined, error);
  }

  return new AppError(ERROR_MESSAGES.default, undefined, error);
}

// Validation helpers
export function validateSpaceType(spaceTypeId: string): boolean {
  if (!spaceTypeId) {
    throw new ValidationError(ERROR_MESSAGES.warehouse.invalidSpaceType);
  }
  return typeof spaceTypeId === 'string' && spaceTypeId.length > 0;
}

export function validateSize(size: number): boolean {
  if (!size || size <= 0) {
    throw new ValidationError(ERROR_MESSAGES.warehouse.invalidSize);
  }
  return typeof size === 'number' && size > 0;
}

export function validatePrice(price: number): boolean {
  if (price < 0) {
    throw new ValidationError(ERROR_MESSAGES.warehouse.invalidPrice);
  }
  return typeof price === 'number' && price >= 0;
}

export function validateDateRange(startDate: Date, endDate: Date): boolean {
  if (!startDate || !endDate || endDate < startDate) {
    throw new ValidationError(ERROR_MESSAGES.warehouse.invalidDate);
  }
  return startDate instanceof Date && 
         endDate instanceof Date && 
         !isNaN(startDate.getTime()) && 
         !isNaN(endDate.getTime()) && 
         endDate >= startDate;
}
// Format error message for display
export function formatErrorMessage(error: unknown): string {
  const appError = error instanceof AppError ? error : handleError(error);
  
  if (DEBUG && appError.debugInfo) {
    return `${appError.message}\n\nDebug info: ${JSON.stringify(appError.debugInfo, null, 2)}`;
  }

  return appError.message;
}