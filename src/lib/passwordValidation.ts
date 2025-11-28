export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  requirements: {
    minLength: boolean;
    hasCapital: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = [];
  const requirements = {
    minLength: password.length >= 8,
    hasCapital: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  if (!requirements.minLength) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!requirements.hasCapital) {
    errors.push('Password must contain at least one capital letter');
  }
  if (!requirements.hasNumber) {
    errors.push('Password must contain at least one number');
  }
  if (!requirements.hasSpecial) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
    requirements,
  };
};

export const validatePasswordMatch = (password: string, confirmPassword: string): boolean => {
  return password === confirmPassword;
};

