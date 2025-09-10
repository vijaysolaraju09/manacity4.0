import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "@/config/api";
import { sampleProduct, sampleShops } from "../../data/sampleData";
import Shimmer from "../../components/Shimmer";
import "./ProductDetails.scss";
import { useDispatch } from "react-redux";
import { addToCart } from "../../store/slices/cartSlice";
import fallbackImage from "../../assets/no-image.svg";
import PriceBlock from "../../components/ui/PriceBlock";
import HorizontalCarousel from "../../components/ui/HorizontalCarousel";
import ProductCard from "../../components/ui/ProductCard.tsx";
import SectionHeader from "../../components/ui/SectionHeader";
import { QuantityStepper } from "../../components/base";

interface Product {
  _id: string;
  name: string;
  image?: string;
  images?: string[];
  price: number;
  mrp?: number;
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
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);

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

  const images = product.images?.length
    ? product.images
    : product.image
    ? [product.image]
    : [];

  const related = sampleShops[0].products;

  const handleAdd = () => {
    dispatch(
      addToCart({
        id: product._id,
        name: product.name,
        price: product.price,
        quantity: qty,
        image: images[0],
      })
    );
  };

  return (
    <div className="product-details">
      <div className="gallery">
        <div className="main-image">
          <img
            src={images[activeImg] || fallbackImage}
            alt={product.name}
            loading="lazy"
            onError={(e) => (e.currentTarget.src = fallbackImage)}
          />
        </div>
        <div className="thumbnails">
          {images.map((img, i) => (
            <img
              key={img + i}
              src={img}
              alt={`${product.name} ${i + 1}`}
              loading="lazy"
              onError={(e) => (e.currentTarget.src = fallbackImage)}
              className={i === activeImg ? "active" : ""}
              onClick={() => setActiveImg(i)}
            />
          ))}
        </div>
      </div>

      <h1 className="title">{product.name}</h1>
      <PriceBlock
        price={product.price}
        mrp={product.mrp}
        discount={product.discount}
        className="price-block"
      />

      <div className="collapsibles">
        <details open>
          <summary>Description</summary>
          <p>{product.description}</p>
        </details>
        <details>
          <summary>Reviews</summary>
          <p>No reviews yet.</p>
        </details>
      </div>

      <section className="related">
        <SectionHeader title="Related Products" />
        <HorizontalCarousel>
          {related.map((p) => (
            <ProductCard key={p._id} product={p} showActions={false} />
          ))}
        </HorizontalCarousel>
      </section>

      <div className="cta-bar">
        <QuantityStepper value={qty} onChange={setQty} min={1} />
        <button className="add-cart-btn" onClick={handleAdd}>
          Add to Cart
        </button>
      </div>
    </div>
  );
};

export default ProductDetails;
