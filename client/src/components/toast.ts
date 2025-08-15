export type ToastType = 'success' | 'error';

const showToast = (message: string, type: ToastType = 'success') => {
  if (typeof document === 'undefined') return;
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'};
    color: var(--color-on-primary);
    padding: 0.75rem 1rem;
    border-radius: 4px;
    box-shadow: var(--shadow-md);
    z-index: 9999;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
};

export default showToast;

