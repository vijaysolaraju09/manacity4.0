import { useId } from 'react';

import styles from './FacetFilterBar.module.scss';

interface Props {
  search: string;
  onSearch: (v: string) => void;
  location: string;
  locations: string[];
  onLocationChange: (v: string) => void;
  category: string;
  categories: string[];
  onCategoryChange: (v: string) => void;
  openOnly: boolean;
  onOpenChange: (v: boolean) => void;
}

const FacetFilterBar = ({
  search,
  onSearch,
  location,
  locations,
  onLocationChange,
  category,
  categories,
  onCategoryChange,
  openOnly,
  onOpenChange,
}: Props) => {
  const openToggleId = useId();

  return (
    <div className={styles.bar}>
      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Search shops..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        <select value={location} onChange={(e) => onLocationChange(e.target.value)}>
          <option value="">All locations</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
        <select value={category} onChange={(e) => onCategoryChange(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className={styles.openNow} htmlFor={openToggleId}>
          <span>Open now</span>
          <input
            id={openToggleId}
            className={styles.toggle}
            type="checkbox"
            checked={openOnly}
            onChange={(e) => onOpenChange(e.target.checked)}
          />
        </label>
      </div>
    </div>
  );
};

export default FacetFilterBar;

