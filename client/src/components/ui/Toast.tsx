export type ToastType = 'success' | 'error' | 'info';

const ensureContainer = () => {
  let container = document.getElementById('app-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'app-toast-container';
    container.className =
      'pointer-events-none fixed inset-x-0 bottom-6 z-[1200] flex flex-col items-center gap-3 px-4 sm:items-end sm:justify-end';
    document.body.appendChild(container);
  }
  return container;
};

const variantClasses: Record<ToastType, string> = {
  success:
    'border-emerald-500/40 bg-emerald-600 text-white ring-emerald-400/40 dark:border-emerald-400/50 dark:bg-emerald-500',
  error:
    'border-red-500/40 bg-red-600 text-white ring-red-400/40 dark:border-red-500/50 dark:bg-red-500',
  info:
    'border-slate-700/60 bg-slate-900 text-slate-100 ring-slate-700/50 dark:border-slate-700/60 dark:bg-slate-900',
};

const labelMap: Record<ToastType, string> = {
  success: 'Success',
  error: 'Error',
  info: 'Notice',
};

const showToast = (message: string, type: ToastType = 'info') => {
  if (typeof document === 'undefined') return;

  const container = ensureContainer();
  const toast = document.createElement('div');
  toast.role = 'status';
  toast.ariaLive = 'polite';
  toast.className = `pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl border px-4 py-3 shadow-xl ring-1 ring-inset backdrop-blur-sm transition will-change-transform ${variantClasses[type]}`;
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(12px)';

  const inner = document.createElement('div');
  inner.className = 'flex items-start gap-3';

  const marker = document.createElement('span');
  marker.className = 'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20 text-sm font-semibold uppercase tracking-wide text-white/90';
  marker.textContent = labelMap[type][0] ?? 'i';
  marker.setAttribute('aria-hidden', 'true');

  const content = document.createElement('div');
  content.className = 'flex-1 text-sm font-medium';

  const heading = document.createElement('p');
  heading.className = 'text-xs font-semibold uppercase tracking-wide text-white/80';
  heading.textContent = labelMap[type];

  const body = document.createElement('p');
  body.className = 'mt-1 text-sm text-white/95';
  body.textContent = message;

  const dismiss = () => {
    window.clearTimeout(timeout);
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    window.setTimeout(() => {
      toast.remove();
      if (!container?.hasChildNodes()) {
        container.remove();
      }
    }, 220);
  };

  const dismissButton = document.createElement('button');
  dismissButton.type = 'button';
  dismissButton.className =
    'ml-3 inline-flex items-center rounded-full border border-white/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/90 transition hover:border-white hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';
  dismissButton.textContent = 'Dismiss';

  let timeout = window.setTimeout(dismiss, 3400);

  dismissButton.addEventListener('click', dismiss);
  toast.addEventListener('mouseenter', () => window.clearTimeout(timeout));
  toast.addEventListener('mouseleave', () => {
    window.clearTimeout(timeout);
    timeout = window.setTimeout(dismiss, 2200);
  });

  content.appendChild(heading);
  content.appendChild(body);

  inner.appendChild(marker);
  inner.appendChild(content);
  inner.appendChild(dismissButton);

  toast.appendChild(inner);
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });
};

export default showToast;
