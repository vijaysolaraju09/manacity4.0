import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ModalSheet.module.scss';

export interface ModalSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const ModalSheet = ({ open, onClose, children }: ModalSheetProps) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
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
