import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { createZodResolver } from '@/lib/createZodResolver';
import { toErrorMessage } from '@/lib/response';
import { cn } from '@/lib/utils';
import type { AppDispatch, RootState } from '@/store';
import { setUser } from '@/store/slices/authSlice';
import { paths } from '@/routes/paths';
import type { User } from '@/types/user';

import styles from '@/styles/PageShell.module.scss';

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

const InfoRow = ({ icon: Icon, label, value, emptyLabel = 'Not provided' }: InfoRowProps) => (
  <div className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white/90 p-4 text-sm shadow-md shadow-slate-200/60 backdrop-blur-md transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-slate-900/60">
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/15 via-sky-500/10 to-transparent text-indigo-500 dark:text-indigo-300">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-300">{label}</p>
      <p className="text-sm text-slate-700 dark:text-slate-200">{value || emptyLabel}</p>
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
      'border border-indigo-200/70 bg-white/80 text-indigo-600 shadow-sm shadow-indigo-200/40 backdrop-blur-md dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200',
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
  <main className={cn(styles.pageShell, 'bg-transparent text-slate-900 dark:text-slate-100')}>
    <div className={cn(styles.pageShell__inner, 'mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[320px,1fr] lg:px-8')}>
      <Skeleton className="h-80 w-full rounded-3xl border border-slate-200/70 bg-white/80 shadow-xl dark:border-slate-800/80 dark:bg-slate-900/70" />
      <div className="space-y-4">
        <Skeleton className="h-36 w-full rounded-3xl border border-slate-200/70 bg-white/80 shadow-xl dark:border-slate-800/80 dark:bg-slate-900/70" />
        <Skeleton className="h-36 w-full rounded-3xl border border-slate-200/70 bg-white/80 shadow-xl dark:border-slate-800/80 dark:bg-slate-900/70" />
      </div>
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
            <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-md shadow-slate-200/60 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-slate-950/40">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-300">Bio</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
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
            <div className="rounded-3xl border border-dashed border-indigo-200 bg-indigo-500/5 p-6 text-sm text-slate-600 shadow-md dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-slate-200">
              Add multiple delivery addresses and pin favourite locations. This feature is coming soon.
            </div>
          </div>
        ),
      },
      {
        key: 'preferences' as const,
        label: 'Preferences',
        content: (
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-md shadow-slate-200/60 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-slate-950/40">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Theme</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">Currently set to {themeLabel}.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow icon={UserRoundCog} label="Role" value={user?.role} />
              <InfoRow icon={ShieldCheck} label="Verification" value={user?.verificationStatus} />
            </div>
            <div className="rounded-3xl border border-slate-200/70 bg-gradient-to-br from-indigo-500/10 via-sky-500/10 to-white/70 p-6 shadow-md shadow-slate-200/60 dark:border-slate-700/70 dark:bg-gradient-to-br dark:from-slate-900 dark:via-indigo-900/40 dark:to-slate-900">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Personalised tips</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Set shopping preferences, notification alerts and privacy controls. More controls are on the way.
              </p>
            </div>
          </div>
        ),
      },
    ],
    [themeLabel, user?.address, user?.bio, user?.email, user?.location, user?.phone, user?.profession, user?.role, user?.verificationStatus],
  );

  const activeTabContent = useMemo(() => tabs.find((tab) => tab.key === activeTab)?.content, [activeTab, tabs]);

  if (loadState === 'loading') {
    return <ProfileSkeleton />;
  }

  if (loadState === 'error') {
    return (
      <main className={cn(styles.pageShell, 'bg-transparent text-slate-900 dark:text-slate-100')}>
        <div className={cn(styles.pageShell__inner, 'mx-auto max-w-4xl px-4 pb-20 pt-10 sm:px-6 lg:px-8')}>
          <Card className="rounded-3xl border border-slate-200/80 bg-white/90 shadow-2xl shadow-slate-200/70 backdrop-blur-md dark:border-slate-800/70 dark:bg-slate-900/70 dark:shadow-slate-950/40">
            <CardContent className="flex flex-col gap-5 p-8 text-left">
              <CardTitle className="flex items-center gap-3 text-2xl font-semibold text-slate-900 dark:text-white">
                <ShieldCheck className="h-6 w-6 text-rose-500" aria-hidden="true" />
                Unable to load profile
              </CardTitle>
              <CardDescription className="text-base text-slate-600 dark:text-slate-300">
                {error || 'Please try again in a moment.'}
              </CardDescription>
              <div>
                <Button onClick={() => fetchProfile()} className="rounded-full px-6 py-2 text-sm font-semibold">
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
      <main className={cn(styles.pageShell, 'bg-transparent text-slate-900 dark:text-slate-100')}>
        <div className={cn(styles.pageShell__inner, 'mx-auto max-w-4xl px-4 pb-20 pt-10 sm:px-6 lg:px-8')}>
          <Card className="rounded-3xl border border-slate-200/80 bg-white/90 shadow-2xl shadow-slate-200/70 backdrop-blur-md dark:border-slate-800/70 dark:bg-slate-900/70 dark:shadow-slate-950/40">
            <CardContent className="flex flex-col gap-5 p-8 text-left">
              <CardTitle className="text-2xl font-semibold text-slate-900 dark:text-white">No profile information</CardTitle>
              <CardDescription className="text-base text-slate-600 dark:text-slate-300">
                We could not find your profile details. Try refreshing the page or contact support if the issue persists.
              </CardDescription>
              <Button onClick={() => fetchProfile()} className="w-full rounded-full px-6 py-3 text-sm font-semibold sm:w-auto">
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
    <>
      <main className={cn(styles.pageShell, 'bg-transparent text-slate-900 dark:text-slate-100')}>
        <div className={cn(styles.pageShell__inner, 'mx-auto max-w-6xl px-4 pb-28 pt-10 sm:px-6 lg:px-8')}>
          <div className="grid gap-8 lg:grid-cols-[320px,1fr]">
          <motion.section
            initial={sectionMotion.initial}
            animate={sectionMotion.animate}
            transition={sectionMotion.transition}
            className="space-y-6"
          >
            <Card className="relative overflow-hidden rounded-3xl border border-indigo-200/60 bg-white/90 shadow-2xl shadow-indigo-200/40 backdrop-blur-xl dark:border-indigo-500/30 dark:bg-slate-950/70 dark:shadow-indigo-900/40">
              <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500/15 via-sky-500/15 to-transparent" aria-hidden="true" />
              <CardHeader className="relative space-y-6 border-none p-8">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={`${user.name}'s avatar`}
                        className="h-24 w-24 rounded-2xl border-4 border-white/80 object-cover shadow-xl dark:border-slate-900/70"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 via-sky-500/20 to-transparent text-2xl font-semibold text-indigo-600 shadow-xl dark:text-indigo-200">
                        <span aria-hidden="true">{initials}</span>
                        <span className="sr-only">{user.name} avatar</span>
                      </div>
                    )}
                    <div className="space-y-3">
                      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500 dark:text-indigo-300">
                        <UserRoundCog className="h-4 w-4" aria-hidden="true" />
                        Profile overview
                      </div>
                      <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white md:text-3xl">
                        {user.name}
                      </CardTitle>
                      <CardDescription className="max-w-md text-sm text-slate-600 dark:text-slate-300 md:text-base">
                        Manage how your information appears across Manacity.
                      </CardDescription>
                      <div className="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
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
                </div>
              </CardHeader>
              <CardContent className="space-y-6 px-8 pb-8 pt-0">
                {quickActions.length > 0 ? (
                  <div className="rounded-2xl border border-indigo-200/60 bg-white/70 p-4 shadow-md shadow-indigo-200/30 backdrop-blur-md dark:border-indigo-500/30 dark:bg-slate-900/70 dark:shadow-indigo-900/30">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500 dark:text-indigo-300">
                      Quick navigation
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {quickActions.map((action) => (
                        <Button
                          key={action.label}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full border-indigo-200/80 bg-white/70 text-indigo-600 shadow-sm hover:border-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-700 dark:border-indigo-500/40 dark:bg-slate-900/80 dark:text-indigo-200 dark:hover:bg-indigo-500/20"
                          onClick={() => navigate(action.path)}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="rounded-2xl border border-indigo-100/60 bg-gradient-to-r from-indigo-500/10 via-transparent to-transparent p-5 text-sm text-slate-600 shadow-md shadow-indigo-200/40 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-slate-200">
                  Keep your profile complete to get personalised recommendations and quicker approvals for business features.
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 rounded-b-3xl border-t border-indigo-200/60 bg-gradient-to-r from-indigo-500/15 via-transparent to-transparent p-6 sm:flex-row sm:flex-wrap">
                <Button className="w-full rounded-full px-6 py-2 font-semibold sm:flex-1" onClick={() => setIsEditOpen(true)}>
                  Edit profile
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full rounded-full px-6 py-2 font-semibold sm:flex-1"
                  disabled={businessDisabled}
                  onClick={() => setIsBusinessOpen(true)}
                >
                  {businessButtonLabel}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-full px-6 py-2 font-semibold text-indigo-600 hover:bg-indigo-500/10 dark:border-indigo-500/40 dark:text-indigo-200 dark:hover:bg-indigo-500/20 sm:flex-1"
                  disabled={verificationDisabled}
                  onClick={() => setIsVerifyOpen(true)}
                >
                  {verificationButtonLabel}
                </Button>
              </CardFooter>
            </Card>
          </motion.section>
          <motion.section
            initial={sectionMotion.initial}
            animate={sectionMotion.animate}
            transition={{ ...sectionMotion.transition, delay: 0.08 }}
            className="space-y-6"
          >
            <Card className="rounded-3xl border border-slate-200/70 bg-white/90 shadow-2xl shadow-slate-200/60 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-900/70 dark:shadow-slate-950/40">
              <CardHeader className="space-y-6 border-none p-8">
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white md:text-3xl">
                    Account dashboard
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-600 dark:text-slate-300 md:text-base">
                    Review your profile details, saved addresses and personal preferences.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2 rounded-full border border-slate-200/60 bg-white/70 p-1 dark:border-slate-700/70 dark:bg-slate-900/60">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        'rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500',
                        activeTab === tab.key
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-400/40 dark:bg-indigo-500 dark:shadow-indigo-900/50'
                          : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800',
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="px-8 pb-10">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="space-y-6"
                >
                  {activeTabContent}
                </motion.div>
              </CardContent>
            </Card>
          </motion.section>
          </div>
        </div>
      </main>

      <ModalSheet open={isEditOpen} onClose={() => setIsEditOpen(false)}>
        <div className="space-y-6 p-6">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Edit profile</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
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
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Request verification</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
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
                    <p className="text-xs text-slate-500 dark:text-slate-300">
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
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Request business account</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
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
