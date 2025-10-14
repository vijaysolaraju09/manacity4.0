import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Shimmer from '../../components/Shimmer';
import './ProductDetails.scss';
import { addItem } from '../../store/slices/cartSlice';
import fallbackImage from '../../assets/no-image.svg';
import PriceBlock from '../../components/ui/PriceBlock';
import HorizontalCarousel from '../../components/ui/HorizontalCarousel';
import ProductCard from '../../components/ui/ProductCard.tsx';
import SectionHeader from '../../components/ui/SectionHeader';
import { QuantityStepper } from '../../components/base';
import { fetchProductById } from '@/store/products';
import { fetchProductsByShop } from '@/store/shops';
import type { RootState } from '@/store';
import ErrorCard from '@/components/common/ErrorCard';
import Empty from '@/components/common/Empty';
import { http } from '@/lib/http';
import { toItem, toErrorMessage } from '@/lib/response';
import showToast from '@/components/ui/Toast';
import { buildCartItemPayload } from '@/lib/cart';

const ProductDetails = () => {
  const { id } = useParams();
  const d = useDispatch<any>();
  const { item: product, status, error } = useSelector((s: RootState) => s.catalog);
  const { products: related } = useSelector((s: RootState) => s.shops);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    if (id) d(fetchProductById(id));
  }, [id, d]);

  useEffect(() => {
    if (product?.shop) d(fetchProductsByShop(product.shop));
  }, [product, d]);

  if (status === 'loading')
    return (
      <div className="product-details">
        <Shimmer style={{ width: '100%', height: 300 }} className="rounded" />
        <div className="info">
          <Shimmer style={{ height: 32, width: '60%', margin: '1rem auto' }} />
          <Shimmer style={{ height: 20, width: '40%', margin: '0 auto' }} />
          <Shimmer style={{ height: 24, width: '30%', margin: '1rem auto' }} />
          <Shimmer style={{ height: 80, width: '100%', marginTop: 16 }} />
        </div>
      </div>
    );
  if (status === 'failed')
    return <ErrorCard msg={error || 'Failed to load product'} onRetry={() => id && d(fetchProductById(id))} />;
  if (status === 'succeeded' && !product) return <Empty msg="No product found." />;
  if (!product) return null;

  const images = product.images?.length
    ? product.images
    : product.image
    ? [product.image]
    : [];

  const handleAdd = async () => {
    try {
      const productId = product._id || (product as any).id;
      if (!productId) {
        showToast('Unable to add this product to cart. Please try again later.', 'error');
        return;
      }
      const res = await http.post('/cart', { productId, quantity: qty });
      const cartItem = toItem(res) as any;
      const payload = buildCartItemPayload({
        product,
        quantity: qty,
        responseItem: cartItem,
      });
      if (!payload) {
        showToast('Unable to determine product details. Please try again.', 'error');
        return;
      }
      d(addItem(payload));
      showToast('Added to cart');
    } catch (err) {
      showToast(toErrorMessage(err), 'error');
    }
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
          {images.map((img: string, i: number) => (
            <img
              key={img + i}
              src={img}
              alt={`${product.name} ${i + 1}`}
              loading="lazy"
              onError={(e) => (e.currentTarget.src = fallbackImage)}
              className={i === activeImg ? 'active' : ''}
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
          {related?.map((p: any) => (
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
