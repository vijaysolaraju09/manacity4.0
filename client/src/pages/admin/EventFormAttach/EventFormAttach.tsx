import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
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
import { paths } from '@/routes/paths';
import type { AdminEventContext } from '@/pages/Admin/Events/AdminEventLayout';
import FieldList from '../FormBuilder/FieldList';
import FieldEditor from '../FormBuilder/FieldEditor';
import { createField, generateFieldId, sanitizeFields } from '../FormBuilder/fieldUtils';
import styles from './EventFormAttach.module.scss';

type TabKey = 'template' | 'embedded';

const EventFormAttach = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const context = useOutletContext<AdminEventContext | null>();
  const dispatch = useDispatch<AppDispatch>();

  const templatesState = useSelector((state: RootState) => state.forms.templates);
  const templates = templatesState.items;
  const templatesLoading = templatesState.loading;
  const templatesError = templatesState.error;
  const eventFormState = useSelector((state: RootState) => state.forms.eventForm);
  const actions = useSelector((state: RootState) => state.forms.actions);

  const event = context?.event ?? null;
  const refreshEvent = context?.refresh;

  const [activeTab, setActiveTab] = useState<TabKey>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const loadEventForm = useCallback(async () => {
    if (!eventId) return;
    await dispatch(getEventForm(eventId));
  }, [dispatch, eventId]);

  useEffect(() => {
    dispatch(listTemplates());
  }, [dispatch]);

  useEffect(() => {
    void loadEventForm();
  }, [loadEventForm]);

  useEffect(() => {
    const form = eventFormState.data;
    if (!form) {
      setSelectedTemplateId(null);
      setFields([]);
      setSelectedFieldId(null);
      return;
    }

    if (form.mode === 'template') {
      setSelectedTemplateId(form.templateId ?? null);
      setActiveTab('template');
      setFields([]);
      setSelectedFieldId(null);
    } else {
      const sanitized = sanitizeFields(form.fields);
      setFields(sanitized);
      setSelectedFieldId(sanitized[0]?.id ?? null);
      setActiveTab('embedded');
      setSelectedTemplateId(null);
    }
  }, [eventFormState.data]);

  const sanitizedFields = useMemo(() => sanitizeFields(fields), [fields]);

  const resolvedTemplateName = useMemo(() => {
    if (!selectedTemplateId) return null;
    const match = templates.find((template) => template.id === selectedTemplateId);
    if (match) return match.name;
    if (eventFormState.data?.title) return eventFormState.data.title;
    return `Template ${selectedTemplateId.slice(-6)}`;
  }, [eventFormState.data?.title, selectedTemplateId, templates]);

  const isTemplateMode = eventFormState.data?.mode === 'template';
  const isFormActive = eventFormState.data?.isActive ?? false;
  const fieldCount = eventFormState.data?.fields?.length ?? sanitizedFields.length;
  const isInitialLoading = eventFormState.loading && !eventFormState.data;
  const attachDisabled =
    !selectedTemplateId ||
    (isTemplateMode && selectedTemplateId === eventFormState.data?.templateId) ||
    actions.attach === 'loading';

  const handleAttachTemplate = async () => {
    if (!eventId || !selectedTemplateId) {
      setLocalError('Select a template to attach');
      return;
    }
    setLocalError(null);
    try {
      await dispatch(attachTemplateToEvent({ eventId, templateId: selectedTemplateId })).unwrap();
      showToast('Template attached to event', 'success');
      await loadEventForm();
      if (refreshEvent) {
        await refreshEvent();
      }
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
      await loadEventForm();
      if (refreshEvent) {
        await refreshEvent();
      }
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
      await loadEventForm();
      if (refreshEvent) {
        await refreshEvent();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update form status';
      showToast(message, 'error');
    }
  };

  const handleRetry = useCallback(() => {
    dispatch(listTemplates());
    void loadEventForm();
  }, [dispatch, loadEventForm]);

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

  const eventName = event?.title ? `“${event.title}”` : 'this event';
  const noTemplatesAvailable = !templatesLoading && templates.length === 0;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Registration form</h1>
          <p>Design the questions attendees answer when registering for {eventName}.</p>
        </div>
        {eventFormState.data && (
          <span
            className={`${styles.statusPill} ${
              isFormActive ? styles.statusPillActive : styles.statusPillInactive
            }`}
          >
            {isFormActive ? 'Active' : 'Inactive'}
          </span>
        )}
      </header>

      {(eventFormState.error || templatesError) && (
        <section className={styles.card}>
          <div className={styles.errorCard}>
            <div>
              {eventFormState.error && <p>{eventFormState.error}</p>}
              {templatesError && <p>{templatesError}</p>}
            </div>
            <button type="button" className={styles.secondaryButton} onClick={handleRetry}>
              Retry
            </button>
          </div>
        </section>
      )}

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
          {templatesLoading ? (
            <div className={styles.loadingRow}>
              <Loader2 size={18} className={styles.spin} /> Loading templates…
            </div>
          ) : (
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
          )}
          <p className={styles.helperText}>
            {noTemplatesAvailable ? (
              <>
                No templates yet.{' '}
                <Link to={paths.admin.formTemplates()} className={styles.link}>
                  Create a form template
                </Link>{' '}
                to reuse questions across events.
              </>
            ) : (
              <>
                Want to tweak your library?{' '}
                <Link to={paths.admin.formTemplates()} className={styles.link}>
                  Open the template builder
                </Link>
                .
              </>
            )}
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleAttachTemplate}
              disabled={attachDisabled || templatesLoading}
            >
              {actions.attach === 'loading' ? <Loader2 size={16} className={styles.spin} /> : 'Attach template'}
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
            disabled={actions.saveTemplate === 'loading' || sanitizedFields.length === 0}
          >
            {actions.saveTemplate === 'loading' ? (
              <Loader2 size={16} className={styles.spin} />
            ) : (
              'Save embedded form'
            )}
          </button>
        </section>
      )}

      {isInitialLoading ? (
        <section className={styles.card}>
          <div className={styles.loadingRow}>
            <Loader2 size={18} className={styles.spin} /> Loading registration form…
          </div>
        </section>
      ) : eventFormState.data ? (
        <section className={styles.card}>
          <div className={styles.summaryHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Current configuration</h2>
              <p className={styles.summaryMeta}>
                {isTemplateMode ? 'Template' : 'Embedded'} • {fieldCount} field{fieldCount === 1 ? '' : 's'}
              </p>
            </div>
            <div className={styles.summaryActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => handleToggleActive(!isFormActive)}
                disabled={actions.toggle === 'loading'}
              >
                {actions.toggle === 'loading' ? (
                  <Loader2 size={16} className={styles.spin} />
                ) : isFormActive ? (
                  'Disable form'
                ) : (
                  'Activate form'
                )}
              </button>
            </div>
          </div>
          <dl className={styles.summaryList}>
            <div className={styles.summaryItem}>
              <dt className={styles.summaryLabel}>Mode</dt>
              <dd className={styles.summaryValue}>{isTemplateMode ? 'Template' : 'Embedded fields'}</dd>
            </div>
            {isTemplateMode && selectedTemplateId && (
              <div className={styles.summaryItem}>
                <dt className={styles.summaryLabel}>Template</dt>
                <dd className={styles.summaryValue}>{resolvedTemplateName}</dd>
              </div>
            )}
            <div className={styles.summaryItem}>
              <dt className={styles.summaryLabel}>Fields</dt>
              <dd className={styles.summaryValue}>{fieldCount}</dd>
            </div>
          </dl>
          <pre className={styles.preview}>{previewJson}</pre>
        </section>
      ) : (
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>No registration form yet</h2>
          <p className={styles.summaryMeta}>Attach a template or embed custom fields to start collecting registrations.</p>
        </section>
      )}
    </div>
  );
};

export default EventFormAttach;
