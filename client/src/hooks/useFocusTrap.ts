import { useEffect } from 'react';

/**
 * Trap focus within the referenced element when active.
 * Restores focus to previously active element on cleanup.
 */
export const useFocusTrap = <T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  active: boolean,
  onClose?: () => void
) => {
  useEffect(() => {
    if (!active || !ref.current) return;

    const node = ref.current;
    const focusable = node.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
        return;
      }
      if (e.key !== 'Tab' || focusable.length === 0) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    first?.focus();
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);

    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
      previouslyFocused?.focus();
    };
  }, [ref, active, onClose]);
};

export default useFocusTrap;
