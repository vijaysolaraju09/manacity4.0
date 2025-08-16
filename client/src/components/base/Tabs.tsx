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
  <div className="tabs">
    <div className="tabs-nav">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`tab ${active === t.key ? 'tab--active' : ''}`}
        >
          {t.label}
        </button>
      ))}
    </div>
    <div className="tabs-panel">{tabs.find((t) => t.key === active)?.content}</div>
  </div>
);

export default Tabs;
