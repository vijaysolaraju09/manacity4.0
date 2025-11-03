import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MapPin, Phone, Plus, Trash2, Pencil, Star } from 'lucide-react';
import { z } from 'zod';

import {
  createAddress,
  deleteAddress,
  listMyAddresses,
  setDefaultAddress,
  updateAddress,
  type Address,
} from '@/api/addresses';
import showToast from '@/components/ui/Toast';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from '@/components/ui/form';
import Input from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import ErrorCard from '@/components/ui/ErrorCard';
import ModalSheet from '@/components/base/ModalSheet';
import { createZodResolver } from '@/lib/createZodResolver';
import { toErrorMessage } from '@/lib/response';
import { cn } from '@/lib/utils';

const addressSchema = z.object({
  label: z.string().trim().min(1, 'Label is required'),
  line1: z.string().trim().min(1, 'Address line 1 is required'),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(1, 'City is required'),
  state: z.string().trim().min(1, 'State is required'),
  pincode: z
    .string()
    .trim()
    .min(6, 'Pincode must be 6 digits')
    .max(6, 'Pincode must be 6 digits')
    .regex(/^\d{6}$/u, 'Pincode must be 6 digits'),
  phone: z
    .string()
    .trim()
    .min(10, 'Phone must be 10 digits')
    .max(10, 'Phone must be 10 digits')
    .regex(/^\d{10}$/u, 'Phone must be 10 digits'),
  isDefault: z.boolean().optional(),
});

const formDefaults = {
  label: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
  isDefault: false,
};

type AddressFormValues = z.infer<typeof addressSchema>;

type RequestState = 'idle' | 'loading' | 'success' | 'error';

const sectionMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const formatAddress = (address: Address): string => {
  return [address.line1, address.line2, address.city, address.state, address.pincode]
    .filter(Boolean)
    .join(', ');
};

const sortAddresses = (entries: Address[]) => {
  return [...entries].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return a.label.localeCompare(b.label);
  });
};

const AddressManager = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [status, setStatus] = useState<RequestState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [pendingDefaultId, setPendingDefaultId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const form = useForm<AddressFormValues>({
    defaultValues: formDefaults,
    resolver: createZodResolver(addressSchema),
  });

  const handleFetch = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const items = await listMyAddresses();
      setAddresses(sortAddresses(items));
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(toErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    if (status === 'idle') {
      handleFetch();
    }
  }, [handleFetch, status]);

  const openSheet = useCallback(
    (address?: Address | null) => {
      const target = address ?? null;
      setEditingAddress(target);
      form.reset({
        label: target?.label ?? '',
        line1: target?.line1 ?? '',
        line2: target?.line2 ?? '',
        city: target?.city ?? '',
        state: target?.state ?? '',
        pincode: target?.pincode ?? '',
        phone: target?.phone ?? '',
        isDefault: Boolean(target?.isDefault),
      });
      setIsSheetOpen(true);
    },
    [form],
  );

  const closeSheet = useCallback(() => {
    setIsSheetOpen(false);
    setEditingAddress(null);
    form.reset(formDefaults);
  }, [form]);

  const toPayload = (values: AddressFormValues) => {
    const payload = {
      label: values.label.trim(),
      line1: values.line1.trim(),
      line2: values.line2?.trim() ?? '',
      city: values.city.trim(),
      state: values.state.trim(),
      pincode: values.pincode.trim(),
      phone: values.phone.trim(),
    };
    return payload;
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      if (editingAddress) {
        const payload = toPayload(values);
        const updated = await updateAddress(editingAddress.id, payload);
        setAddresses((current) =>
          sortAddresses(
            current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
          ),
        );
        showToast('Address updated', 'success');
      } else {
        const payload = toPayload(values);
        const created = await createAddress(
          addresses.length === 0 ? { ...payload, isDefault: true } : payload,
        );
        setAddresses((current) => sortAddresses([created, ...current.filter((item) => item.id !== created.id)]));
        showToast('Address added', 'success');
      }
      closeSheet();
    } catch (err) {
      const message = toErrorMessage(err);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleSetDefault = async (address: Address) => {
    if (address.isDefault) return;
    setPendingDefaultId(address.id);
    try {
      const updated = await setDefaultAddress(address.id);
      setAddresses((current) =>
        sortAddresses(
          current.map((item) =>
            item.id === updated.id ? { ...item, ...updated } : { ...item, isDefault: false },
          ),
        ),
      );
      showToast('Default address updated', 'success');
    } catch (err) {
      showToast(toErrorMessage(err), 'error');
    } finally {
      setPendingDefaultId(null);
    }
  };

  const handleDelete = async (address: Address) => {
    const confirmDelete = window.confirm(
      `Delete ${address.label}? This action cannot be undone.`,
    );
    if (!confirmDelete) return;
    setPendingDeleteId(address.id);
    try {
      await deleteAddress(address.id);
      setAddresses((current) => current.filter((item) => item.id !== address.id));
      showToast('Address removed', 'success');
    } catch (err) {
      showToast(toErrorMessage(err), 'error');
    } finally {
      setPendingDeleteId(null);
    }
  };

  const sortedAddresses = useMemo(() => sortAddresses(addresses), [addresses]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-lg font-semibold text-text-primary dark:text-white">Saved addresses</h3>
          <p className="text-sm text-text-secondary dark:text-text-secondary">
            Manage delivery locations for faster checkout.
          </p>
        </div>
        <Button type="button" onClick={() => openSheet(null)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" /> Add address
        </Button>
      </div>

      {status === 'loading' ? (
        <div className="space-y-3" role="status" aria-live="polite">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : null}

      {status === 'error' ? (
        <ErrorCard title="Unable to load addresses" message={error ?? 'Please try again later.'} onRetry={handleFetch} />
      ) : null}

      {status === 'success' && sortedAddresses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-borderc/40 bg-surface-1/60 p-6 text-sm text-text-secondary dark:border-borderc/40 dark:bg-surface-1/40 dark:text-text-secondary">
          <p>You have not saved any addresses yet. Add one to speed up checkout.</p>
        </div>
      ) : null}

      {status === 'success' && sortedAddresses.length > 0 ? (
        <AnimatePresence initial={false}>
          <motion.div
            layout
            className="grid gap-4"
            initial={sectionMotion.initial}
            animate={sectionMotion.animate}
          >
            {sortedAddresses.map((address) => (
              <motion.div
                key={address.id}
                layout
                className={cn(
                  'relative flex flex-col gap-3 rounded-2xl border bg-surface-1/90 p-5 shadow-sm transition hover:shadow-md dark:border-borderc/40 dark:bg-surface-1/70',
                  address.isDefault
                    ? 'border-[color:var(--brand-400)] shadow-brand dark:border-[color:var(--brand-400)]'
                    : 'border-borderc/40',
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-[color:var(--brand-500)]" aria-hidden="true" />
                    <p className="text-base font-semibold text-text-primary dark:text-white">{address.label}</p>
                  </div>
                  {address.isDefault ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                      <Star className="h-3.5 w-3.5" aria-hidden="true" /> Default
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-text-secondary dark:text-text-secondary">{formatAddress(address)}</p>
                <p className="flex items-center gap-2 text-sm text-text-secondary dark:text-text-secondary">
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  <span>{address.phone || 'Not provided'}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openSheet(address)}
                    className="flex items-center gap-2"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(address)}
                    disabled={pendingDeleteId === address.id}
                    className="flex items-center gap-2 text-rose-600 hover:text-rose-700"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    {pendingDeleteId === address.id ? 'Deleting…' : 'Delete'}
                  </Button>
                  {!address.isDefault ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSetDefault(address)}
                      disabled={pendingDefaultId === address.id}
                      className="flex items-center gap-2"
                    >
                      {pendingDefaultId === address.id ? 'Updating…' : 'Set default'}
                    </Button>
                  ) : null}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      ) : null}

      <ModalSheet open={isSheetOpen} onClose={closeSheet}>
        <div className="space-y-6 p-6">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-text-primary dark:text-white">
              {editingAddress ? 'Edit address' : 'Add address'}
            </h3>
            <p className="text-sm text-text-secondary dark:text-text-secondary">
              Provide delivery details exactly as you would like them to appear during checkout.
            </p>
          </div>
          <Form {...form}>
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="address-label">Label *</FormLabel>
                    <FormControl>
                      <Input id="address-label" placeholder="Home, Office" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="address-phone">Phone *</FormLabel>
                    <FormControl>
                      <Input id="address-phone" inputMode="tel" maxLength={10} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="line1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="address-line1">Address line 1 *</FormLabel>
                    <FormControl>
                      <Input id="address-line1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="line2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="address-line2">Address line 2</FormLabel>
                    <FormControl>
                      <Input id="address-line2" placeholder="Apartment, floor, landmark" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="address-city">City *</FormLabel>
                      <FormControl>
                        <Input id="address-city" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="address-state">State *</FormLabel>
                      <FormControl>
                        <Input id="address-state" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="pincode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="address-pincode">Pincode *</FormLabel>
                    <FormControl>
                      <Input id="address-pincode" inputMode="numeric" maxLength={6} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={closeSheet} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : editingAddress ? 'Update address' : 'Save address'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </ModalSheet>
    </div>
  );
};

export default AddressManager;
