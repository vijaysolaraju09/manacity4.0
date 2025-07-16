import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../api/client';
import { sampleSpecialProducts } from '../../data/sampleHomeData';
import Shimmer from '../../components/Shimmer';
import { addToCart } from '../../store/slices/cartSlice';
import fallbackImage from '../../assets/no-image.svg';
import styles from './SpecialShop.module.scss';

interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  image?: string;
}

const SpecialShop = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get('/special-shop')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setProducts(res.data);
        } else {
          setProducts(sampleSpecialProducts as unknown as Product[]);
        }
      })
      .catch(() =>
        setProducts(sampleSpecialProducts as unknown as Product[])
      )
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))),
    [products]
  );

  const filtered = products.filter((p) => {
    return (
      (!category || p.category === category) &&
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className={styles.shop}>
      <h2>Special Shop</h2>
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search products"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.grid}>
        {(loading ? Array.from({ length: 4 }) : filtered).map((p, i) =>
          loading ? (
            <div key={i} className={styles.card}>
              <Shimmer className="rounded" style={{ height: 140 }} />
              <Shimmer style={{ height: 16, marginTop: 8, width: '60%' }} />
            </div>
          ) : (
            <motion.div
              whileHover={{ scale: 1.02 }}
              key={p._id}
              className={styles.card}
            >
              <img
                src={p.image || 'https://via.placeholder.com/200'}
                alt={p.name}
                onError={(e) => (e.currentTarget.src = fallbackImage)}
                onClick={() => navigate(`/product/${p._id}`)}
              />
              <h3 className={styles.name}>{p.name}</h3>
              {p.description && <p className={styles.desc}>{p.description}</p>}
              <p className={styles.price}>₹{p.price}</p>
              <motion.button
                className={styles.add}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() =>
                  dispatch(
                    addToCart({
                      id: p._id,
                      name: p.name,
                      price: p.price,
                      quantity: 1,
                      image: p.image,
                    })
                  )
                }
              >
                Add to Cart
              </motion.button>
            </motion.div>
          )
        )}
      </div>
    </div>
  );
};

export default SpecialShop;
