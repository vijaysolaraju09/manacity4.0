import Shimmer from '../Shimmer';
import styles from './SkeletonList.module.scss';

interface SkeletonListProps {
  count?: number;
  lines?: number;
  className?: string;
  itemClassName?: string;
  withAvatar?: boolean;
}

const SkeletonList = ({
  count = 5,
  lines = 2,
  className,
  itemClassName,
  withAvatar = false,
}: SkeletonListProps) => {
  const items = Array.from({ length: Math.max(0, count) });
  const lineCount = Math.max(1, lines);

  return (
    <div className={[styles.list, className].filter(Boolean).join(' ')}>
      {items.map((_, itemIndex) => (
        <div
          key={itemIndex}
          className={[styles.item, itemClassName].filter(Boolean).join(' ')}
        >
          {withAvatar && <Shimmer className={styles.avatar} />}
          <div className={styles.body}>
            {Array.from({ length: lineCount }).map((__, lineIndex) => {
              const width = lineIndex === 0
                ? '70%'
                : lineIndex === lineCount - 1
                  ? '45%'
                  : '85%';
              return (
                <Shimmer
                  key={`${itemIndex}-${lineIndex}`}
                  className={styles.line}
                  style={{ width }}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SkeletonList;
