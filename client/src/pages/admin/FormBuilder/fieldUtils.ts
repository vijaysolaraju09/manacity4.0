import type { Field, FieldType } from '@/types/forms';

const randomSuffix = () => Math.random().toString(36).slice(2, 6);

export const slugify = (input: string) =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'field';

export const OPTION_TYPES: FieldType[] = ['dropdown', 'radio', 'checkbox'];
export const STRING_TYPES: FieldType[] = [
  'short_text',
  'textarea',
  'email',
  'phone',
  'url',
  'file',
  'datetime',
];

export const generateFieldId = (label: string, currentId?: string) => {
  const slug = slugify(label);
  if (currentId) {
    const suffix = currentId.split('-').pop();
    if (suffix) {
      return `${slug}-${suffix}`;
    }
  }
  return `${slug}-${randomSuffix()}`;
};

export const createField = (type: FieldType, index: number): Field => ({
  id: generateFieldId(`Field ${index + 1}`),
  label: `Field ${index + 1}`,
  type,
  required: false,
  placeholder: '',
  help: '',
  options: OPTION_TYPES.includes(type) ? ['Option 1', 'Option 2'] : undefined,
});

export const sanitizeFields = (fields: Field[]): Field[] =>
  fields.map((field) => ({
    ...field,
    options: OPTION_TYPES.includes(field.type)
      ? (field.options || [])
          .map((option) => option.trim())
          .filter((option) => option.length > 0)
      : undefined,
  }));

export const withUpdatedLabel = (field: Field, label: string): Field => ({
  ...field,
  label,
  id: generateFieldId(label, field.id),
});
