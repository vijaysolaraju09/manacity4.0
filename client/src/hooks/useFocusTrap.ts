import { useEffect, useRef } from 'react';

const focusableSelectors =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

type FocusTrapOptions = {
  active: boolean;
  onEscape?: () => void;
};

const useFocusTrap = (
  ref: React.RefObject<HTMLElement | null>,
  { active, onEscape }: FocusTrapOptions,
) => {
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return undefined;
    const node = ref.current;
    if (!node) return undefined;

    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    const focusable = node.querySelectorAll<HTMLElement>(focusableSelectors);
    const first = focusable[0];
    (first ?? node).focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape?.();
        return;
      }
      if (event.key !== 'Tab' || focusable.length === 0) return;
      const nodes = Array.from(node.querySelectorAll<HTMLElement>(focusableSelectors));
      if (nodes.length === 0) return;
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === firstNode) {
          event.preventDefault();
          lastNode.focus();
        }
      } else if (document.activeElement === lastNode) {
        event.preventDefault();
        firstNode.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      lastFocusedRef.current?.focus();
    };
  }, [active, onEscape, ref]);
};

export default useFocusTrap;
