import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './AdminServices.scss';
import { fetchServices, createService, updateService } from '@/store/services';
import type { AppDispatch, RootState } from '@/store';
import { adminHttp } from '@/lib/http';
import { toItems } from '@/lib/response';
import type { ServiceProviderUser } from '@/types/services';

const emptyForm = { name: '', description: '', icon: '', isActive: true, providers: [] as string[] };

type FormState = typeof emptyForm;

type ServiceItem = {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
  providers?: string[];
};

const AdminServices = () => {
  const dispatch = useDispatch<AppDispatch>();
  const servicesState = useSelector((state: RootState) => state.services);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [providerOptions, setProviderOptions] = useState<ServiceProviderUser[]>([]);
  const [providerError, setProviderError] = useState<string | null>(null);

  useEffect(() => {
    if (servicesState.status === 'idle') {
      dispatch(fetchServices({ isActive: 'all' }));
    }
  }, [dispatch, servicesState.status]);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const res = await adminHttp.get('/admin/users', { params: { role: 'business', pageSize: 200 } });
        const items = (toItems(res) as any[]).map((user) => ({
          _id: String(user._id ?? user.id ?? ''),
          name: user.name ?? 'Business owner',
          phone: user.phone ?? '',
          profession: user.profession ?? '',
        })) as ServiceProviderUser[];
        setProviderOptions(items);
      } catch (error) {
        setProviderError('Failed to load providers');
      }
    };

    void loadProviders();
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    const { name } = target;
    const value =
      target instanceof HTMLInputElement && target.type === 'checkbox'
        ? target.checked
        : target.value;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const toggleProvider = (id: string) => {
    setForm((prev) => {
      const hasId = prev.providers.includes(id);
      return {
        ...prev,
        providers: hasId
          ? prev.providers.filter((entry) => entry !== id)
          : [...prev.providers, id],
      };
    });
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
      providers: Array.isArray(service.providers)
        ? service.providers.map((id) => String(id)).filter(Boolean)
        : [],
    });
  };

  const handleToggle = (service: ServiceItem) => {
    dispatch(
      updateService({
        id: service._id,
        payload: {
          name: service.name,
          description: service.description ?? '',
          icon: service.icon ?? '',
          isActive: service.isActive === false,
        },
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
        <div className="admin-services__provider-picker">
          <div className="admin-services__provider-header">
            <span>Assigned providers</span>
            <span className="admin-services__hint">Business owners who can fulfil this service</span>
          </div>
          {providerError ? <p className="admin-services__error">{providerError}</p> : null}
          <div className="admin-services__provider-list">
            {providerOptions.length === 0 && !providerError ? (
              <p className="admin-services__hint">No providers available yet.</p>
            ) : (
              providerOptions.map((provider) => {
                const subtitle = provider.profession || provider.phone;
                return (
                  <label key={provider._id} className="admin-services__provider-option">
                    <input
                      type="checkbox"
                      checked={form.providers.includes(provider._id)}
                      onChange={() => toggleProvider(provider._id)}
                    />
                    <div>
                      <div className="admin-services__provider-name">{provider.name}</div>
                      {subtitle ? <div className="admin-services__provider-sub">{subtitle}</div> : null}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
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
                <div className="admin-services__provider-meta">
                  Providers: {Array.isArray(service.providers) ? service.providers.length : 0}
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
