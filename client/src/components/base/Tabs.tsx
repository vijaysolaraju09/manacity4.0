import styles from './Tabs.module.scss';

export interface TabItem {
  key: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
}

const Tabs = ({ tabs, active, onChange }: TabsProps) => (
  <div>
    <div className={styles.nav}>
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`${styles.tab} ${active === t.key ? styles.active : ''}`}
        >
          {t.label}
        </button>
      ))}
    </div>
    <div className={styles.panel}>{tabs.find((t) => t.key === active)?.content}</div>
  </div>
);

export default Tabs;
