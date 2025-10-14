import { motion } from 'framer-motion';
import styles from './QuantityStepper.module.scss';

export interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  className?: string;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

const QuantityStepper = ({
  value,
  min = 1,
  max = 99,
  onChange,
  className,
  id,
  ariaLabel,
  ariaDescribedBy,
}: QuantityStepperProps) => {
  const dec = () => value > min && onChange(value - 1);
  const inc = () => value < max && onChange(value + 1);

  return (
    <div
      id={id}
      role="group"
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className={[styles.stepper, className].filter(Boolean).join(' ')}
    >
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

