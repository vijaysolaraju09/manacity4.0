import { useNavigate } from 'react-router-dom';
import fallbackImage from '../../assets/no-image.svg';
import { AuthShell, Badge, Button, Card } from '@/components/auth/AuthShell';
import { paths } from '@/routes/paths';

const heroImage =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1600&auto=format&fit=crop';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <AuthShell>
      <div className="space-y-6">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/25 via-transparent to-[var(--accent)]/25" />
          <div className="relative grid items-center gap-6 p-6 md:grid-cols-2 md:p-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-0)] px-3 py-1 text-xs text-[var(--text-muted)]">
                <Badge>Manacity</Badge>
                <span>Shops • Services • Events</span>
              </div>
              <h1 className="mt-4 text-3xl font-bold leading-tight md:text-4xl">Everything in your city, in one app</h1>
              <p className="mt-2 max-w-prose text-[var(--text-muted)]">
                Discover verified providers, request services, join events, and checkout seamlessly.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => navigate(paths.auth.login())}>Log in</Button>
                <Button variant="outline" onClick={() => navigate(paths.auth.signup())}>
                  Create account
                </Button>
              </div>
            </div>
            <div className="rounded-2xl bg-[var(--surface-0)] p-3 shadow-[var(--shadow-lg)]">
              <img
                src={heroImage}
                alt="City life"
                className="h-64 w-full rounded-xl object-cover md:h-72"
                onError={(event) => {
                  event.currentTarget.src = fallbackImage;
                }}
              />
            </div>
          </div>
        </Card>
      </div>
    </AuthShell>
  );
};

export default Landing;
