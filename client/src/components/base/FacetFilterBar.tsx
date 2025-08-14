import { useState } from 'react';
import ModalSheet from './ModalSheet';
import styles from './FacetFilterBar.module.scss';

export interface SortOption {
  value: string;
  label: string;
}

export interface FacetFilterBarProps {
  categories: string[];
  activeCategory?: string;
  onCategoryChange: (c: string) => void;
  price: number;
  minPrice: number;
  maxPrice: number;
  onPriceChange: (p: number) => void;
  rating: number;
  onRatingChange: (r: number) => void;
  available: boolean;
  onAvailabilityChange: (v: boolean) => void;
  sort: string;
  sortOptions: SortOption[];
  onSortChange: (v: string) => void;
}

const FacetFilterBar = ({
  categories,
  activeCategory,
  onCategoryChange,
  price,
  minPrice,
  maxPrice,
  onPriceChange,
  rating,
  onRatingChange,
  available,
  onAvailabilityChange,
  sort,
  sortOptions,
  onSortChange,
}: FacetFilterBarProps) => {
  const [open, setOpen] = useState(false);

  const filters = (
    <div className={styles.filters}>
      <label className={styles.priceRange}>
        Price ₹{price}
        <input
          type="range"
          min={minPrice}
          max={maxPrice}
          value={price}
          onChange={(e) => onPriceChange(Number(e.target.value))}
        />
      </label>
      <label>
        Rating
        <select value={rating} onChange={(e) => onRatingChange(Number(e.target.value))}>
          <option value={0}>Any</option>
          {[1, 2, 3, 4, 5].map((r) => (
            <option key={r} value={r}>
              {r}+
            </option>
          ))}
        </select>
      </label>
      <label className={styles.availability}>
        <input
          type="checkbox"
          checked={available}
          onChange={(e) => onAvailabilityChange(e.target.checked)}
        />
        In stock
      </label>
      <label>
        Sort
        <select value={sort} onChange={(e) => onSortChange(e.target.value)}>
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );

  return (
    <>
      <div className={styles.bar}>
        <div className={styles.categories}>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={`${styles.chip} ${activeCategory === c ? styles.active : ''}`}
              onClick={() => onCategoryChange(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className={styles.desktopFilters}>{filters}</div>
        <button type="button" className={styles.mobileToggle} onClick={() => setOpen(true)}>
          Filters
        </button>
      </div>
      <ModalSheet open={open} onClose={() => setOpen(false)}>
        {filters}
      </ModalSheet>
    </>
  );
};

export default FacetFilterBar;
