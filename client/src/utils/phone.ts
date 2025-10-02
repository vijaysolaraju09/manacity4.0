export const normalizePhoneDigits = (input: string): string | null => {
  const digits = input.replace(/\D/g, '');
  if (digits.length >= 10 && digits.length <= 14) {
    return digits;
  }
  return null;
};
