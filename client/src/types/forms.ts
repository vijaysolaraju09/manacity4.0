export type FieldType =
  | 'short_text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'phone'
  | 'dropdown'
  | 'radio'
  | 'checkbox'
  | 'url'
  | 'file'
  | 'datetime';

export interface Field {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  help?: string;
  options?: string[];
  min?: number;
  max?: number;
  pattern?: string;
  defaultValue?: unknown;
}

export type FormTemplateCategory = 'esports' | 'quiz' | 'sports' | 'other';

export interface FormTemplate {
  id: string;
  name: string;
  category: FormTemplateCategory;
  fields: Field[];
  createdAt?: string;
  updatedAt?: string;
}

export interface EventFormResolved {
  mode: 'embedded' | 'template';
  templateId?: string | null;
  isActive: boolean;
  fields: Field[];
}
