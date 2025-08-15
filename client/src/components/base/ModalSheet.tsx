import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ModalSheet.module.scss';

export interface ModalSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const ModalSheet = ({ open, onClose, children }: ModalSheetProps) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && sheetRef.current) {
        const focusable = sheetRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const node = sheetRef.current;
    if (!node) return;
    const focusable = node.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    focusable[0]?.focus();
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className={styles.sheet}
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={(_, info) => info.offset.y > 100 && onClose()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.handle} />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ModalSheet;
