export function mapFirebaseError(code: string): string {
  switch (code) {
    case 'auth/invalid-phone-number':
      return 'Enter a valid phone number with country code (e.g., +91…).';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again in a few minutes.';
    case 'auth/quota-exceeded':
      return 'OTP quota exceeded. Try later.';
    case 'auth/code-expired':
      return 'Code expired. Request a new OTP.';
    case 'auth/invalid-verification-code':
      return 'Invalid code. Please try again.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
