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
  disabled?: boolean;
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
  disabled = false,
}: QuantityStepperProps) => {
  const dec = () => {
    if (disabled) return;
    if (value > min) {
      onChange(value - 1);
    }
  };
  const inc = () => {
    if (disabled) return;
    if (value < max) {
      onChange(value + 1);
    }
  };

  return (
    <div
      id={id}
      role="group"
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-disabled={disabled}
      className={[styles.stepper, disabled ? styles.disabled : undefined, className]
        .filter(Boolean)
        .join(' ')}
    >
      <motion.button
        type="button"
        className={styles.button}
        whileTap={{ scale: 0.95 }}
        onClick={dec}
        disabled={disabled || value <= min}
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
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
      >
        +
      </motion.button>
    </div>
  );
};

export default QuantityStepper;

