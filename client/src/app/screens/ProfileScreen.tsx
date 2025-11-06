import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Building2, Mail, MapPin, Phone, ShieldCheck, User } from 'lucide-react'
import type { AppDispatch, RootState } from '@/store'
import { fetchProfile, updateProfile } from '@/store/user'
import { Badge, Button, Card } from '@/app/components/primitives'
import showToast from '@/components/ui/Toast'
import { Spinner } from '@/components/ui/Spinner'
import type { User as UserModel } from '@/types/user'
import { toErrorMessage } from '@/lib/response'

const badgeToneForStatus = (status: UserModel['verificationStatus'] | undefined): 'accent' | 'success' | 'neutral' => {
  switch (status) {
    case 'approved':
      return 'success'
    case 'pending':
      return 'accent'
    default:
      return 'neutral'
  }
}

const statusLabel = (status: string | undefined) => {
  switch (status) {
    case 'approved':
      return 'Approved'
    case 'pending':
      return 'Pending review'
    case 'rejected':
      return 'Rejected'
    default:
      return 'Not submitted'
  }
}

const fieldClassName =
  'w-full rounded-2xl border border-default bg-surface-1 px-4 py-3 text-sm text-primary shadow-sm-theme focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_55%,transparent)]'

const ProfileScreen = () => {
  const dispatch = useDispatch<AppDispatch>()
  const profileState = useSelector((state: RootState) => state.userProfile)
  const authState = useSelector((state: RootState) => state.auth)
  const profile = profileState.item ?? authState.user ?? null

  const [formState, setFormState] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    address: '',
    profession: '',
    bio: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (profileState.status === 'idle') {
      void dispatch(fetchProfile())
    }
  }, [dispatch, profileState.status])

  const syncFormFromProfile = useCallback(() => {
    if (!profile) return
    setFormState({
      name: profile.name ?? '',
      email: profile.email ?? '',
      phone: profile.phone ?? '',
      location: profile.location ?? '',
      address: profile.address ?? '',
      profession: profile.profession ?? '',
      bio: profile.bio ?? '',
    })
  }, [profile])

  useEffect(() => {
    syncFormFromProfile()
  }, [syncFormFromProfile])

  const verificationTone = useMemo(() => badgeToneForStatus(profile?.verificationStatus), [profile?.verificationStatus])
  const businessTone = useMemo(() => badgeToneForStatus(profile?.businessStatus), [profile?.businessStatus])
  const hasChanges = useMemo(() => {
    if (!profile) return false
    return (
      formState.name !== (profile.name ?? '') ||
      formState.email !== (profile.email ?? '') ||
      formState.phone !== (profile.phone ?? '') ||
      formState.location !== (profile.location ?? '') ||
      formState.address !== (profile.address ?? '') ||
      formState.profession !== (profile.profession ?? '') ||
      formState.bio !== (profile.bio ?? '')
    )
  }, [formState, profile])

  const handleChange = (field: keyof typeof formState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!profile) return
    setIsSubmitting(true)
    try {
      await dispatch(
        updateProfile({
          name: formState.name,
          email: formState.email,
          phone: formState.phone,
          location: formState.location,
          address: formState.address,
          profession: formState.profession,
          bio: formState.bio,
        }),
      ).unwrap()
      showToast('Profile updated successfully', 'success')
    } catch (err) {
      showToast(toErrorMessage(err) || 'Unable to update profile', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoading = profileState.status === 'loading' && !profile

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-[2rem] p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
              <User className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-primary">{profile?.name || 'Your profile'}</h1>
              <p className="text-sm text-muted">Manage your personal details, concierge preferences, and verification status.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Badge tone={verificationTone}>Verification: {statusLabel(profile?.verificationStatus)}</Badge>
            <Badge tone={businessTone}>Business: {statusLabel(profile?.businessStatus)}</Badge>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <Card className="flex items-center justify-center rounded-3xl p-8">
          <div className="flex items-center gap-3 text-muted">
            <Spinner ariaLabel="Loading profile" />
            <span className="text-sm">Loading profile…</span>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-3xl p-6">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-primary">Contact details</h2>
                <p className="text-sm text-muted">Keep your concierge contact information up to date.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-muted">
                  Full name
                  <input
                    type="text"
                    className={fieldClassName}
                    value={formState.name}
                    onChange={handleChange('name')}
                    placeholder="Your name"
                    required
                  />
                </label>
                <label className="text-sm text-muted">
                  Email
                  <input
                    type="email"
                    className={fieldClassName}
                    value={formState.email}
                    onChange={handleChange('email')}
                    placeholder="name@example.com"
                  />
                </label>
                <label className="text-sm text-muted">
                  Phone
                  <input
                    type="tel"
                    className={fieldClassName}
                    value={formState.phone}
                    onChange={handleChange('phone')}
                    placeholder="+91 00000 00000"
                  />
                </label>
                <label className="text-sm text-muted">
                  Location
                  <input
                    type="text"
                    className={fieldClassName}
                    value={formState.location}
                    onChange={handleChange('location')}
                    placeholder="City, State"
                  />
                </label>
              </div>

              <label className="text-sm text-muted">
                Address
                <input
                  type="text"
                  className={fieldClassName}
                  value={formState.address}
                  onChange={handleChange('address')}
                  placeholder="123, Main Street"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-muted">
                  Profession
                  <input
                    type="text"
                    className={fieldClassName}
                    value={formState.profession}
                    onChange={handleChange('profession')}
                    placeholder="Designer, Consultant, …"
                  />
                </label>
                <label className="text-sm text-muted md:col-span-2">
                  Bio
                  <textarea
                    className={`${fieldClassName} min-h-[120px] resize-y`}
                    value={formState.bio}
                    onChange={handleChange('bio')}
                    placeholder="Tell the concierge team about your preferences and interests"
                  />
                </label>
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    syncFormFromProfile()
                    showToast('Changes reverted', 'info')
                  }}
                >
                  Reset
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting || !hasChanges}>
                  {isSubmitting ? 'Saving…' : hasChanges ? 'Save changes' : 'Up to date'}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="rounded-3xl p-6 space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-primary">Concierge overview</h2>
              <p className="text-sm text-muted">Quick snapshot of your membership details.</p>
            </div>
            <div className="space-y-3 text-sm text-muted">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-[var(--primary)]" />
                <div>
                  <p className="font-semibold text-primary">Verification status</p>
                  <p>{statusLabel(profile?.verificationStatus)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-[var(--accent)]" />
                <div>
                  <p className="font-semibold text-primary">Business onboarding</p>
                  <p>{statusLabel(profile?.businessStatus)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5" />
                <div>
                  <p className="font-semibold text-primary">Phone</p>
                  <p>{profile?.phone || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5" />
                <div>
                  <p className="font-semibold text-primary">Email</p>
                  <p>{profile?.email || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5" />
                <div>
                  <p className="font-semibold text-primary">Location</p>
                  <p>{profile?.location || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default ProfileScreen
