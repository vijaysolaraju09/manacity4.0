import type { FC } from 'react';

const Profile: FC = () => (
  <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col gap-6 px-4 py-10">
    <header>
      <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      <p className="mt-2 text-base text-muted-foreground">
        Manage your personal information, preferences, and connected accounts.
      </p>
    </header>
    <section className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
      Profile settings and account details will live here.
    </section>
  </main>
);

export default Profile;
