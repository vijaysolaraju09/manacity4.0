export type FieldType =
  | 'short_text'
  | 'textarea'
  | 'long_text'
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
  /**
   * Some APIs return a nested dynamicForm object with activation metadata.
   * Keep a reference so the consumer can check `dynamicForm.isActive` without
   * having to inspect the raw payload structure.
   */
  dynamicForm?: { isActive: boolean } | null;
  /**
   * Registration information for the parent event. This allows the UI to show
   * a friendly message when the backend marks the form as closed or waitlisted.
   */
  registration?: {
    isOpen: boolean;
    message?: string | null;
    closedReason?: string | null;
  } | null;
  title?: string | null;
  description?: string | null;
  fields: Field[];
}
