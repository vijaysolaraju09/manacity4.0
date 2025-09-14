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
import ShopCard from "../../components/ui/ShopCard/ShopCard";

const Shops = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const { items: shops, status, error } = useSelector(
    (s: RootState) => s.shops
  );

  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [openOnly, setOpenOnly] = useState(searchParams.get("open") === "true");
  const [sort, setSort] = useState(searchParams.get("sort") || "rating");

  const navigate = useNavigate();

  useEffect(() => {
    const params: Record<string, string> = {};
    if (search) params.q = search;
    if (category) params.category = category;
    if (location) params.location = location;
    if (openOnly) params.open = "true";
    if (sort) params.sort = sort;
    setSearchParams(params, { replace: true });
  }, [search, category, location, openOnly, sort, setSearchParams]);

  useEffect(() => {
    const params = Object.fromEntries(searchParams.entries());
    dispatch(fetchShops(params));
  }, [searchParams, dispatch]);

  const filteredShops = shops.filter((shop) => {
    return (
      (!category || shop.category === category) &&
      (!location || shop.location === location) &&
      (!search || shop.name.toLowerCase().includes(search.toLowerCase())) &&
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

  return (
    <div className={styles.shops}>
      <h2>Explore Shops</h2>
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

      <div className={styles.list}>
        {status === "loading" && <ShopsSkeleton />}
        {status === "failed" && (
          <ErrorCard
            msg={error || "Failed to load shops"}
            onRetry={() => dispatch(fetchShops(Object.fromEntries(searchParams.entries())))}
          />
        )}
        {status === "succeeded" && shops.length === 0 && (
          <Empty
            msg="No shops yet."
            ctaText="Refresh"
            onCta={() =>
              dispatch(fetchShops(Object.fromEntries(searchParams.entries())))
            }
          />
        )}
        {status === "succeeded" && shops.length > 0 &&
          sortedShops.map((shop) => (
            <ShopCard
              key={shop._id}
              shop={{
                _id: shop._id,
                name: shop.name,
                category: shop.category,
                image: shop.image || undefined,
                logo: shop.image || undefined,
                rating: shop.ratingAvg,
                distance: shop.distance,
                isOpen: shop.isOpen,
              }}
              onClick={() => navigate(`/shops/${shop._id}`)}
            />
          ))}
      </div>
    </div>
  );
};

export default Shops;

