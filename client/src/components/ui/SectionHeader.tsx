import type { ReactNode } from 'react';
import styles from './SectionHeader.module.scss';

interface SectionHeaderProps {
  title: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}

const SectionHeader = ({ title, href, onClick, className = '' }: SectionHeaderProps) => (
  <div className={`${styles.header} ${className}`}>
    <h2 className={styles.title}>{title}</h2>
    {(href || onClick) && (
      <a className={styles.link} href={href} onClick={onClick}>
        See all
      </a>
    )}
  </div>
);

export default SectionHeader;

