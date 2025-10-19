import { Skeleton } from '@/components/ui/skeleton';

const CartSkeleton = () => (
  <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
    <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/60">
      <Skeleton className="h-8 w-48 rounded-full" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-4 w-full rounded-full" />
        <Skeleton className="h-4 w-1/2 rounded-full" />
      </div>
    </div>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-3xl border border-slate-200/70 bg-white/80 p-5 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/60">
            <div className="flex gap-4">
              <Skeleton className="h-24 w-24 rounded-2xl" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-5 w-3/4 rounded-full" />
                <Skeleton className="h-4 w-1/2 rounded-full" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/60">
        <Skeleton className="h-6 w-32 rounded-full" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-4 w-full rounded-full" />
          <Skeleton className="h-4 w-4/5 rounded-full" />
          <Skeleton className="h-4 w-3/5 rounded-full" />
        </div>
        <Skeleton className="mt-6 h-12 w-full rounded-full" />
      </div>
    </div>
  </div>
);

export default CartSkeleton;
