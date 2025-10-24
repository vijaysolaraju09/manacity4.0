import type { FC, ChangeEvent } from 'react';
import styles from './OptionEditor.module.scss';

interface OptionEditorProps {
  options: string[];
  onChange: (next: string[]) => void;
}

const OptionEditor: FC<OptionEditorProps> = ({ options, onChange }) => {
  const handleOptionChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const next = [...options];
    next[index] = event.target.value;
    onChange(next);
  };

  const handleAdd = () => {
    onChange([...options, '']);
  };

  const handleRemove = (index: number) => {
    const next = options.filter((_, idx) => idx !== index);
    onChange(next);
  };

  return (
    <div className={styles.wrapper}>
      {options.map((option, index) => (
        <div key={`option-${index}`} className={styles.optionRow}>
          <input
            value={option}
            onChange={(event) => handleOptionChange(index, event)}
            className={styles.optionInput}
            aria-label={`Option ${index + 1}`}
          />
          <button
            type="button"
            className={styles.removeButton}
            onClick={() => handleRemove(index)}
          >
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={handleAdd} className={styles.addButton}>
        + Add option
      </button>
    </div>
  );
};

export default OptionEditor;
