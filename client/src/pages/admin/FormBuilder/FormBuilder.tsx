import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import showToast from '@/components/ui/Toast';
import {
  clearCurrentTemplate,
  createTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
  updateTemplate,
} from '@/store/formsSlice';
import type { Field, FieldType, FormTemplate, FormTemplateCategory } from '@/types/forms';
import FieldList from './FieldList';
import FieldEditor from './FieldEditor';
import styles from './FormBuilder.module.scss';

const OPTION_TYPES: FieldType[] = ['dropdown', 'radio', 'checkbox'];

const slugify = (input: string) =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'field';

const generateFieldId = (label: string, index: number) => `${slugify(label)}-${index}-${Math.random().toString(36).slice(2, 6)}`;

const createField = (type: FieldType, index: number): Field => ({
  id: generateFieldId('New field', index),
  label: `Field ${index + 1}`,
  type,
  required: false,
  placeholder: '',
  help: '',
  options: OPTION_TYPES.includes(type) ? ['Option 1', 'Option 2'] : undefined,
});

const FormBuilder = () => {
  const dispatch = useDispatch<AppDispatch>();
  const templates = useSelector((state: RootState) => state.forms.templates);
  const currentTemplate = useSelector((state: RootState) => state.forms.currentTemplate.data);
  const actions = useSelector((state: RootState) => state.forms.actions);

  const [meta, setMeta] = useState<{ name: string; category: FormTemplateCategory }>({ name: '', category: 'other' });
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(listTemplates());
  }, [dispatch]);

  useEffect(() => {
    if (!currentTemplate) return;
    setMeta({ name: currentTemplate.name, category: currentTemplate.category });
    setFields(currentTemplate.fields);
    setSelectedFieldId(currentTemplate.fields[0]?.id ?? null);
  }, [currentTemplate]);

  const handleSelectTemplate = (template: FormTemplate) => {
    dispatch(getTemplate(template.id));
  };

  const handleCreateNew = () => {
    setMeta({ name: '', category: 'other' });
    setFields([]);
    setSelectedFieldId(null);
    dispatch(clearCurrentTemplate());
  };

  const handleAddField = (type: FieldType = 'short_text') => {
    const nextField = createField(type, fields.length);
    setFields((prev) => [...prev, nextField]);
    setSelectedFieldId(nextField.id);
  };

  const handleDuplicateField = (id: string) => {
    const index = fields.findIndex((field) => field.id === id);
    if (index === -1) return;
    const original = fields[index];
    const copy: Field = {
      ...original,
      id: generateFieldId(original.label, fields.length),
      label: `${original.label} copy`,
    };
    const next = [...fields];
    next.splice(index + 1, 0, copy);
    setFields(next);
    setSelectedFieldId(copy.id);
  };

  const handleDeleteField = (id: string) => {
    const next = fields.filter((field) => field.id !== id);
    setFields(next);
    if (selectedFieldId === id) {
      setSelectedFieldId(next[0]?.id ?? null);
    }
  };

  const handleMove = (id: string, direction: 'up' | 'down') => {
    const index = fields.findIndex((field) => field.id === id);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;
    const next = [...fields];
    const [item] = next.splice(index, 1);
    next.splice(targetIndex, 0, item);
    setFields(next);
  };

  const handleFieldChange = (updated: Field) => {
    setFields((prev) => prev.map((field) => (field.id === updated.id ? updated : field)));
  };

  const handleMetaChange = (patch: Partial<typeof meta>) => {
    setMeta((prev) => ({ ...prev, ...patch }));
  };

  const sanitizedFields = useMemo(() =>
    fields.map((field) => ({
      ...field,
      options: OPTION_TYPES.includes(field.type)
        ? (field.options || []).map((option) => option.trim()).filter((option) => option.length > 0)
        : undefined,
    })),
  [fields]);

  const validate = () => {
    if (!meta.name.trim()) {
      setLocalError('Template name is required.');
      return false;
    }
    if (!sanitizedFields.length) {
      setLocalError('Add at least one field before saving.');
      return false;
    }
    setLocalError(null);
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      if (currentTemplate) {
        await dispatch(
          updateTemplate({
            id: currentTemplate.id,
            changes: {
              name: meta.name.trim(),
              category: meta.category,
              fields: sanitizedFields,
            },
          })
        ).unwrap();
        showToast('Template updated', 'success');
      } else {
        const result = await dispatch(
          createTemplate({
            name: meta.name.trim(),
            category: meta.category,
            fields: sanitizedFields,
          })
        ).unwrap();
        showToast('Template created', 'success');
        setSelectedFieldId(result.fields[0]?.id ?? null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save template';
      showToast(message, 'error');
    }
  };

  const handleDeleteTemplate = async () => {
    if (!currentTemplate) return;
    try {
      await dispatch(deleteTemplate(currentTemplate.id)).unwrap();
      showToast('Template deleted', 'success');
      handleCreateNew();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete template';
      showToast(message, 'error');
    }
  };

  const previewJson = useMemo(
    () => JSON.stringify({ name: meta.name, category: meta.category, fields: sanitizedFields }, null, 2),
    [meta, sanitizedFields]
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Form templates</h1>
          <p>Design reusable registration forms for events.</p>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleSave}
            disabled={actions.saveTemplate === 'loading'}
          >
            {currentTemplate ? 'Update template' : 'Save template'}
          </button>
          <button type="button" className={styles.secondaryButton} onClick={handleCreateNew}>
            New template
          </button>
          {currentTemplate && (
            <button
              type="button"
              className={styles.dangerButton}
              onClick={handleDeleteTemplate}
              disabled={actions.deleteTemplate === 'loading'}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {localError && <div className={styles.error}>{localError}</div>}

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <button type="button" className={styles.newTemplateButton} onClick={handleCreateNew}>
            + Create template
          </button>
          <div className={styles.templateList}>
            {templates.loading && <span>Loading templates…</span>}
            {templates.error && <span>{templates.error}</span>}
            {templates.items.map((template) => (
              <button
                type="button"
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className={`${styles.templateButton} ${currentTemplate?.id === template.id ? styles.templateButtonActive : ''}`}
              >
                <div>{template.name}</div>
                <small>{template.category}</small>
              </button>
            ))}
          </div>
        </aside>

        <section className={styles.content}>
          <div className={styles.formHeader}>
            <div className={styles.fieldGrid}>
              <label className={styles.label}>
                Template name
                <input
                  className={styles.input}
                  value={meta.name}
                  onChange={(event) => handleMetaChange({ name: event.target.value })}
                  placeholder="BGMI Solo Registration"
                />
              </label>
              <label className={styles.label}>
                Category
                <select
                  className={styles.select}
                  value={meta.category}
                  onChange={(event) => handleMetaChange({ category: event.target.value as FormTemplateCategory })}
                >
                  <option value="esports">Esports</option>
                  <option value="quiz">Quiz</option>
                  <option value="sports">Sports</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.secondaryButton} onClick={() => handleAddField('short_text')}>
                Add short text
              </button>
              <button type="button" className={styles.secondaryButton} onClick={() => handleAddField('dropdown')}>
                Add dropdown
              </button>
              <button type="button" className={styles.secondaryButton} onClick={() => handleAddField('checkbox')}>
                Add checkbox group
              </button>
            </div>
          </div>

          <FieldList
            fields={fields}
            selectedId={selectedFieldId}
            onSelect={setSelectedFieldId}
            onDuplicate={handleDuplicateField}
            onDelete={handleDeleteField}
            onMove={handleMove}
          />

          <FieldEditor
            field={fields.find((field) => field.id === selectedFieldId) ?? null}
            onChange={handleFieldChange}
          />

          <div>
            <h2 className={styles.sectionTitle}>Preview JSON</h2>
            <pre className={styles.preview}>{previewJson}</pre>
          </div>
        </section>
      </div>
    </div>
  );
};

export default FormBuilder;
