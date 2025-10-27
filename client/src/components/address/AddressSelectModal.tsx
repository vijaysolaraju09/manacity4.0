import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, MapPin, Plus, X } from 'lucide-react';

import {
  createAddress as createAddressApi,
  listMyAddresses,
  setDefaultAddress as setDefaultAddressApi,
  type Address,
} from '@/api/addresses';
import { toErrorMessage } from '@/lib/response';
import { cn } from '@/lib/utils';
import showToast from '@/components/ui/Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ErrorCard from '@/components/ui/ErrorCard';
import { Skeleton } from '@/components/ui/skeleton';

export type { Address };

interface AddressSelectModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (address: Address) => Promise<void> | void;
  isSubmitting?: boolean;
}

const focusableSelectors =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const AddressSelectModal = ({ open, onClose, onConfirm, isSubmitting = false }: AddressSelectModalProps) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultUpdatingId, setDefaultUpdatingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const [formValues, setFormValues] = useState({
    label: '',
    line1: '',
    area: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
  });

  const hasAddresses = addresses.length > 0;
  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedId) ?? null,
    [addresses, selectedId],
  );
  const disablePlaceOrder =
    !selectedAddress || isSubmitting || loading || defaultUpdatingId !== null || adding || !hasAddresses;

  const resetForm = () => {
    setFormValues({ label: '', line1: '', area: '', city: '', state: '', pincode: '', phone: '' });
    setFormError(null);
  };

  const applySelection = useCallback((items: Address[]) => {
    setAddresses(items);
    setSelectedId((prev) => {
      if (prev && items.some((address) => address.id === prev)) {
        return prev;
      }
      const defaultAddress = items.find((address) => address.isDefault);
      return defaultAddress?.id ?? items[0]?.id ?? null;
    });
  }, []);

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const normalized = await listMyAddresses();
      applySelection(normalized);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [applySelection]);

  useEffect(() => {
    if (open) {
      fetchAddresses();
    }
  }, [open, fetchAddresses]);

  useEffect(() => {
    if (!open) return undefined;
    const node = dialogRef.current;
    if (!node) return undefined;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const focusable = node.querySelectorAll<HTMLElement>(focusableSelectors);
    const first = focusable[0];
    (first ?? node).focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || focusable.length === 0) return;
      const focusArray = Array.from(node.querySelectorAll<HTMLElement>(focusableSelectors));
      if (focusArray.length === 0) return;
      const firstEl = focusArray[0];
      const lastEl = focusArray[focusArray.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === firstEl) {
          event.preventDefault();
          lastEl.focus();
        }
      } else if (document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [open, onClose]);

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    onClose();
  };

  const handleContainerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const handleInputChange = (field: keyof typeof formValues) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleAddAddress = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const normalizeString = (value: unknown) =>
      typeof value === 'string' ? value.trim() : '';

    const requiredFields: (keyof typeof formValues)[] = ['label', 'line1', 'city', 'state', 'pincode', 'phone'];
    const missing = requiredFields.some((field) => !normalizeString(formValues[field]));
    if (missing) {
      const message = 'Please fill in all required address fields.';
      setFormError(message);
      showToast(message, 'error');
      return;
    }

    const phoneValue = normalizeString(formValues.phone);
    if (!/^\d{10}$/u.test(phoneValue)) {
      const message = 'Phone number must be 10 digits.';
      setFormError(message);
      showToast(message, 'error');
      return;
    }

    const pincodeValue = normalizeString(formValues.pincode);
    if (!/^\d{6}$/u.test(pincodeValue)) {
      const message = 'Pincode must be 6 digits.';
      setFormError(message);
      showToast(message, 'error');
      return;
    }

    setAdding(true);
    try {
      const payload = {
        label: normalizeString(formValues.label),
        line1: normalizeString(formValues.line1),
        line2: normalizeString(formValues.area),
        city: normalizeString(formValues.city),
        state: normalizeString(formValues.state),
        pincode: pincodeValue,
        phone: phoneValue,
        ...(addresses.length ? {} : { isDefault: true }),
      };

      const created = await createAddressApi(payload);
      setAddresses((prev) => {
        const filtered = prev.filter((addr) => addr.id !== created.id);
        const others = created.isDefault
          ? filtered.map((addr) => ({ ...addr, isDefault: false }))
          : filtered;
        const next = created.isDefault ? [created, ...others] : [created, ...others];
        return next;
      });
      setSelectedId(created.id);
      showToast('Address saved', 'success');
      resetForm();
    } catch (err) {
      const message = toErrorMessage(err);
      setFormError(message);
      showToast(message, 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    setDefaultUpdatingId(addressId);
    try {
      const updated = await setDefaultAddressApi(addressId);
      setAddresses((prev) =>
        prev.map((address) =>
          address.id === updated.id
            ? { ...address, ...updated }
            : { ...address, isDefault: false },
        ),
      );
      setSelectedId(updated.id);
      showToast('Default address updated', 'success');
    } catch (err) {
      const message = toErrorMessage(err);
      showToast(message, 'error');
    } finally {
      setDefaultUpdatingId(null);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      showToast('Please select an address to continue.', 'error');
      return;
    }
    try {
      await onConfirm(selectedAddress);
    } catch (err) {
      // The parent component is responsible for displaying error feedback.
    }
  };

  const addressContent = useMemo(() => {
    if (loading) {
      return (
        <div className="space-y-3" aria-live="polite">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <ErrorCard message={error} onRetry={fetchAddresses} retryLabel="Retry" />
      );
    }

    if (!addresses.length) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
          <MapPin className="mx-auto mb-3 h-6 w-6 text-blue-500" aria-hidden="true" />
          <p>No saved addresses yet. Add one below to continue with checkout.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {addresses.map((address) => {
          const isSelected = selectedId === address.id;
          return (
            <button
              key={address.id}
              type="button"
              onClick={() => setSelectedId(address.id)}
              className={cn(
                'flex w-full cursor-pointer items-start gap-4 rounded-2xl border bg-white p-4 text-left transition hover:border-blue-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-blue-500',
                isSelected ? 'border-blue-500 shadow-md' : 'border-slate-200',
              )}
            >
              <input
                type="radio"
                name="delivery-address"
                checked={isSelected}
                onChange={() => setSelectedId(address.id)}
                className="mt-1 h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                aria-label={`Select ${address.label}`}
              />
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {address.label}
                  </p>
                  {address.isDefault ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Default
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {[address.line1, address.line2, address.city, address.state, address.pincode]
                    .filter(Boolean)
                    .join(', ')}
                </p>
                {address.phone ? (
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Phone: <span className="font-medium text-slate-700 dark:text-slate-200">{address.phone}</span>
                  </p>
                ) : null}
                {!address.isDefault ? (
                  <div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleSetDefault(address.id);
                      }}
                      disabled={defaultUpdatingId === address.id || isSubmitting}
                      className="rounded-full px-3 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-300"
                    >
                      {defaultUpdatingId === address.id ? 'Updating…' : 'Make default'}
                    </Button>
                  </div>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    );
  }, [
    addresses,
    defaultUpdatingId,
    error,
    fetchAddresses,
    handleSetDefault,
    isSubmitting,
    loading,
    selectedId,
  ]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex min-h-full items-center justify-center overflow-y-auto bg-slate-900/70 px-4 py-10 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="address-modal-heading"
      onClick={handleOverlayClick}
    >
      <div
        className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-2xl dark:border-slate-800/70 dark:bg-slate-900"
        style={{ maxHeight: 'min(90vh, 48rem)' }}
        ref={dialogRef}
        tabIndex={-1}
        onClick={handleContainerClick}
      >
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-6 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="address-modal-heading"
                  className="text-xl font-semibold text-slate-900 dark:text-slate-50"
                >
                  Choose delivery address
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Select an address for this order or add a new one.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close address selection"
                className="rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Saved addresses
              </h3>
              {addressContent}
            </section>

            <section className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <Plus className="h-4 w-4" aria-hidden="true" /> Add new address
              </h3>
              <form className="grid gap-3 md:grid-cols-2" onSubmit={handleAddAddress}>
              <label className="flex flex-col gap-1" htmlFor="address-label">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-200">
                  Label
                </span>
                <Input
                id="address-label"
                value={formValues.label}
                onChange={handleInputChange('label')}
                placeholder="Label (e.g., Home, Office)"
                disabled={adding || isSubmitting}
                required
              />
            </label>
            <label className="flex flex-col gap-1" htmlFor="address-phone">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-200">
                Phone
              </span>
              <Input
                id="address-phone"
                value={formValues.phone}
                onChange={handleInputChange('phone')}
                placeholder="Phone"
                disabled={adding || isSubmitting}
              />
            </label>
            <label className="flex flex-col gap-1 md:col-span-2" htmlFor="address-line1">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-200">
                Address line 1
              </span>
              <Input
                id="address-line1"
                value={formValues.line1}
                onChange={handleInputChange('line1')}
                placeholder="Address line 1"
                disabled={adding || isSubmitting}
                required
              />
            </label>
            <label className="flex flex-col gap-1 md:col-span-2" htmlFor="address-line2">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-200">
                Address line 2 (optional)
              </span>
              <Input
                id="address-line2"
                value={formValues.area}
                onChange={handleInputChange('area')}
                placeholder="Apartment, suite, area"
                disabled={adding || isSubmitting}
              />
            </label>
            <label className="flex flex-col gap-1" htmlFor="address-city">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-200">City</span>
              <Input
                id="address-city"
                value={formValues.city}
                onChange={handleInputChange('city')}
                placeholder="City"
                disabled={adding || isSubmitting}
                required
              />
            </label>
            <label className="flex flex-col gap-1" htmlFor="address-state">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-200">State</span>
              <Input
                id="address-state"
                value={formValues.state}
                onChange={handleInputChange('state')}
                placeholder="State"
                disabled={adding || isSubmitting}
                required
              />
            </label>
            <label className="flex flex-col gap-1" htmlFor="address-pincode">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-200">
                Pincode
              </span>
              <Input
                id="address-pincode"
                value={formValues.pincode}
                onChange={handleInputChange('pincode')}
                placeholder="Pincode"
                disabled={adding || isSubmitting}
                required
              />
            </label>
            <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3">
              {formError ? (
                <p className="text-sm font-medium text-rose-600" role="alert">
                  {formError}
                </p>
              ) : (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Required fields are marked automatically.
                </span>
              )}
              <Button
                type="submit"
                className="rounded-full px-6 py-2 text-sm font-semibold"
                disabled={adding || isSubmitting}
              >
                {adding ? 'Saving…' : 'Save address'}
              </Button>
            </div>
              </form>
            </section>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white/80 p-6 dark:border-slate-800 dark:bg-slate-900/80 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            className="rounded-full px-6 py-2"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-full px-6 py-2 font-semibold"
            onClick={handlePlaceOrder}
            disabled={disablePlaceOrder}
          >
            {isSubmitting ? 'Placing order…' : 'Place order'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default AddressSelectModal;
