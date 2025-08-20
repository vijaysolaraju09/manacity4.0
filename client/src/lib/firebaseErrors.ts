export function mapFirebaseError(code: string): string {
  switch (code) {
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/invalid-phone-number':
      return 'Please enter a valid phone number in international format.';
    case 'auth/code-expired':
      return 'Code expired. Request a new one.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
