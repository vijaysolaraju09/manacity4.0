import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/client';
import { sampleShops } from '../../data/sampleData';
import Shimmer from '../../components/Shimmer';
import ProductCard, { type BasicProduct } from '../../components/ProductCard/ProductCard';
import './ShopDetails.scss';
import fallbackImage from '../../assets/no-image.svg';

interface Shop {
  _id: string;
  name: string;
  category: string;
  location: string;
  address: string;
  image?: string;
  banner?: string;
  description?: string;
  owner?: string;
}

const ShopDetails = () => {
  const { id } = useParams();

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<BasicProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const shopRes = await api.get(`/shops/${id}`);
        setShop(shopRes.data || sampleShops[0]);
        const prodRes = await api.get(`/shops/${id}/products`);
        setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
      } catch {
        setShop(sampleShops[0]);
        setProducts(sampleShops[0].products);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading || !shop)
    return (
      <div className="shop-details">
        <div className="header">
          <Shimmer style={{ width: "100%", height: 250 }} className="rounded" />
          <div className="info">
            <Shimmer style={{ height: 24, width: "60%", margin: "0.5rem auto" }} />
            <Shimmer style={{ height: 16, width: "40%" }} />
          </div>
        </div>
        <h3 className="section-title">Products</h3>
        <div className="product-list">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="placeholder-card">
              <Shimmer className="rounded" style={{ height: 120 }} />
              <Shimmer style={{ height: 16, marginTop: 8 }} />
              <Shimmer style={{ height: 16, width: '50%', marginBottom: 8 }} />
            </div>
          ))}
        </div>
      </div>
    );

  return (
    <div className="shop-details">
      <div className="header">
        <img
          className="banner"
          src={shop.banner || shop.image || 'https://via.placeholder.com/500x250'}
          alt={shop.name}
          onError={(e) => (e.currentTarget.src = fallbackImage)}
        />
        <div className="info">
          <h2>{shop.name}</h2>
          <p>{shop.category}</p>
          <p>{shop.location}</p>
          <p>{shop.address}</p>
          {shop.description && <p className="desc">{shop.description}</p>}
        </div>
      </div>

      <h3 className="section-title">Products</h3>
      <div className="product-list">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default ShopDetails;
