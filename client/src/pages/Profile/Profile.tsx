import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import {
  BadgeCheck,
  BriefcaseBusiness,
  Home,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  UserRoundCog,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import ModalSheet from '@/components/base/ModalSheet';
import showToast from '@/components/ui/Toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from '@/components/ui/form';
import type { SubmitHandler } from 'react-hook-form';
import Input from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  getCurrentUser,
  requestBusiness,
  requestVerification,
  updateProfile,
} from '@/api/profile';
import { toErrorMessage } from '@/lib/response';
import { createZodResolver } from '@/lib/createZodResolver';
import type { AppDispatch, RootState } from '@/store';
import { setUser } from '@/store/slices/authSlice';
import { paths } from '@/routes/paths';
import type { User } from '@/types/user';

import './Profile.scss';

const editProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(80, 'Name must be 80 characters or less'),
  email: z
    .string()
    .trim()
    .refine((value) => !value || /\S+@\S+\.\S+/.test(value), {
      message: 'Enter a valid email address',
    })
    .optional(),
  location: z.string().trim().max(120, 'Location must be 120 characters or less').optional(),
  address: z.string().trim().max(120, 'Address must be 120 characters or less').optional(),
  profession: z.string().trim().max(120, 'Profession must be 120 characters or less').optional(),
  bio: z
    .string()
    .trim()
    .max(500, 'Bio must be 500 characters or less')
    .optional(),
  avatarUrl: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^https?:\/\//i.test(value), {
      message: 'Enter a valid URL',
    }),
  theme: z.enum(['light', 'dark', 'colored']),
});

const verificationSchema = z.object({
  profession: z.string().trim().min(1, 'Profession is required'),
  bio: z
    .string()
    .trim()
    .max(500, 'Bio must be 500 characters or less')
    .optional(),
  portfolio: z
    .string()
    .trim()
    .refine(
      (value) =>
        !value ||
        value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
          .every((item) => /^https?:\/\//i.test(item)),
      {
        message: 'Portfolio URLs must be valid links separated by commas',
      },
    )
    .optional(),
});

const businessSchema = z.object({
  name: z.string().trim().min(1, 'Business name is required'),
  category: z.string().trim().min(1, 'Category is required'),
  location: z.string().trim().min(1, 'Location is required'),
  address: z.string().trim().min(1, 'Address is required'),
  description: z.string().trim().min(1, 'Description is required'),
  image: z
    .string()
    .trim()
    .min(1, 'Image URL is required')
    .refine((value) => /^https?:\/\//i.test(value), {
      message: 'Enter a valid URL',
    }),
});

type EditProfileFormValues = z.infer<typeof editProfileSchema>;
type VerificationFormValues = z.infer<typeof verificationSchema>;
type BusinessFormValues = z.infer<typeof businessSchema>;

type LoadState = 'idle' | 'loading' | 'success' | 'error';

interface InfoRowProps {
  icon: LucideIcon;
  label: string;
  value?: ReactNode;
  emptyLabel?: string;
}

const pageBackgroundStyle: CSSProperties = {
  background:
    'radial-gradient(120% 120% at 0% 0%, rgba(26,115,232,0.12), transparent 55%), radial-gradient(120% 120% at 100% 0%, rgba(26,115,232,0.08), transparent 60%), var(--color-bg)',
};

const heroCardStyle: CSSProperties = {
  background:
    'linear-gradient(130deg, rgba(26,115,232,0.16), rgba(26,115,232,0.06) 45%, rgba(255,255,255,0.98))',
  boxShadow: 'var(--shadow-lg)',
  color: 'var(--color-text)',
};

const bioCardStyle: CSSProperties = {
  background:
    'linear-gradient(135deg, rgba(26,115,232,0.12), rgba(26,115,232,0.04) 55%, var(--color-surface))',
  border: '1px solid rgba(26, 115, 232, 0.18)',
  boxShadow: 'var(--shadow-sm)',
};

const infoRowStyle: CSSProperties = {
  background:
    'linear-gradient(135deg, rgba(26, 115, 232, 0.14), rgba(26, 115, 232, 0.05) 55%, var(--color-surface))',
  border: '1px solid rgba(26, 115, 232, 0.18)',
  boxShadow: 'var(--shadow-sm)',
};

const InfoRow = ({ icon: Icon, label, value, emptyLabel = 'Not provided' }: InfoRowProps) => (
  <div className="flex items-start gap-3 rounded-2xl p-4 text-sm backdrop-blur-sm" style={infoRowStyle}>
    <Icon className="mt-1 h-5 w-5 text-[rgba(26,115,232,0.7)]" aria-hidden="true" />
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-[rgba(26,115,232,0.85)]">
        {label}
      </p>
      <p className="text-sm text-[var(--color-text)]">{value || emptyLabel}</p>
    </div>
  </div>
);

type StatusVariant = 'default' | 'info' | 'success' | 'warning';

const StatusBadge = ({ children, variant = 'default' }: { children: ReactNode; variant?: StatusVariant }) => {
  const variants: Record<StatusVariant, string> = {
    default:
      'bg-[rgba(26,115,232,0.08)] text-[var(--color-text)] shadow-sm backdrop-blur-sm border border-[rgba(26,115,232,0.18)]',
    info: 'bg-[rgba(26,115,232,0.12)] text-[rgba(26,115,232,0.9)] shadow-sm border border-[rgba(26,115,232,0.24)]',
    success:
      'bg-[rgba(34,197,94,0.12)] text-[rgba(22,163,74,0.95)] shadow-sm border border-[rgba(22,163,74,0.24)]',
    warning:
      'bg-[rgba(245,158,11,0.12)] text-[rgba(217,119,6,0.95)] shadow-sm border border-[rgba(217,119,6,0.24)]',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

const ProfileSkeleton = () => (
  <main className="profile-page profile-page--loading">
    <div className="profile-page__container mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <Skeleton className="h-56 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  </main>
);

const Profile = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const storedUser = useSelector((state: RootState) => state.auth.user);

  const [profile, setProfile] = useState<User | null>(storedUser);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [isBusinessOpen, setIsBusinessOpen] = useState(false);

  const editForm = useForm<EditProfileFormValues>({
    resolver: createZodResolver(editProfileSchema),
    defaultValues: {
      name: storedUser?.name ?? '',
      email: storedUser?.email ?? '',
      location: storedUser?.location ?? '',
      address: storedUser?.address ?? '',
      profession: storedUser?.profession ?? '',
      bio: storedUser?.bio ?? '',
      avatarUrl: storedUser?.avatarUrl ?? '',
      theme: storedUser?.preferences?.theme ?? 'light',
    },
  });

  const verificationForm = useForm<VerificationFormValues>({
    resolver: createZodResolver(verificationSchema),
    defaultValues: {
      profession: storedUser?.profession ?? '',
      bio: storedUser?.bio ?? '',
      portfolio: '',
    },
  });

  const businessForm = useForm<BusinessFormValues>({
    resolver: createZodResolver(businessSchema),
    defaultValues: {
      name: '',
      category: '',
      location: storedUser?.location ?? '',
      address: storedUser?.address ?? '',
      description: '',
      image: '',
    },
  });

  const fetchProfile = useCallback(async () => {
    setLoadState('loading');
    setError(null);
    try {
      const data = await getCurrentUser();
      setProfile(data);
      dispatch(setUser(data));
      setLoadState('success');
    } catch (err) {
      setError(toErrorMessage(err));
      setLoadState('error');
    }
  }, [dispatch]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!profile) return;
    editForm.reset({
      name: profile.name,
      email: profile.email ?? '',
      location: profile.location ?? '',
      address: profile.address ?? '',
      profession: profile.profession ?? '',
      bio: profile.bio ?? '',
      avatarUrl: profile.avatarUrl ?? '',
      theme: profile.preferences?.theme ?? 'light',
    });
    verificationForm.reset({
      profession: profile.profession ?? '',
      bio: profile.bio ?? '',
      portfolio: '',
    });
    businessForm.reset({
      name: '',
      category: '',
      location: profile.location ?? '',
      address: profile.address ?? '',
      description: '',
      image: '',
    });
  }, [profile, editForm, verificationForm, businessForm]);

  const refreshSilently = useCallback(async () => {
    try {
      const data = await getCurrentUser();
      setProfile(data);
      dispatch(setUser(data));
    } catch (err) {
      // Surface the error but avoid breaking the current view.
      showToast(toErrorMessage(err), 'error');
    }
  }, [dispatch]);

  const handleEditSubmit: SubmitHandler<EditProfileFormValues> = async (values) => {
    try {
      await updateProfile({
        name: values.name.trim(),
        email: values.email?.trim() || undefined,
        location: values.location?.trim(),
        address: values.address?.trim(),
        profession: values.profession?.trim(),
        bio: values.bio?.trim(),
        avatarUrl: values.avatarUrl?.trim(),
        preferences: { theme: values.theme },
      });
      await refreshSilently();
      showToast('Profile updated successfully', 'success');
      setIsEditOpen(false);
    } catch (err) {
      showToast(toErrorMessage(err), 'error');
    }
  };

  const handleVerificationSubmit: SubmitHandler<VerificationFormValues> = async (values) => {
    const profession = typeof values.profession === 'string' ? values.profession : '';
    const bio = typeof values.bio === 'string' ? values.bio : undefined;
    const portfolioSource = typeof values.portfolio === 'string' ? values.portfolio : undefined;

    const portfolio = portfolioSource
      ? portfolioSource
          .split(',')
          .map((entry: string) => entry.trim())
          .filter(Boolean)
      : undefined;

    try {
      await requestVerification({
        profession: profession.trim(),
        bio: bio?.trim() || undefined,
        portfolio,
      });
      await refreshSilently();
      showToast('Verification request submitted', 'success');
      setIsVerifyOpen(false);
    } catch (err) {
      showToast(toErrorMessage(err), 'error');
    }
  };

  const handleBusinessSubmit: SubmitHandler<BusinessFormValues> = async (values) => {
    try {
      await requestBusiness({
        name: values.name.trim(),
        category: values.category.trim(),
        location: values.location.trim(),
        address: values.address.trim(),
        description: values.description.trim(),
        image: values.image.trim(),
      });
      await refreshSilently();
      showToast('Business request submitted', 'success');
      setIsBusinessOpen(false);
    } catch (err) {
      showToast(toErrorMessage(err), 'error');
    }
  };

  const user = profile;

  const initials = useMemo(() => {
    if (!user?.name) return '';
    return user.name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [user?.name]);

  const quickActions = useMemo(() => {
    if (!user) return [] as { label: string; path: string }[];
    const actions: { label: string; path: string }[] = [];
    if (user.role === 'business') {
      actions.push(
        { label: 'Manage Products', path: paths.manageProducts() },
        { label: 'Received Orders', path: paths.orders.received() },
      );
    }
    if (user.isVerified) {
      actions.push({ label: 'Service Orders', path: paths.orders.service() });
    }
    if (actions.length === 0) {
      actions.push({ label: 'My Orders', path: paths.orders.mine() });
    }
    return actions;
  }, [user]);

  if (loadState === 'loading') {
    return <ProfileSkeleton />;
  }

  if (loadState === 'error') {
    return (
      <main className="profile-page profile-page--error min-h-screen" style={pageBackgroundStyle}>
        <div className="profile-page__container mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          <Card className="profile-page__hero-card overflow-hidden border border-transparent" style={heroCardStyle}>
            <CardContent className="flex flex-col items-start gap-4 p-8 text-left">
              <CardTitle className="flex items-center gap-2 text-xl text-[var(--color-text)]">
                <ShieldCheck className="h-6 w-6 text-red-500" aria-hidden="true" />
                Unable to load profile
              </CardTitle>
                  <CardDescription className="text-base text-[var(--color-muted)]">
                {error || 'Please try again in a moment.'}
              </CardDescription>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => fetchProfile()} className="rounded-full px-6">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="profile-page profile-page--empty min-h-screen" style={pageBackgroundStyle}>
        <div className="profile-page__container mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          <Card className="profile-page__hero-card overflow-hidden border border-transparent" style={heroCardStyle}>
            <CardContent className="flex flex-col items-start gap-4 p-8 text-left">
              <CardTitle className="text-xl text-[var(--color-text)]">No profile information</CardTitle>
              <CardDescription className="text-base text-[var(--color-muted)]">
                We could not find your profile details. Try refreshing the page or contact support if the issue persists.
              </CardDescription>
              <Button onClick={() => fetchProfile()} className="rounded-full px-6">
                Refresh
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const businessDisabled = user.role === 'business' || user.businessStatus === 'pending';
  const verificationDisabled = user.verificationStatus === 'approved';
  const businessButtonLabel = user.role === 'business'
    ? 'Business account active'
    : user.businessStatus === 'pending'
      ? 'Business request pending'
      : 'Request business';
  const verificationButtonLabel = verificationDisabled ? 'Verified' : 'Request verification';
  const themeLabel = user.preferences?.theme
    ? `${user.preferences.theme.charAt(0).toUpperCase()}${user.preferences.theme.slice(1)}`
    : 'Light';

  return (
    <main className="profile-page min-h-screen" style={pageBackgroundStyle}>
      <div className="profile-page__container mx-auto max-w-4xl space-y-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <Card className="profile-page__hero-card overflow-hidden border border-transparent" style={heroCardStyle}>
          <CardHeader
            className="border-none pb-0"
            style={{
              background: 'linear-gradient(120deg, rgba(26,115,232,0.1), transparent 70%)',
            }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={`${user.name}'s avatar`}
                    className="h-20 w-20 rounded-full object-cover ring-4 ring-[rgba(26,115,232,0.2)]"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[rgba(26,115,232,0.12)] text-xl font-semibold text-[rgba(26,115,232,0.95)] ring-4 ring-[rgba(26,115,232,0.2)]">
                    <span aria-hidden="true">{initials}</span>
                    <span className="sr-only">{user.name} avatar</span>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[rgba(26,115,232,0.9)]">
                    <UserRoundCog className="h-4 w-4" aria-hidden="true" />
                    <span>Profile overview</span>
                  </div>
                  <CardTitle className="text-2xl font-semibold text-[var(--color-text)]">
                    {user.name}
                  </CardTitle>
                  <CardDescription className="max-w-md text-base text-[var(--color-muted)]">
                    Manage how your information appears across Manacity.
                  </CardDescription>
                  <div className="flex flex-wrap gap-2 text-sm text-[var(--color-muted)]">
                    <span className="inline-flex items-center gap-2">
                      <Phone className="h-4 w-4" aria-hidden="true" />
                      {user.phone}
                    </span>
                    {user.email ? (
                      <span className="inline-flex items-center gap-2">
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        {user.email}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <div className="flex flex-wrap justify-end gap-2">
                  <StatusBadge>
                    <UserRound className="h-4 w-4" aria-hidden="true" /> {user.role}
                  </StatusBadge>
                  {user.verificationStatus !== 'none' ? (
                    <StatusBadge variant={user.verificationStatus === 'approved' ? 'success' : 'info'}>
                      <BadgeCheck className="h-4 w-4" aria-hidden="true" /> {user.verificationStatus}
                    </StatusBadge>
                  ) : null}
                  {user.businessStatus && user.businessStatus !== 'none' ? (
                    <StatusBadge variant={user.businessStatus === 'approved' ? 'success' : 'warning'}>
                      <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" /> {user.businessStatus}
                    </StatusBadge>
                  ) : null}
                </div>
                {quickActions.length > 0 ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    {quickActions.map((action) => (
                      <Button
                        key={action.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full border-[rgba(26,115,232,0.24)] text-[rgba(26,115,232,0.95)] transition hover:border-[rgba(26,115,232,0.45)] hover:bg-[rgba(26,115,232,0.08)] hover:text-[rgba(26,115,232,1)]"
                        onClick={() => navigate(action.path)}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="profile-page__details space-y-6">
            <div className="profile-page__detail-grid grid gap-4 sm:grid-cols-2">
              <InfoRow icon={Phone} label="Phone" value={user.phone} />
              <InfoRow icon={Mail} label="Email" value={user.email ?? undefined} />
            </div>
            <div className="profile-page__detail-grid grid gap-4 sm:grid-cols-2">
              <InfoRow icon={BriefcaseBusiness} label="Profession" value={user.profession} />
              <InfoRow icon={Sparkles} label="Theme preference" value={themeLabel} />
            </div>
            <div className="profile-page__detail-grid grid gap-4 sm:grid-cols-2">
              <InfoRow icon={MapPin} label="Location" value={user.location} />
              <InfoRow icon={Home} label="Address" value={user.address} />
            </div>
            <div className="rounded-2xl p-5 shadow-sm backdrop-blur-sm" style={bioCardStyle}>
              <p className="text-xs font-semibold uppercase tracking-wide text-[rgba(26,115,232,0.85)]">Bio</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-text)]">
                {user.bio || 'Tell customers more about you by adding a short bio.'}
              </p>
            </div>
          </CardContent>
          <CardFooter
            className="profile-page__actions flex flex-col gap-3 sm:flex-row sm:justify-end"
            style={{
              borderTop: '1px solid rgba(26, 115, 232, 0.18)',
              background: 'linear-gradient(120deg, rgba(26,115,232,0.08), transparent 70%)',
            }}
          >
            <Button type="button" className="w-full rounded-full px-6 font-semibold sm:w-auto" onClick={() => setIsEditOpen(true)}>
              Edit profile
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full rounded-full px-6 font-semibold sm:w-auto"
              disabled={businessDisabled}
              onClick={() => setIsBusinessOpen(true)}
            >
              {businessButtonLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full px-6 font-semibold sm:w-auto border-[rgba(26,115,232,0.24)] text-[rgba(26,115,232,0.95)] hover:border-[rgba(26,115,232,0.45)] hover:bg-[rgba(26,115,232,0.08)]"
              disabled={verificationDisabled}
              onClick={() => setIsVerifyOpen(true)}
            >
              {verificationButtonLabel}
            </Button>
          </CardFooter>
        </Card>

      <ModalSheet open={isEditOpen} onClose={() => setIsEditOpen(false)}>
        <div className="space-y-6 p-6">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[var(--color-text)]">Edit profile</h3>
            <p className="text-sm text-[var(--color-muted)]">
              Update your profile details. Fields marked with an asterisk are required.
            </p>
          </div>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(handleEditSubmit)}
              className="space-y-4"
              aria-label="Edit profile form"
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel htmlFor="edit-name">Full name *</FormLabel>
                    <FormControl>
                      <Input id="edit-name" {...field} />
                    </FormControl>
                    {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="email"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel htmlFor="edit-email">Email</FormLabel>
                    <FormControl>
                      <Input id="edit-email" type="email" {...field} />
                    </FormControl>
                    {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="location"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel htmlFor="edit-location">Location</FormLabel>
                    <FormControl>
                      <Input id="edit-location" {...field} />
                    </FormControl>
                    {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="address"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel htmlFor="edit-address">Address</FormLabel>
                    <FormControl>
                      <Input id="edit-address" {...field} />
                    </FormControl>
                    {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="profession"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel htmlFor="edit-profession">Profession</FormLabel>
                    <FormControl>
                      <Input id="edit-profession" {...field} />
                    </FormControl>
                    {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="bio"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel htmlFor="edit-bio">Bio</FormLabel>
                    <FormControl>
                      <Textarea id="edit-bio" {...field} />
                    </FormControl>
                    {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="theme"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel htmlFor="edit-theme">Theme</FormLabel>
                    <FormControl>
                      <Select id="edit-theme" {...field}>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="colored">Colored</option>
                      </Select>
                    </FormControl>
                    {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="avatarUrl"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel htmlFor="edit-avatar">Avatar URL</FormLabel>
                    <FormControl>
                      <Input id="edit-avatar" placeholder="https://" {...field} />
                    </FormControl>
                    {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
                  </FormItem>
                )}
              />
              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full rounded-full sm:w-auto"
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-full rounded-full sm:w-auto"
                  disabled={editForm.formState.isSubmitting}
                >
                  {editForm.formState.isSubmitting ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </ModalSheet>

      <ModalSheet open={isVerifyOpen} onClose={() => setIsVerifyOpen(false)}>
        <div className="space-y-6 p-6">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[var(--color-text)]">Request verification</h3>
            <p className="text-sm text-[var(--color-muted)]">
              Provide details that help us confirm your professional credentials.
            </p>
          </div>
          <Form {...verificationForm}>
            <form
              onSubmit={verificationForm.handleSubmit(handleVerificationSubmit)}
              className="space-y-4"
              aria-label="Verification request form"
            >
              <FormField
                control={verificationForm.control}
                name="profession"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel htmlFor="verify-profession">Profession *</FormLabel>
                    <FormControl>
                      <Input id="verify-profession" {...field} />
                    </FormControl>
                    {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
                  </FormItem>
                )}
              />
              <FormField
                control={verificationForm.control}
                name="bio"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel htmlFor="verify-bio">Bio</FormLabel>
                    <FormControl>
                      <Textarea id="verify-bio" {...field} />
                    </FormControl>
                    {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
                  </FormItem>
                )}
              />
              <FormField
                control={verificationForm.control}
                name="portfolio"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel htmlFor="verify-portfolio">Portfolio URLs</FormLabel>
                    <FormControl>
                      <Textarea
                        id="verify-portfolio"
                        placeholder="https://portfolio-one.com, https://dribbble.com/you"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-[var(--color-muted)]">
                      Separate multiple links with commas.
                    </p>
                    {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
                  </FormItem>
                )}
              />
              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full rounded-full sm:w-auto"
                  onClick={() => setIsVerifyOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-full rounded-full sm:w-auto"
                  disabled={verificationForm.formState.isSubmitting}
                >
                  {verificationForm.formState.isSubmitting ? 'Submitting...' : 'Submit request'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </ModalSheet>

      <ModalSheet open={isBusinessOpen} onClose={() => setIsBusinessOpen(false)}>
        <div className="space-y-6 p-6">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[var(--color-text)]">Request business account</h3>
            <p className="text-sm text-[var(--color-muted)]">
              Tell us about your business to start selling on Manacity.
            </p>
          </div>
          <Form {...businessForm}>
            <form
              onSubmit={businessForm.handleSubmit(handleBusinessSubmit)}
              className="space-y-4"
              aria-label="Business request form"
            >
              <FormField
                control={businessForm.control}
                name="name"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel htmlFor="business-name">Business name *</FormLabel>
                    <FormControl>
                      <Input id="business-name" {...field} />
                    </FormControl>
                    {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
                  </FormItem>
                )}
              />
              <FormField
                control={businessForm.control}
                name="category"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel htmlFor="business-category">Category *</FormLabel>
                    <FormControl>
                      <Input id="business-category" {...field} />
                    </FormControl>
                    {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
                  </FormItem>
                )}
              />
              <FormField
                control={businessForm.control}
                name="location"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel htmlFor="business-location">Location *</FormLabel>
                    <FormControl>
                      <Input id="business-location" {...field} />
                    </FormControl>
                    {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
                  </FormItem>
                )}
              />
              <FormField
                control={businessForm.control}
                name="address"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel htmlFor="business-address">Address *</FormLabel>
                    <FormControl>
                      <Input id="business-address" {...field} />
                    </FormControl>
                    {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
                  </FormItem>
                )}
              />
              <FormField
                control={businessForm.control}
                name="description"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel htmlFor="business-description">Description *</FormLabel>
                    <FormControl>
                      <Textarea id="business-description" {...field} />
                    </FormControl>
                    {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
                  </FormItem>
                )}
              />
              <FormField
                control={businessForm.control}
                name="image"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel htmlFor="business-image">Cover image URL *</FormLabel>
                    <FormControl>
                      <Input id="business-image" placeholder="https://" {...field} />
                    </FormControl>
                    {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
                  </FormItem>
                )}
              />
              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full rounded-full sm:w-auto"
                  onClick={() => setIsBusinessOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-full rounded-full sm:w-auto"
                  disabled={businessForm.formState.isSubmitting}
                >
                  {businessForm.formState.isSubmitting ? 'Submitting...' : 'Submit request'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </ModalSheet>
    </div>
  </main>
  );
};

export default Profile;
