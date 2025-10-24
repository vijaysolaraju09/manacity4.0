import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import type { AppDispatch, RootState } from '@/store';
import showToast from '@/components/ui/Toast';
import {
  attachTemplateToEvent,
  getEventForm,
  listTemplates,
  setEmbeddedForm,
  toggleFormActive,
} from '@/store/formsSlice';
import type { Field, FieldType } from '@/types/forms';
import FieldList from '../FormBuilder/FieldList';
import FieldEditor from '../FormBuilder/FieldEditor';
import styles from './EventFormAttach.module.scss';
import { createField, generateFieldId, sanitizeFields } from '../FormBuilder/fieldUtils';

type TabKey = 'template' | 'embedded';

const EventFormAttach = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const templates = useSelector((state: RootState) => state.forms.templates.items);
  const templatesLoading = useSelector((state: RootState) => state.forms.templates.loading);
  const eventFormState = useSelector((state: RootState) => state.forms.eventForm);
  const actions = useSelector((state: RootState) => state.forms.actions);

  const [activeTab, setActiveTab] = useState<TabKey>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(listTemplates());
  }, [dispatch]);

  useEffect(() => {
    if (!eventId) return;
    dispatch(getEventForm(eventId));
  }, [dispatch, eventId]);

  useEffect(() => {
    const form = eventFormState.data;
    if (!form) return;
    if (form.mode === 'template' && form.templateId) {
      setSelectedTemplateId(form.templateId);
      setActiveTab('template');
    } else if (form.mode === 'embedded') {
      setFields(form.fields);
      setSelectedFieldId(form.fields[0]?.id ?? null);
      setActiveTab('embedded');
    }
  }, [eventFormState.data]);

  const sanitizedFields = useMemo(() => sanitizeFields(fields), [fields]);

  const handleAttachTemplate = async () => {
    if (!eventId || !selectedTemplateId) {
      setLocalError('Select a template to attach');
      return;
    }
    setLocalError(null);
    try {
      await dispatch(attachTemplateToEvent({ eventId, templateId: selectedTemplateId })).unwrap();
      showToast('Template attached to event', 'success');
      dispatch(getEventForm(eventId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to attach template';
      showToast(message, 'error');
    }
  };

  const handleSaveEmbedded = async () => {
    if (!eventId) return;
    if (!sanitizedFields.length) {
      setLocalError('Add at least one field before saving');
      return;
    }
    setLocalError(null);
    try {
      await dispatch(setEmbeddedForm({ eventId, fields: sanitizedFields })).unwrap();
      showToast('Embedded form saved', 'success');
      setActiveTab('embedded');
      dispatch(getEventForm(eventId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save embedded form';
      showToast(message, 'error');
    }
  };

  const handleToggleActive = async (isActive: boolean) => {
    if (!eventId) return;
    try {
      await dispatch(toggleFormActive({ eventId, isActive })).unwrap();
      showToast(isActive ? 'Form enabled' : 'Form disabled', 'success');
      dispatch(getEventForm(eventId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update form status';
      showToast(message, 'error');
    }
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
      id: generateFieldId(original.label),
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

  const handleMoveField = (id: string, direction: 'up' | 'down') => {
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

  const previewJson = useMemo(() => JSON.stringify(eventFormState.data ?? {}, null, 2), [eventFormState.data]);

  if (!eventId) {
    return <div className={styles.page}>Event id missing.</div>;
  }

  return (
    <div className={styles.page}>
      <header>
        <h1>Event registration form</h1>
        <p>Attach a reusable template or craft custom fields for this event.</p>
      </header>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'template' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('template')}
        >
          Use template
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'embedded' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('embedded')}
        >
          Embed fields
        </button>
      </div>

      {localError && <div className={styles.error}>{localError}</div>}

      {activeTab === 'template' && (
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Attach template</h2>
          <div className={styles.row}>
            <label className={styles.label}>
              Choose a template
              <select
                className={styles.select}
                value={selectedTemplateId ?? ''}
                onChange={(event) => setSelectedTemplateId(event.target.value || null)}
              >
                <option value="">Select a template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleAttachTemplate}
              disabled={actions.attach === 'loading' || templatesLoading}
            >
              Attach template
            </button>
          </div>
        </section>
      )}

      {activeTab === 'embedded' && (
        <section className={styles.card}>
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
          <FieldList
            fields={fields}
            selectedId={selectedFieldId}
            onSelect={setSelectedFieldId}
            onDuplicate={handleDuplicateField}
            onDelete={handleDeleteField}
            onMove={handleMoveField}
          />
          <FieldEditor field={fields.find((field) => field.id === selectedFieldId) ?? null} onChange={handleFieldChange} />
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleSaveEmbedded}
            disabled={actions.saveTemplate === 'loading'}
          >
            Save embedded form
          </button>
        </section>
      )}

      {eventFormState.data && (
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Current form configuration</h2>
          <div className={styles.toggleRow}>
            <span>Status:</span>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => handleToggleActive(!(eventFormState.data?.isActive ?? false))}
            >
              {eventFormState.data.isActive ? 'Disable form' : 'Activate form'}
            </button>
          </div>
          <pre className={styles.preview}>{previewJson}</pre>
        </section>
      )}
    </div>
  );
};

export default EventFormAttach;
