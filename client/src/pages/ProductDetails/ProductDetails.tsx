import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../api/client";
import { sampleProduct } from "../../data/sampleData";
import Shimmer from "../../components/Shimmer";
import "./ProductDetails.scss";
import { useDispatch } from "react-redux";
import { addToCart } from "../../store/slices/cartSlice";
import fallbackImage from "../../assets/no-image.svg";

interface Product {
  _id: string;
  name: string;
  image?: string;
  price: number;
  description: string;
  category: string;
  shopName?: string;
  discount?: number;
}

const ProductDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/products/${id}`)
      .then((res) => {
        if (res.data) {
          setProduct(res.data);
        } else {
          setProduct(sampleProduct);
        }
        setLoading(false);
      })
      .catch(() => {
        setProduct(sampleProduct);
        setLoading(false);
      });
  }, [id]);

  if (loading || !product)
    return (
      <div className="product-details">
        <Shimmer style={{ width: "100%", height: 300 }} className="rounded" />
        <div className="info">
          <Shimmer style={{ height: 32, width: "60%", margin: "1rem auto" }} />
          <Shimmer style={{ height: 20, width: "40%", margin: "0 auto" }} />
          <Shimmer style={{ height: 24, width: "30%", margin: "1rem auto" }} />
          <Shimmer style={{ height: 80, width: "100%", marginTop: 16 }} />
        </div>
      </div>
    );

  return (
    <div className="product-details">
      <img
        src={
          product.image || "https://via.placeholder.com/600x300?text=Product"
        }
        alt={product.name}
        className="product-img"
        onError={(e) => (e.currentTarget.src = fallbackImage)}
      />

      <div className="info">
        <h1>{product.name}</h1>
        <p className="meta">
          {product.category} {product.shopName ? `• ${product.shopName}` : ""}
        </p>

        <p className="price">
          ₹{product.price}
          {product.discount && (
            <span className="discount"> -{product.discount}%</span>
          )}
        </p>

        <p className="desc">{product.description}</p>

        <button
          className="add-cart-btn"
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
    </div>
  );
};

export default ProductDetails;
