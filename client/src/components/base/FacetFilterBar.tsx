import { motion } from 'framer-motion';
import styles from './FacetFilterBar.module.scss';

export interface FacetFilterBarProps {
  facets: string[];
  active?: string;
  onSelect: (f: string) => void;
  onSort?: () => void;
  onFilter?: () => void;
}

const FacetFilterBar = ({ facets, active, onSelect, onSort, onFilter }: FacetFilterBarProps) => (
  <div className={styles.bar}>
    {facets.map((f) => (
      <motion.div
        key={f}
        className={`${styles.chip} ${active === f ? styles.active : ''}`}
        whileTap={{ scale: 0.95 }}
        onClick={() => onSelect(f)}
      >
        {f}
      </motion.div>
    ))}
    {onSort && (
      <motion.div className={styles.chip} whileTap={{ scale: 0.95 }} onClick={onSort}>
        Sort
      </motion.div>
    )}
    {onFilter && (
      <motion.div className={styles.chip} whileTap={{ scale: 0.95 }} onClick={onFilter}>
        Filter
      </motion.div>
    )}
  </div>
);

export default FacetFilterBar;
