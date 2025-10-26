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
        <div className={styles.openNowContainer}>
          <span className={styles.openNowLabel}>Open now</span>
          <div className={styles.checkboxWrapper}>
            <input
              id={openToggleId}
              type="checkbox"
              checked={openOnly}
              onChange={(e) => onOpenChange(e.target.checked)}
              aria-label="Toggle open shops only"
            />
            <label className={styles.toggle} htmlFor={openToggleId}>
              <span className={styles.toggleThumb}>
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                  <path d="M5,1 L5,1 C2.790861,1 1,2.790861 1,5 L1,5 C1,7.209139 2.790861,9 5,9 L5,9 C7.209139,9 9,7.209139 9,5 L9,5 C9,2.790861 7.209139,1 5,1 L5,9 L5,1 Z" />
                </svg>
              </span>
            <label className={`${styles.rocker} ${styles.rockerSmall}`} htmlFor={openToggleId}>
              <input
                id={openToggleId}
                type="checkbox"
                checked={openOnly}
                onChange={(e) => onOpenChange(e.target.checked)}
                aria-label="Toggle open shops only"
              />
              <span className={styles.switchLeft}>Yes</span>
              <span className={styles.switchRight}>No</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacetFilterBar;

