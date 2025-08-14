import { motion, AnimatePresence } from 'framer-motion';
import styles from './ModalSheet.module.scss';

export interface ModalSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const ModalSheet = ({ open, onClose, children }: ModalSheetProps) => (
  <AnimatePresence>
    {open && (
      <motion.div className={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div
          className={styles.sheet}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default ModalSheet;
