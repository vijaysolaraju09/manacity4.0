import type { ReactNode } from 'react';
import styles from './SectionHeader.module.scss';

interface SectionHeaderProps {
  title: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  linkLabel?: string;
}

const SectionHeader = ({
  title,
  href,
  onClick,
  className = '',
  linkLabel = 'See all',
}: SectionHeaderProps) => (
  <div className={`${styles.header} ${className}`}>
    <h2 className={styles.title}>{title}</h2>
    {(href || onClick) && (
      <a className={styles.link} href={href} onClick={onClick}>
        {linkLabel}
      </a>
    )}
  </div>
);

export default SectionHeader;

