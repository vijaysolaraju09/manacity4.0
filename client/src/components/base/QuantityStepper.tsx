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
      <motion.button className={styles.button} whileTap={{ scale: 0.9 }} onClick={dec}>
        -
      </motion.button>
      <span className={styles.value}>{value}</span>
      <motion.button className={styles.button} whileTap={{ scale: 0.9 }} onClick={inc}>
        +
      </motion.button>
    </div>
  );
};

export default QuantityStepper;
