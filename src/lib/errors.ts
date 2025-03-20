// Custom error types
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class RoleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoleError';
  }
}

// Error messages
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_IN_USE: 'This email is already registered',
  WEAK_PASSWORD: 'Password must be at least 8 characters long',
  INVALID_EMAIL: 'Please enter a valid email address',
  SESSION_EXPIRED: 'Your session has expired, please sign in again',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  ROLE_REQUIRED: 'Required role is missing',
} as const;