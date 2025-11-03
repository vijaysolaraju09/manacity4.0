import { useCallback, useEffect, useMemo, useState, memo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store";
import { fetchShops } from "@/store/shops";
import ShopsSkeleton from "@/components/common/ShopsSkeleton";
import ErrorCard from "@/components/common/ErrorCard";
import Empty from "@/components/common/Empty";
import styles from "./Shops.module.scss";
import FacetFilterBar from "../../components/ui/FacetFilterBar/FacetFilterBar";
import useDebounce from "@/hooks/useDebounce";
import { paths } from "@/routes/paths";
import getImageOrPlaceholder from "@/utils/getImageOrPlaceholder";
import type { Shop } from "@/store/shops";

const PAGE_SIZE = 24;

type ShopCardProps = {
  shop: Shop;
  onSelect: (id: string) => void;
};

const ShopCard = memo(({ shop, onSelect }: ShopCardProps) => {
  const image = getImageOrPlaceholder(shop.image || shop.banner);
  const rating =
    typeof shop.ratingAvg === "number" && Number.isFinite(shop.ratingAvg)
      ? shop.ratingAvg
      : null;
  const distanceValue =
    typeof shop.distance === "number" && Number.isFinite(shop.distance)
      ? Math.max(0, shop.distance)
      : null;
  const distance = distanceValue !== null ? `${distanceValue.toFixed(1)} km` : null;

  return (
    <button
      type="button"
      className={`card surface-2 shadow-elevBrand cursor-pointer text-left transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${styles.shopCard}`}
      onClick={() => onSelect(shop._id)}
    >
      <img
        className={styles.thumb}
        src={image}
        alt={shop.name}
        loading="lazy"
        onError={(event) => {
          const placeholder = getImageOrPlaceholder(null);
          if (event.currentTarget.src !== placeholder) {
            event.currentTarget.src = placeholder;
          }
        }}
      />
      <div className="flex flex-1 flex-col gap-2 text-hi">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-extrabold text-hi">{shop.name}</h3>
          {rating !== null && (
            <span className="text-sm font-semibold text-brand-500">{rating.toFixed(1)}</span>
          )}
        </div>
        <p className={styles.meta}>{shop.location || shop.address || "Location coming soon"}</p>
        <div className={styles.chips}>
          {shop.category && <span className="chip">{shop.category}</span>}
          {shop.isOpen !== undefined && (
            <span className={shop.isOpen ? "chip active" : "chip"}>
              {shop.isOpen ? "Open now" : "Closed"}
            </span>
          )}
          {distance && <span className="chip">{distance}</span>}
        </div>
      </div>
    </button>
  );
});

ShopCard.displayName = "ShopCard";

const Shops = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const { items: shops, status, error } = useSelector(
    (s: RootState) => s.shops
  );

  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const debouncedSearch = useDebounce(search, 300);
  const [openOnly, setOpenOnly] = useState(searchParams.get("open") === "true");

  const navigate = useNavigate();

  useEffect(() => {
    const params: Record<string, string> = {};
    if (debouncedSearch) params.q = debouncedSearch;
    if (category) params.category = category;
    if (location) params.location = location;
    if (openOnly) params.open = "true";
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, category, location, openOnly, setSearchParams]);

  useEffect(() => {
    const params = Object.fromEntries(searchParams.entries());
    dispatch(fetchShops(params));
  }, [searchParams, dispatch]);

  const filteredShops = useMemo(
    () =>
      shops.filter((shop) =>
        (!category || shop.category === category) &&
        (!location || shop.location === location) &&
        (!debouncedSearch || shop.name.toLowerCase().includes(debouncedSearch.toLowerCase())) &&
        (!openOnly || shop.isOpen),
      ),
    [shops, category, location, debouncedSearch, openOnly],
  );

  const sortedShops = useMemo(
    () => [...filteredShops].sort((a, b) => (b.ratingAvg || 0) - (a.ratingAvg || 0)),
    [filteredShops],
  );

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [category, location, debouncedSearch, openOnly]);

  const handleLoadMore = useCallback(() => {
    setVisibleCount((count) => Math.min(count + PAGE_SIZE, sortedShops.length));
  }, [sortedShops.length]);

  const visibleShops = useMemo(
    () => sortedShops.slice(0, visibleCount),
    [sortedShops, visibleCount],
  );

  const showLoadMore = sortedShops.length > visibleCount;

  const categories = ["Restaurant", "Mechanic", "Fashion", "Grocery"];
  const locations = ["Town Center", "West End", "East Side", "North Market"];

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setLocation("");
    setOpenOnly(false);
  };

  const retryFetch = () =>
    dispatch(fetchShops(Object.fromEntries(searchParams.entries())));

  const handleShopSelect = useCallback(
    (id: string) => {
      navigate(paths.shop(id));
    },
    [navigate],
  );

  return (
    <div className={`${styles.page} bg-surface0 dark:bg-surface0 min-h-screen px-4 text-hi md:px-6 lg:px-8`}>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-extrabold text-hi">Explore Shops</h2>
        <button
          type="button"
          className="text-sm text-md hover:text-hi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          onClick={retryFetch}
        >
          Refresh
        </button>
      </div>
      <div className={styles.filters}>
        <FacetFilterBar
          search={search}
          onSearch={setSearch}
          location={location}
          locations={locations}
          onLocationChange={setLocation}
          category={category}
          categories={categories}
          onCategoryChange={setCategory}
          openOnly={openOnly}
          onOpenChange={setOpenOnly}
          onClear={clearFilters}
        />
      </div>

      {status === "loading" && <ShopsSkeleton />}
      {status === "failed" && (
        <ErrorCard
          msg={error || "Failed to load shops"}
          onRetry={retryFetch}
        />
      )}
      {status === "succeeded" && shops.length === 0 && (
        <Empty msg="No shops yet." ctaText="Refresh" onCta={retryFetch} />
      )}

      {status === "succeeded" && sortedShops.length > 0 && (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleShops.map((shop) => (
              <ShopCard key={shop._id} shop={shop} onSelect={handleShopSelect} />
            ))}
          </div>
          {showLoadMore ? (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                className="rounded-full border border-[color:var(--brand-200)] bg-[var(--surface)] px-6 py-2 text-sm font-semibold text-[var(--brand-600)] shadow-sm transition hover:border-[color:var(--brand-300)] hover:bg-[color-mix(in_srgb,var(--brand-500)_12%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
                onClick={handleLoadMore}
              >
                Load more shops
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export default Shops;

