import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/client";
import { sampleShops } from "../../data/sampleData";
import Shimmer from "../../components/Shimmer";
import styles from "./Shops.module.scss";
import FacetFilterBar from "../../components/ui/FacetFilterBar/FacetFilterBar";
import ShopCard from "../../components/ui/ShopCard/ShopCard";

interface Shop {
  _id: string;
  name: string;
  category: string;
  location: string;
  isOpen?: boolean;
  image?: string;
  logo?: string;
  rating?: number;
  distance?: number;
  products?: { _id: string }[];
}

const Shops = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [openOnly, setOpenOnly] = useState(searchParams.get("open") === "true");
  const [sort, setSort] = useState(searchParams.get("sort") || "rating");

  const navigate = useNavigate();

  useEffect(() => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (category) params.category = category;
    if (location) params.location = location;
    if (openOnly) params.open = "true";
    if (sort) params.sort = sort;
    setSearchParams(params, { replace: true });
  }, [search, category, location, openOnly, sort, setSearchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    api
      .get(`/shops?${params.toString()}`)
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setShops(res.data);
        } else {
          setShops(sampleShops as unknown as Shop[]);
        }
      })
      .catch(() => {
        setShops(sampleShops as unknown as Shop[]);
      })
      .finally(() => setLoading(false));
  }, [searchParams]);

  const filteredShops = shops.filter((shop) => {
    return (
      (!category || shop.category === category) &&
      (!location || shop.location === location) &&
      (!search || shop.name.toLowerCase().includes(search.toLowerCase())) &&
      (!openOnly || shop.isOpen)
    );
  });

  const sortedShops = [...filteredShops].sort((a, b) => {
    if (sort === "rating") return (b.rating || 0) - (a.rating || 0);
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
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.card}>
                <Shimmer className="rounded" style={{ height: 160 }} />
                <div className={styles.info}>
                  <Shimmer style={{ height: 16, marginTop: 8 }} />
                  <Shimmer style={{ height: 14, width: "60%" }} />
                </div>
              </div>
            ))
          : sortedShops.map((shop) => (
              <ShopCard
                key={shop._id}
                shop={{
                  ...shop,
                  distance: shop.distance,
                  rating: shop.rating,
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

