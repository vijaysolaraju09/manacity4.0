import type { ChangeEvent, FC } from 'react';
import type { Field, FieldType } from '@/types/forms';
import OptionEditor from './OptionEditor';
import styles from './FieldEditor.module.scss';

interface FieldEditorProps {
  field: Field | null;
  onChange: (next: Field) => void;
}

const OPTION_TYPES: FieldType[] = ['dropdown', 'radio', 'checkbox'];
const STRING_TYPES: FieldType[] = ['short_text', 'textarea', 'email', 'phone', 'url', 'file', 'datetime'];

const FieldEditor: FC<FieldEditorProps> = ({ field, onChange }) => {
  if (!field) {
    return <div className={styles.panel}>Select a field to edit its settings.</div>;
  }

  const updateField = (patch: Partial<Field>) => {
    onChange({ ...field, ...patch });
  };

  const handleTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextType = event.target.value as FieldType;
    const nextField: Field = {
      ...field,
      type: nextType,
    };
    if (!OPTION_TYPES.includes(nextType)) {
      delete nextField.options;
      if (nextType !== 'checkbox') {
        delete nextField.defaultValue;
      }
    } else {
      nextField.options = Array.isArray(field.options) ? field.options : ['Option 1'];
    }
    if (nextType !== 'number') {
      delete nextField.min;
      delete nextField.max;
    }
    updateField(nextField);
  };

  const handleRequiredChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateField({ required: event.target.checked });
  };

  const handleDefaultValueChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { value } = event.target;
    if (field.type === 'number') {
      updateField({ defaultValue: value === '' ? undefined : Number(value) });
    } else {
      updateField({ defaultValue: value });
    }
  };

  const handleCheckboxDefaultChange = (option: string) => {
    const existing = Array.isArray(field.defaultValue) ? (field.defaultValue as string[]) : [];
    if (existing.includes(option)) {
      updateField({ defaultValue: existing.filter((value) => value !== option) });
    } else {
      updateField({ defaultValue: [...existing, option] });
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.row}>
        <label className={styles.label}>
          Field label
          <input
            className={styles.input}
            value={field.label}
            onChange={(event) => updateField({ label: event.target.value })}
            placeholder="Player name"
          />
        </label>
        <div className={styles.inlineRow}>
          <label className={styles.label}>
            Field type
            <select className={styles.select} value={field.type} onChange={handleTypeChange}>
              <option value="short_text">Short text</option>
              <option value="textarea">Paragraph</option>
              <option value="number">Number</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="dropdown">Dropdown</option>
              <option value="radio">Radio</option>
              <option value="checkbox">Checkbox</option>
              <option value="url">URL</option>
              <option value="file">File upload</option>
              <option value="datetime">Date &amp; time</option>
            </select>
          </label>
          <label className={`${styles.label} ${styles.checkboxRow}`}>
            <input type="checkbox" checked={field.required} onChange={handleRequiredChange} />
            Required
          </label>
        </div>
      </div>

      <div className={styles.inlineRow}>
        <label className={styles.label}>
          Placeholder
          <input
            className={styles.input}
            value={field.placeholder ?? ''}
            onChange={(event) => updateField({ placeholder: event.target.value })}
            placeholder="Enter value"
          />
        </label>
        <label className={styles.label}>
          Help text
          <input
            className={styles.input}
            value={field.help ?? ''}
            onChange={(event) => updateField({ help: event.target.value })}
            placeholder="Displayed below the field"
          />
        </label>
      </div>

      {field.type === 'number' && (
        <div className={styles.inlineRow}>
          <label className={styles.label}>
            Minimum value
            <input
              type="number"
              className={styles.input}
              value={field.min ?? ''}
              onChange={(event) => updateField({ min: event.target.value === '' ? undefined : Number(event.target.value) })}
            />
          </label>
          <label className={styles.label}>
            Maximum value
            <input
              type="number"
              className={styles.input}
              value={field.max ?? ''}
              onChange={(event) => updateField({ max: event.target.value === '' ? undefined : Number(event.target.value) })}
            />
          </label>
        </div>
      )}

      {STRING_TYPES.includes(field.type) && field.type !== 'textarea' && field.type !== 'file' && field.type !== 'datetime' && (
        <label className={styles.label}>
          Validation pattern
          <input
            className={styles.input}
            value={field.pattern ?? ''}
            onChange={(event) => updateField({ pattern: event.target.value || undefined })}
            placeholder="Regular expression"
          />
          <span className={styles.hint}>Optional regex pattern for custom validation.</span>
        </label>
      )}

      {OPTION_TYPES.includes(field.type) && (
        <div className={styles.row}>
          <div className={styles.optionHeader}>
            <span>Options</span>
          </div>
          <OptionEditor options={field.options ?? []} onChange={(options) => updateField({ options })} />
        </div>
      )}

      <div className={styles.row}>
        <span className={styles.sectionTitle}>Default value</span>
        {field.type === 'checkbox' && Array.isArray(field.options) && (
          <div className={styles.inlineRow}>
            {field.options.map((option) => {
              const selected = Array.isArray(field.defaultValue)
                ? (field.defaultValue as string[]).includes(option)
                : false;
              return (
                <label key={option} className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => handleCheckboxDefaultChange(option)}
                  />
                  {option}
                </label>
              );
            })}
          </div>
        )}
        {field.type === 'dropdown' && Array.isArray(field.options) && (
          <select
            className={styles.select}
            value={typeof field.defaultValue === 'string' ? (field.defaultValue as string) : ''}
            onChange={(event) => updateField({ defaultValue: event.target.value || undefined })}
          >
            <option value="">No default</option>
            {field.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}
        {field.type === 'radio' && Array.isArray(field.options) && (
          <div className={styles.inlineRow}>
            {field.options.map((option) => (
              <label key={option} className={styles.checkboxRow}>
                <input
                  type="radio"
                  name={`default-${field.id}`}
                  checked={field.defaultValue === option}
                  onChange={() => updateField({ defaultValue: option })}
                />
                {option}
              </label>
            ))}
          </div>
        )}
        {field.type === 'number' && (
          <input
            type="number"
            className={styles.input}
            value={typeof field.defaultValue === 'number' ? field.defaultValue : ''}
            onChange={handleDefaultValueChange}
          />
        )}
        {field.type === 'datetime' && (
          <input
            type="datetime-local"
            className={styles.input}
            value={typeof field.defaultValue === 'string' ? (field.defaultValue as string) : ''}
            onChange={handleDefaultValueChange}
          />
        )}
        {STRING_TYPES.includes(field.type) && field.type !== 'datetime' && field.type !== 'checkbox' && field.type !== 'dropdown' && field.type !== 'radio' && (
          <input
            className={styles.input}
            value={typeof field.defaultValue === 'string' ? (field.defaultValue as string) : ''}
            onChange={handleDefaultValueChange}
          />
        )}
        {field.type === 'textarea' && (
          <textarea
            className={styles.textarea}
            value={typeof field.defaultValue === 'string' ? (field.defaultValue as string) : ''}
            onChange={handleDefaultValueChange}
            rows={3}
          />
        )}
        {field.type === 'file' && (
          <span className={styles.hint}>File fields capture URLs after upload during registration.</span>
        )}
      </div>
    </div>
  );
};

export default FieldEditor;
