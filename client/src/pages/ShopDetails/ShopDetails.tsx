import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/client";
import { sampleShops } from "../../data/sampleData";
import { useDispatch } from "react-redux";
import { addToCart } from "../../store/slices/cartSlice";
import Shimmer from "../../components/Shimmer";
import "./ShopDetails.scss";
import fallbackImage from "../../assets/no-image.svg";

interface Product {
  _id: string;
  name: string;
  price: number;
  image?: string;
}

interface Shop {
  _id: string;
  name: string;
  category: string;
  location: string;
  address: string;
  image?: string;
  products: Product[];
}

const ShopDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/shops/${id}`)
      .then((res) => {
        if (res.data) {
          setShop(res.data);
        } else {
          setShop(sampleShops[0]);
        }
        setLoading(false);
      })
      .catch(() => {
        setShop(sampleShops[0]);
        setLoading(false);
      });
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
            <div key={i} className="product-card">
              <Shimmer className="rounded" style={{ height: 120 }} />
              <Shimmer style={{ height: 16, marginTop: 8 }} />
              <Shimmer style={{ height: 16, width: "50%", marginBottom: 8 }} />
            </div>
          ))}
        </div>
      </div>
    );

  return (
    <div className="shop-details">
      <div className="header">
        <img
          src={shop.image || "https://via.placeholder.com/500x250"}
          alt={shop.name}
          onError={(e) => (e.currentTarget.src = fallbackImage)}
        />
        <div className="info">
          <h2>{shop.name}</h2>
          <p>{shop.category}</p>
          <p>{shop.location}</p>
          <p>{shop.address}</p>
        </div>
      </div>

      <h3 className="section-title">Products</h3>
      <div className="product-list">
        {shop.products.map((product) => (
          <div key={product._id} className="product-card">
            <img
              src={product.image || "https://via.placeholder.com/200"}
              alt={product.name}
              onError={(e) => (e.currentTarget.src = fallbackImage)}
            />
            <h4>{product.name}</h4>
            <p>₹{product.price}</p>
            <button
              onClick={() =>
                dispatch(
                  addToCart({
                    id: product._id,
                    name: product.name,
                    price: product.price,
                    quantity: 1,
                    image: product.image,
                  })
                )
              }
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShopDetails;
