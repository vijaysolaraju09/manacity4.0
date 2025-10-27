const PLACEHOLDER_IMAGE = 'https://placehold.co/400x300?text=No+Image';

const getImageOrPlaceholder = (url?: string | null) => {
  if (typeof url === 'string') {
    const trimmed = url.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return PLACEHOLDER_IMAGE;
};

export default getImageOrPlaceholder;
export { PLACEHOLDER_IMAGE };
