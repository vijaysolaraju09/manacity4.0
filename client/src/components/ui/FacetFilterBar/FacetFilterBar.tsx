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
  sort: string;
  onSortChange: (v: string) => void;
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
  sort,
  onSortChange,
}: Props) => {
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
        <select value={sort} onChange={(e) => onSortChange(e.target.value)}>
          <option value="rating">Rating</option>
          <option value="distance">Distance</option>
          <option value="productCount">Product count</option>
        </select>
      </div>
      <div className={styles.chips}>
        <button
          className={!category ? styles.active : ''}
          onClick={() => onCategoryChange('')}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            className={category === c ? styles.active : ''}
            onClick={() => onCategoryChange(c)}
          >
            {c}
          </button>
        ))}
        <label className={styles.openNow}>
          <input
            type="checkbox"
            checked={openOnly}
            onChange={(e) => onOpenChange(e.target.checked)}
          />
          Open now
        </label>
      </div>
    </div>
  );
};

export default FacetFilterBar;

