import { motion } from 'framer-motion';
import styles from './QuantityStepper.module.scss';

export interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}

const QuantityStepper = ({ value, min = 1, max = 99, onChange }: QuantityStepperProps) => {
  const dec = () => value > min && onChange(value - 1);
  const inc = () => value < max && onChange(value + 1);

  return (
    <div className={styles.stepper}>
      <motion.button
        type="button"
        className={styles.button}
        whileTap={{ scale: 0.95 }}
        onClick={dec}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        -
      </motion.button>
      <span className={styles.value}>{value}</span>
      <motion.button
        type="button"
        className={styles.button}
        whileTap={{ scale: 0.95 }}
        onClick={inc}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        +
      </motion.button>
    </div>
  );
};

export default QuantityStepper;

