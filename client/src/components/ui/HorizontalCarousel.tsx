import type { ReactNode } from 'react';
import { useRef } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import styles from './HorizontalCarousel.module.scss';

interface Props {
  children: ReactNode[] | ReactNode;
}

const HorizontalCarousel = ({ children }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: number) => {
    if (containerRef.current) {
      const width = containerRef.current.clientWidth;
      containerRef.current.scrollBy({ left: dir * width, behavior: 'smooth' });
    }
  };

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        aria-label="previous"
        className={`${styles.chevron} ${styles.left}`}
        onClick={() => scroll(-1)}
      >
        <FaChevronLeft />
      </button>
      <div className={styles.container} ref={containerRef}>
        {Array.isArray(children)
          ? children.map((child, idx) => (
              <div key={idx} className={styles.item}>
                {child}
              </div>
            ))
          : <div className={styles.item}>{children}</div>}
      </div>
      <button
        type="button"
        aria-label="next"
        className={`${styles.chevron} ${styles.right}`}
        onClick={() => scroll(1)}
      >
        <FaChevronRight />
      </button>
    </div>
  );
};

export default HorizontalCarousel;
