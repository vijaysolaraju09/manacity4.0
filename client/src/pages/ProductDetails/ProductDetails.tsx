import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Shimmer from '../../components/Shimmer';
import detailStyles from '../Products/ProductDetail.module.scss';
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
import AddToCartButton from '@/components/ui/AddToCartButton';

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
      <div className="space-y-6">
        <div className={detailStyles.wrap}>
          <div className={detailStyles.media}>
            <Shimmer style={{ width: '100%', height: 320 }} className="rounded-2xl" />
            <Shimmer style={{ width: '100%', height: 80 }} className="rounded-xl" />
          </div>
          <div className={detailStyles.info}>
            <Shimmer style={{ height: 32, width: '60%' }} />
            <Shimmer style={{ height: 20, width: '40%' }} />
            <Shimmer style={{ height: 120, width: '100%' }} />
            <Shimmer style={{ height: 48, width: '50%' }} />
          </div>
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

  const relatedItems = Array.isArray(related) ? related : [];
  const hasThumbnails = images.length > 1;

  return (
    <div className="space-y-8">
      <div className={detailStyles.wrap}>
        <div className={detailStyles.media}>
          <div className={detailStyles.gallery}>
            <div className={detailStyles.mainImage}>
              <img
                src={images[activeImg] || fallbackImage}
                alt={product.name}
                loading="lazy"
                onError={(e) => (e.currentTarget.src = fallbackImage)}
              />
            </div>
            {hasThumbnails && (
              <div className={detailStyles.thumbnails}>
                {images.map((img: string, i: number) => (
                  <button
                    key={`${img}-${i}`}
                    type="button"
                    className={`${detailStyles.thumbnailButton} ${
                      i === activeImg ? detailStyles.thumbnailActive : ''
                    }`}
                    onClick={() => setActiveImg(i)}
                  >
                    <img
                      src={img}
                      alt={`${product.name} ${i + 1}`}
                      loading="lazy"
                      onError={(e) => (e.currentTarget.src = fallbackImage)}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className={detailStyles.info}>
          <h1 className={detailStyles.title}>{product.name}</h1>
          <PriceBlock
            pricePaise={product.pricePaise}
            mrpPaise={product.mrpPaise}
            discountPercent={product.discountPercent}
            className={detailStyles.priceBlock}
          />
          <div className={detailStyles.collapsibles}>
            <details open>
              <summary>Description</summary>
              <p>{product.description || 'No description available.'}</p>
            </details>
            <details>
              <summary>Reviews</summary>
              <p>No reviews yet.</p>
            </details>
          </div>
          <div className={detailStyles.actions}>
            <div className={detailStyles.quantityWrapper}>
              <QuantityStepper value={qty} onChange={setQty} min={1} />
            </div>
            <AddToCartButton product={product} qty={qty}>
              Add to Cart
            </AddToCartButton>
          </div>
        </div>
      </div>

      <section className={detailStyles.related}>
        <SectionHeader title="Related Products" />
        {relatedItems.length > 0 ? (
          <HorizontalCarousel>
            {relatedItems.map((p: any) => (
              <div key={p._id} className={detailStyles.relatedCard}>
                <ProductCard product={p} showActions={false} />
              </div>
            ))}
          </HorizontalCarousel>
        ) : (
          <p className={detailStyles.feedback}>No related products yet.</p>
        )}
      </section>
    </div>
  );
};

export default ProductDetails;
