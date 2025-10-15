import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import {
  BadgeCheck,
  BriefcaseBusiness,
  FileText,
  Globe,
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
  <div className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/40">
    <Icon className="mt-1 h-5 w-5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="text-sm text-slate-900 dark:text-slate-100">{value || emptyLabel}</p>
    </div>
  </div>
);

type StatusVariant = 'default' | 'info' | 'success' | 'warning';

const StatusBadge = ({ children, variant = 'default' }: { children: ReactNode; variant?: StatusVariant }) => {
  const variants: Record<StatusVariant, string> = {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

const ProfileSkeleton = () => (
  <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 lg:py-12">
    <Skeleton className="h-64 w-full" />
    <div className="grid gap-6 lg:grid-cols-2">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
    <Skeleton className="h-48 w-full" />
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
      actions.push({ label: 'My Orders', path: paths.orders.root() });
    }
    return actions;
  }, [user]);

  if (loadState === 'loading') {
    return <ProfileSkeleton />;
  }

  if (loadState === 'error') {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-16">
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-start gap-4 p-8 text-left">
            <CardTitle className="flex items-center gap-2 text-xl text-slate-900 dark:text-slate-100">
              <ShieldCheck className="h-6 w-6 text-red-500" aria-hidden="true" />
              Unable to load profile
            </CardTitle>
            <CardDescription className="text-base text-slate-600 dark:text-slate-300">
              {error || 'Please try again in a moment.'}
            </CardDescription>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => fetchProfile()} className="rounded-xl">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-16">
        <Card>
          <CardContent className="flex flex-col items-start gap-4 p-8 text-left">
            <CardTitle className="text-xl">No profile information</CardTitle>
            <CardDescription className="text-base">
              We could not find your profile details. Try refreshing the page or contact support if the issue
              persists.
            </CardDescription>
            <Button onClick={() => fetchProfile()} className="rounded-xl">
              Refresh
            </Button>
          </CardContent>
        </Card>
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
  const themeLabel = user.preferences?.theme
    ? `${user.preferences.theme.charAt(0).toUpperCase()}${user.preferences.theme.slice(1)}`
    : 'Light';

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 lg:py-12">
      <Card>
        <CardHeader className="border-none pb-0">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <UserRoundCog className="h-6 w-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <div>
                <CardTitle className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  Your profile
                </CardTitle>
                <CardDescription>Manage how your information appears across Manacity.</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 pt-4">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col items-center gap-4 text-center md:flex-row md:items-center md:gap-6 md:text-left">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={`${user.name}'s avatar`}
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-slate-100 dark:ring-slate-800"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-2xl font-semibold text-slate-600 ring-4 ring-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-800">
                  <span aria-hidden="true">{initials}</span>
                  <span className="sr-only">{user.name} avatar</span>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{user.name}</p>
                <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-slate-600 md:justify-start dark:text-slate-300">
                  <div className="inline-flex items-center gap-2">
                    <Phone className="h-4 w-4" aria-hidden="true" />
                    {user.phone}
                  </div>
                  {user.email && (
                    <div className="inline-flex items-center gap-2">
                      <Mail className="h-4 w-4" aria-hidden="true" />
                      {user.email}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 md:items-end">
              <div className="flex flex-wrap justify-center gap-2 md:justify-end">
                <StatusBadge>
                  <UserRound className="h-4 w-4" aria-hidden="true" /> {user.role}
                </StatusBadge>
                {user.verificationStatus !== 'none' && (
                  <StatusBadge variant={user.verificationStatus === 'approved' ? 'success' : 'info'}>
                    <BadgeCheck className="h-4 w-4" aria-hidden="true" /> {user.verificationStatus}
                  </StatusBadge>
                )}
                {user.businessStatus && user.businessStatus !== 'none' && (
                  <StatusBadge variant={user.businessStatus === 'approved' ? 'success' : 'warning'}>
                    <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" /> {user.businessStatus}
                  </StatusBadge>
                )}
              </div>
              {quickActions.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 md:justify-end">
                  {quickActions.map((action) => (
                    <Button
                      key={action.label}
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => navigate(action.path)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row">
          <Button className="w-full rounded-xl sm:w-auto" onClick={() => setIsEditOpen(true)}>
            Edit profile
          </Button>
          <Button
            className="w-full rounded-xl sm:w-auto"
            variant="secondary"
            disabled={businessDisabled}
            onClick={() => setIsBusinessOpen(true)}
          >
            {businessButtonLabel}
          </Button>
          <Button
            className="w-full rounded-xl sm:w-auto"
            variant="outline"
            disabled={verificationDisabled}
            onClick={() => setIsVerifyOpen(true)}
          >
            {verificationButtonLabel}
          </Button>
        </CardFooter>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-purple-500" aria-hidden="true" />
              <div>
                <CardTitle className="text-lg">Personal information</CardTitle>
                <CardDescription>Details that describe who you are.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow icon={UserRound} label="Full name" value={user.name} />
            <InfoRow icon={BriefcaseBusiness} label="Profession" value={user.profession} />
            <InfoRow
              icon={FileText}
              label="Bio"
              value={user.bio ? <span className="block text-sm leading-relaxed text-slate-700 dark:text-slate-200">{user.bio}</span> : undefined}
            />
            <InfoRow icon={Globe} label="Theme preference" value={themeLabel} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-emerald-500" aria-hidden="true" />
              <div>
                <CardTitle className="text-lg">Contact details</CardTitle>
                <CardDescription>How customers can reach you.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow icon={Phone} label="Phone" value={user.phone} />
            <InfoRow icon={Mail} label="Email" value={user.email ?? undefined} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-orange-500" aria-hidden="true" />
            <div>
              <CardTitle className="text-lg">Address</CardTitle>
              <CardDescription>Your service area and mailing details.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <InfoRow icon={MapPin} label="Location" value={user.location} />
          <InfoRow icon={Home} label="Address" value={user.address} />
        </CardContent>
      </Card>

      <ModalSheet open={isEditOpen} onClose={() => setIsEditOpen(false)}>
        <div className="space-y-6 p-6">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Edit profile</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
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
                  className="w-full rounded-xl sm:w-auto"
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="w-full rounded-xl sm:w-auto" disabled={editForm.formState.isSubmitting}>
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
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Request verification</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
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
                    <p className="text-xs text-slate-500 dark:text-slate-400">
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
                  className="w-full rounded-xl sm:w-auto"
                  onClick={() => setIsVerifyOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-full rounded-xl sm:w-auto"
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
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Request business account</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
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
                  className="w-full rounded-xl sm:w-auto"
                  onClick={() => setIsBusinessOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-full rounded-xl sm:w-auto"
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
  );
};

export default Profile;
