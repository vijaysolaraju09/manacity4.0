import type { FC } from 'react';
import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';
import type { Field } from '@/types/forms';
import styles from './FieldList.module.scss';

interface FieldListProps {
  fields: Field[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
}

const FieldList: FC<FieldListProps> = ({ fields, selectedId, onSelect, onDuplicate, onDelete, onMove }) => {
  if (!fields.length) {
    return <div className={styles.emptyState}>No fields yet. Add a field to get started.</div>;
  }

  return (
    <div className={styles.list}>
      {fields.map((field, index) => {
        const isActive = field.id === selectedId;
        return (
          <div key={field.id} className={`${styles.item} ${isActive ? styles.itemActive : ''}`}>
            <button
              type="button"
              onClick={() => onSelect(field.id)}
              className={styles.itemBody}
            >
              <div className={styles.itemMeta}>
                <span className={styles.itemTitle}>{field.label || 'Untitled field'}</span>
                <span className={styles.itemSubtitle}>{field.type.replace('_', ' ')}</span>
              </div>
            </button>
            <div className={styles.itemActions}>
              <button
                type="button"
                className={styles.iconButton}
                onClick={(event) => {
                  event.stopPropagation();
                  onMove(field.id, 'up');
                }}
                disabled={index === 0}
                aria-label="Move field up"
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                className={styles.iconButton}
                onClick={(event) => {
                  event.stopPropagation();
                  onMove(field.id, 'down');
                }}
                disabled={index === fields.length - 1}
                aria-label="Move field down"
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                className={styles.iconButton}
                onClick={(event) => {
                  event.stopPropagation();
                  onDuplicate(field.id);
                }}
                aria-label="Duplicate field"
              >
                <Copy size={16} />
              </button>
              <button
                type="button"
                className={styles.iconButton}
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(field.id);
                }}
                aria-label="Delete field"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FieldList;
