import { useEffect, useState } from "react";
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
import fallbackImage from "../../assets/no-image.svg";

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
  const [sort, setSort] = useState(searchParams.get("sort") || "rating");

  const navigate = useNavigate();

  useEffect(() => {
    const params: Record<string, string> = {};
    if (debouncedSearch) params.q = debouncedSearch;
    if (category) params.category = category;
    if (location) params.location = location;
    if (openOnly) params.open = "true";
    if (sort) params.sort = sort;
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, category, location, openOnly, sort, setSearchParams]);

  useEffect(() => {
    const params = Object.fromEntries(searchParams.entries());
    dispatch(fetchShops(params));
  }, [searchParams, dispatch]);

  const filteredShops = shops.filter((shop) => {
    return (
      (!category || shop.category === category) &&
      (!location || shop.location === location) &&
      (!debouncedSearch || shop.name.toLowerCase().includes(debouncedSearch.toLowerCase())) &&
      (!openOnly || shop.isOpen)
    );
  });

  const sortedShops = [...filteredShops].sort((a, b) => {
    if (sort === "rating") return (b.ratingAvg || 0) - (a.ratingAvg || 0);
    if (sort === "distance") return (a.distance || 0) - (b.distance || 0);
    if (sort === "productCount")
      return (b.products?.length || 0) - (a.products?.length || 0);
    return 0;
  });

  const categories = ["Restaurant", "Mechanic", "Fashion", "Grocery"];
  const locations = ["Town Center", "West End", "East Side", "North Market"];

  const retryFetch = () =>
    dispatch(fetchShops(Object.fromEntries(searchParams.entries())));

  return (
    <div className={`${styles.page} px-4 md:px-6 lg:px-8`}>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Explore Shops</h2>
        <button
          type="button"
          className="text-sm text-gray-600 hover:text-gray-800"
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
          sort={sort}
          onSortChange={setSort}
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
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedShops.map((shop) => {
            const image = shop.image || shop.banner || fallbackImage;
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
                key={shop._id}
                type="button"
                className={`${styles.shopCard} cursor-pointer text-left`}
                onClick={() => navigate(paths.shop(shop._id))}
              >
                <img
                  className={styles.thumb}
                  src={image}
                  alt={shop.name}
                  onError={(e) => (e.currentTarget.src = fallbackImage)}
                />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {shop.name}
                    </h3>
                    {rating !== null && (
                      <span className="text-sm font-medium text-gray-700">{rating.toFixed(1)}</span>
                    )}
                  </div>
                  <p className={styles.meta}>{shop.location || shop.address || "Location coming soon"}</p>
                  <div className={styles.chips}>
                    {shop.category && <span>{shop.category}</span>}
                    {shop.isOpen !== undefined && (
                      <span>{shop.isOpen ? "Open now" : "Closed"}</span>
                    )}
                    {distance && <span>{distance}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Shops;

