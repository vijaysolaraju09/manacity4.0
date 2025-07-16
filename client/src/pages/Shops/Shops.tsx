import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../../api/client";
import { sampleShops } from "../../data/sampleData";
import Shimmer from "../../components/Shimmer";
import styles from "./Shops.module.scss";
import fallbackImage from "../../assets/no-image.svg";

interface Shop {
  _id: string;
  name: string;
  category: string;
  location: string;
  isOpen?: boolean;
  image?: string;
}

const Shops = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [search, setSearch] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (category) params.append("category", category);
    if (location) params.append("location", location);
    if (openOnly) params.append("isOpen", "true");
    api
      .get(`/shops?${params.toString()}`)
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setShops(res.data);
        } else {
          setShops(sampleShops);
        }
      })
      .catch(() => {
        setShops(sampleShops);
      })
      .finally(() => setLoading(false));
  }, [search, category, location, openOnly]);

  const filteredShops = shops.filter((shop) => {
    return (
      (!category || shop.category === category) &&
      (!location || shop.location === location) &&
      (!search || shop.name.toLowerCase().includes(search.toLowerCase())) &&
      (!openOnly || shop.isOpen)
    );
  });

  const categories = ["Restaurant", "Mechanic", "Fashion", "Grocery"];
  const locations = ["Town Center", "West End", "East Side", "North Market"];

  return (
    <div className={styles.shops}>
      <h2>Explore Shops</h2>
      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Search shops..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={location} onChange={(e) => setLocation(e.target.value)}>
          <option value="">All Locations</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={openOnly}
            onChange={(e) => setOpenOnly(e.target.checked)}
          />
          Only Open Shops
        </label>
      </div>

      <div className={styles.categoryRow}>
        <button
          className={!category ? styles.active : ""}
          onClick={() => setCategory("")}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            className={category === cat ? styles.active : ""}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

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
          : filteredShops.map((shop) => (
              <motion.div
                whileHover={{ scale: 1.02 }}
                key={shop._id}
                className={styles.card}
                onClick={() => navigate(`/shops/${shop._id}`)}
              >
                <img
                  src={shop.image || "https://via.placeholder.com/150"}
                  alt={shop.name}
                  onError={(e) => (e.currentTarget.src = fallbackImage)}
                />
                <div className={styles.info}>
                  <h3>{shop.name}</h3>
                  <p>{shop.category}</p>
                  <p>{shop.location}</p>
                  {shop.isOpen !== undefined && (
                    <span
                      className={`${styles.badge} ${
                        shop.isOpen ? styles.open : styles.closed
                      }`}
                    >
                      {shop.isOpen ? "Open" : "Closed"}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
      </div>
    </div>
  );
};

export default Shops;
