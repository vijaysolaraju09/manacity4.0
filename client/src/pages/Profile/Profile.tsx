import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import {
  BadgeCheck,
  BriefcaseBusiness,
  Home,
  LogOut,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  getCurrentUser,
  requestBusiness,
  requestVerification,
  updateProfile,
} from '@/api/profile';
import { createZodResolver } from '@/lib/createZodResolver';
import { toErrorMessage } from '@/lib/response';
import { cn } from '@/lib/utils';
import type { AppDispatch, RootState } from '@/store';
import { logoutUser, setUser } from '@/store/slices/authSlice';
import { paths } from '@/routes/paths';
import type { User } from '@/types/user';

import styles from './Profile.module.scss';
import AddressManager from './components/AddressManager';

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
  theme: z.enum(['light', 'dark', 'system']),
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

const InfoRow = ({ icon: Icon, label, value, emptyLabel = 'Not provided' }: InfoRowProps) => (
  <div className="flex items-start gap-3 rounded-xl border border-borderc/40 bg-surface-1/80 px-4 py-3 text-sm shadow-sm backdrop-blur-sm dark:border-borderc/40 dark:bg-surface-1/40">
    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--brand-400)]/15 text-[var(--brand-600)] dark:bg-[color:var(--brand-500)]/20 dark:text-[var(--accent-400)]">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted dark:text-text-secondary">{label}</p>
      <p className="text-sm text-text-secondary dark:text-text-primary">{value || emptyLabel}</p>
    </div>
  </div>
);

const sectionMotion = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.24, ease: 'easeOut' as const },
} as const;

type StatusVariant = 'default' | 'info' | 'success' | 'warning';

const StatusBadge = ({ children, variant = 'default' }: { children: ReactNode; variant?: StatusVariant }) => {
  const variants: Record<StatusVariant, string> = {
    default:
      'border border-indigo-200/70 bg-surface-1/80 text-indigo-600 shadow-sm shadow-indigo-200/40 backdrop-blur-md dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200',
    info:
      'border border-sky-300/70 bg-sky-100/70 text-sky-700 shadow-sm shadow-sky-200/40 backdrop-blur-md dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-100',
    success:
      'border border-emerald-300/70 bg-emerald-100/70 text-emerald-700 shadow-sm shadow-emerald-200/40 backdrop-blur-md dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-100',
    warning:
      'border border-amber-300/70 bg-amber-100/70 text-amber-700 shadow-sm shadow-amber-200/40 backdrop-blur-md dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-100',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

const ProfileSkeleton = () => (
  <div className={styles.page}>
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 text-text-primary dark:text-text-primary sm:px-6 lg:grid lg:grid-cols-[360px,1fr] lg:px-8">
      <div className={cn(styles.card, 'p-6 sm:p-8')}>
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
        <div className="mt-6 flex gap-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
      <div className="space-y-6">
        <div className={cn(styles.card, 'p-6 sm:p-8')}>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
          <div className="mt-6 space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
        <div className={cn(styles.card, 'p-6 sm:p-8')}>
          <Skeleton className="h-5 w-48" />
          <div className="mt-6 space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  </div>
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
  const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'preferences'>('profile');

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

  const handleLogout = () => {
    void dispatch(logoutUser()).finally(() => {
      navigate(paths.auth.login(), { replace: true });
    });
  };

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
    const shouldShowServiceOrders = user.role === 'business' || user.isVerified;
    if (shouldShowServiceOrders) {
      const hasAction = actions.some((action) => action.path === paths.orders.service());
      if (!hasAction) {
        actions.push({ label: 'Service Orders', path: paths.orders.service() });
      }
    }
    if (actions.length === 0) {
      actions.push({ label: 'My Orders', path: paths.orders.mine() });
    }
    return actions;
  }, [user]);

  const themeLabel = useMemo(() => {
    const theme = user?.preferences?.theme ?? 'light';
    return theme ? `${theme.charAt(0).toUpperCase()}${theme.slice(1)}` : 'Light';
  }, [user?.preferences?.theme]);

  const tabs = useMemo(
    () => [
      {
        key: 'profile' as const,
        label: 'Profile',
        content: (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow icon={Phone} label="Phone" value={user?.phone} />
              <InfoRow icon={Mail} label="Email" value={user?.email ?? undefined} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow icon={BriefcaseBusiness} label="Profession" value={user?.profession} />
              <InfoRow icon={Sparkles} label="Theme preference" value={themeLabel} />
            </div>
            <div className="rounded-xl border border-borderc/40 bg-surface-1/80 p-4 text-sm leading-relaxed text-text-secondary shadow-sm dark:border-borderc/40 dark:bg-surface-1/40 dark:text-text-secondary">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--brand-500)] dark:text-[color:var(--accent-400)]">Bio</p>
              <p className="mt-2">
                {user?.bio || 'Tell customers more about you by adding a short bio.'}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: 'addresses' as const,
        label: 'Addresses',
        content: (
          <div className="space-y-4">
            <InfoRow icon={MapPin} label="Location" value={user?.location} />
            <InfoRow icon={Home} label="Address" value={user?.address} />
            <AddressManager />
          </div>
        ),
      },
      {
        key: 'preferences' as const,
        label: 'Preferences',
        content: (
          <div className="space-y-4">
            <div className="rounded-xl border border-borderc/40 bg-surface-1/80 p-4 text-sm shadow-sm dark:border-borderc/40 dark:bg-surface-1/40">
              <p className="text-sm font-semibold text-text-primary dark:text-white">Theme</p>
              <p className="mt-1 text-sm text-text-secondary dark:text-text-secondary">Currently set to {themeLabel}.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow icon={UserRoundCog} label="Role" value={user?.role} />
              <InfoRow icon={ShieldCheck} label="Verification" value={user?.verificationStatus} />
            </div>
          </div>
        ),
      },
    ],
    [themeLabel, user?.address, user?.bio, user?.email, user?.location, user?.phone, user?.profession, user?.role, user?.verificationStatus],
  );

  if (loadState === 'loading') {
    return <ProfileSkeleton />;
  }

  if (loadState === 'error') {
    return (
      <div className={styles.page}>
        <div className="mx-auto max-w-3xl px-4 pb-16 text-text-primary dark:text-text-primary sm:px-6">
          <div className={cn(styles.card, 'p-6 sm:p-8')}>
            <div className={styles.cardHeader}>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              Unable to load profile
            </div>
            <p className="text-sm leading-relaxed text-text-secondary dark:text-text-secondary">
              {error || 'Please try again in a moment.'}
            </p>
            <div className={styles.actionRow}>
              <Button onClick={() => fetchProfile()} className="flex-1 sm:flex-none">
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.page}>
        <div className="mx-auto max-w-3xl px-4 pb-16 text-text-primary dark:text-text-primary sm:px-6">
          <div className={cn(styles.card, 'p-6 sm:p-8')}>
            <div className={styles.cardHeader}>No profile information</div>
            <p className="text-sm leading-relaxed text-text-secondary dark:text-text-secondary">
              We could not find your profile details. Try refreshing the page or contact support if the issue persists.
            </p>
            <div className={styles.actionRow}>
              <Button onClick={() => fetchProfile()} className="flex-1 sm:flex-none">
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>
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

  return (
    <>
      <div className={styles.page}>
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-10 text-text-primary dark:text-text-primary sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[360px,1fr]">
            <motion.section
              initial={sectionMotion.initial}
              animate={sectionMotion.animate}
              transition={sectionMotion.transition}
              className={cn(styles.card, 'relative overflow-hidden p-6 sm:p-8')}
            >
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-[color:var(--brand-500)]/15 via-transparent to-transparent"
                aria-hidden="true"
              />
              <div className="relative space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className={styles.cardHeader}>
                    <div className={styles.avatarWrap}>
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={`${user.name}'s avatar`}
                          className="h-20 w-20 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[color:var(--brand-500)]/15 text-lg font-semibold text-[var(--brand-600)] dark:bg-[color:var(--brand-500)]/20 dark:text-[color:var(--ink-900)]">
                          <span aria-hidden="true">{initials}</span>
                          <span className="sr-only">{user.name} avatar</span>
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-500)] dark:text-[color:var(--accent-400)]">
                        <UserRoundCog className="h-4 w-4" aria-hidden="true" />
                        Profile overview
                      </p>
                      <h1 className="text-2xl font-semibold text-text-primary dark:text-white">{user.name}</h1>
                      <p className="text-sm text-text-secondary dark:text-text-secondary">
                        Manage how your information appears across Manacity.
                      </p>
                    </div>
                </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-w-[140px] justify-center text-[var(--brand-600)] hover:shadow-brand w-full sm:w-auto"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Logout
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
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
                <div className={styles.divider} />
                {quickActions.length > 0 ? (
                  <>
                    <div className={styles.divider} />
                    <div>
                      <h2 className={styles.sectionTitle}>Quick navigation</h2>
                      <div className="flex flex-wrap gap-2">
                        {quickActions.map((action) => (
                          <Button
                            key={action.label}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg border-borderc/40 bg-surface-1/80 text-text-secondary transition hover:border-[color:var(--brand-400)] hover:text-[color:var(--brand-600)] dark:border-borderc/40 dark:bg-surface-1/40 dark:text-text-secondary dark:hover:border-[color:var(--accent-500)] dark:hover:text-[color:var(--accent-400)]"
                            onClick={() => navigate(action.path)}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}
                <div className={styles.divider} />
                <div className={styles.actionRow}>
                  <Button className="flex-1 sm:flex-none" onClick={() => setIsEditOpen(true)}>
                    Edit profile
                  </Button>
                  <Button
                    className="flex-1 sm:flex-none"
                    disabled={businessDisabled}
                    onClick={() => setIsBusinessOpen(true)}
                  >
                    {businessButtonLabel}
                  </Button>
                  <Button
                    className="flex-1 sm:flex-none"
                    disabled={verificationDisabled}
                    onClick={() => setIsVerifyOpen(true)}
                  >
                    {verificationButtonLabel}
                  </Button>
                </div>
              </div>
            </motion.section>
            <motion.section
              initial={sectionMotion.initial}
              animate={sectionMotion.animate}
              transition={{ ...sectionMotion.transition, delay: 0.08 }}
              className="space-y-6"
            >
              <div className={cn(styles.card, 'p-6 sm:p-8')}>
                <div>
                  <h2 className="text-xl font-semibold text-text-primary dark:text-white">Account dashboard</h2>
                  <p className="mt-2 text-sm text-text-secondary dark:text-text-secondary">
                    Review your profile details, saved addresses and personal preferences.
                  </p>
                </div>
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="mt-6">
                  <TabsList className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-3">
                    {tabs.map((tab) => (
                      <TabsTrigger key={tab.key} value={tab.key} className="w-full">
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <AnimatePresence mode="wait">
                    {tabs.map((tab) => (
                      <TabsContent key={tab.key} value={tab.key} forceMount>
                        {activeTab === tab.key ? (
                          <motion.div
                            key={tab.key}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="space-y-4"
                          >
                            {tab.content}
                          </motion.div>
                        ) : null}
                      </TabsContent>
                    ))}
                  </AnimatePresence>
                </Tabs>
              </div>
              <div className={cn(styles.card, 'p-6 sm:p-8')}>
                <h3 className={styles.sectionTitle}>Helpful tips</h3>
                <p className="text-sm leading-relaxed text-text-secondary dark:text-text-secondary">
                  Set shopping preferences, notification alerts and privacy controls. More controls are on the way.
                </p>
              </div>
            </motion.section>
          </div>
        </div>
      </div>

      <ModalSheet open={isEditOpen} onClose={() => setIsEditOpen(false)}>
        <div className="space-y-6 p-6">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-text-primary dark:text-white">Edit profile</h3>
            <p className="text-sm text-text-secondary dark:text-text-secondary">
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
                        <option value="system">System</option>
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
            <h3 className="text-lg font-semibold text-text-primary dark:text-white">Request verification</h3>
            <p className="text-sm text-text-secondary dark:text-text-secondary">
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
                    <p className="text-xs text-text-muted dark:text-text-secondary">
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
            <h3 className="text-lg font-semibold text-text-primary dark:text-white">Request business account</h3>
            <p className="text-sm text-text-secondary dark:text-text-secondary">
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
    </>
  );
};

export default Profile;
