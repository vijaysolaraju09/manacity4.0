import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './AdminServices.scss';
import { fetchServices, createService, updateService } from '@/store/services';
import type { AppDispatch, RootState } from '@/store';

const emptyForm = { name: '', description: '', icon: '', isActive: true };

type FormState = typeof emptyForm;

type ServiceItem = {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
};

const AdminServices = () => {
  const dispatch = useDispatch<AppDispatch>();
  const servicesState = useSelector((state: RootState) => state.services);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (servicesState.status === 'idle') {
      dispatch(fetchServices({ isActive: 'all' }));
    }
  }, [dispatch, servicesState.status]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    if (editingId) {
      dispatch(updateService({ id: editingId, payload: form })).then(() => {
        resetForm();
      });
    } else {
      dispatch(createService(form)).then(() => {
        resetForm();
      });
    }
  };

  const handleEdit = (service: ServiceItem) => {
    setEditingId(service._id);
    setForm({
      name: service.name,
      description: service.description ?? '',
      icon: service.icon ?? '',
      isActive: service.isActive !== false,
    });
  };

  const handleToggle = (service: ServiceItem) => {
    dispatch(
      updateService({
        id: service._id,
        payload: { isActive: service.isActive === false },
      })
    );
  };

  const services = Array.isArray(servicesState.items) ? servicesState.items : [];

  return (
    <div className="admin-services">
      <form className="admin-services__form" onSubmit={handleSubmit}>
        <h2>{editingId ? 'Edit service' : 'Create new service'}</h2>
        <label>
          Name
          <input name="name" value={form.name} onChange={handleChange} required />
        </label>
        <label>
          Description
          <textarea name="description" value={form.description} onChange={handleChange} />
        </label>
        <label>
          Icon / Emoji
          <input name="icon" value={form.icon} onChange={handleChange} placeholder="e.g. 🔧" />
        </label>
        <label>
          <span>Active</span>
          <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
        </label>
        {servicesState.createError || servicesState.updateError ? (
          <div className="admin-services__error">
            {servicesState.createError || servicesState.updateError}
          </div>
        ) : null}
        <div className="admin-services__actions">
          <button type="submit" disabled={servicesState.createStatus === 'loading' || servicesState.updateStatus === 'loading'}>
            {editingId
              ? servicesState.updateStatus === 'loading'
                ? 'Saving...'
                : 'Save changes'
              : servicesState.createStatus === 'loading'
              ? 'Creating...'
              : 'Create service'}
          </button>
          {editingId ? (
            <button type="button" onClick={resetForm}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="admin-services__list">
        {services.map((service) => (
          <div key={service._id} className="admin-services__item">
            <div className="admin-services__item-header">
              <div>
                <strong>{service.name}</strong>
                <div className="admin-services__status">
                  {service.isActive === false ? 'Inactive' : 'Active'}
                </div>
              </div>
              <div className="admin-services__actions">
                <button type="button" onClick={() => handleEdit(service)}>
                  Edit
                </button>
                <button type="button" onClick={() => handleToggle(service)}>
                  {service.isActive === false ? 'Mark active' : 'Mark inactive'}
                </button>
              </div>
            </div>
            {service.description ? <p>{service.description}</p> : null}
            {service.icon ? <p>Icon: {service.icon}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminServices;
