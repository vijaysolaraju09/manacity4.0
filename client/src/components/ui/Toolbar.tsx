import { ReactNode } from 'react';
import styles from './Toolbar.module.scss';

interface ToolbarProps {
  title?: ReactNode;
  search?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

const Toolbar = ({ title, search, actions, className = '' }: ToolbarProps) => (
  <header className={`${styles.toolbar} ${className}`}>
    {title && <div className={styles.title}>{title}</div>}
    {search && <div className={styles.search}>{search}</div>}
    {actions && <div className={styles.actions}>{actions}</div>}
  </header>
);

export default Toolbar;

