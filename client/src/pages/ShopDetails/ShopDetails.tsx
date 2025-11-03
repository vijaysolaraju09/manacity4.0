import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AiFillStar } from 'react-icons/ai';
import { FiPhone, FiArrowLeft, FiShare2, FiMinus, FiPlus, FiShoppingCart } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { fetchShopById, fetchProductsByShop } from '@/store/shops';
import { selectByShop, selectItemCount, type CartItem } from '@/store/slices/cartSlice';
import { useCartActions } from '@/hooks/useCartActions';
import { paths } from '@/routes/paths';
import Shimmer from '../../components/Shimmer';
import ProductCard, {
  type Product as ProductCardProduct,
} from '../../components/ui/ProductCard.tsx';
import SkeletonProductCard from '../../components/ui/Skeletons/SkeletonProductCard';
import EmptyState from '../../components/ui/EmptyState';
import showToast from '../../components/ui/Toast';
import productCardStyles from '../../components/ui/ProductCard.module.scss';
import shopStyles from '../Shops/ShopDetail.module.scss';
import fallbackImage from '../../assets/no-image.svg';

const ShopDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const {
    item: shop,
    products = [],
    status,
    error,
  } = useSelector((s: RootState) => s.shops);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('relevance');
  const [tab, setTab] = useState<'all' | 'available'>('all');
  const { updateCartQuantity, removeFromCart } = useCartActions();
  const cartCount = useSelector(selectItemCount);

  const shopId = shop?._id ?? '';
  const cartSelector = useMemo(() => (shopId ? selectByShop(shopId) : null), [shopId]);
  const cartItems = useSelector((state: RootState) =>
    cartSelector ? cartSelector(state) : ([] as CartItem[]),
  );
  const cartQuantities = useMemo(() => {
    return cartItems.reduce<Record<string, number>>((acc, item) => {
      acc[item.productId] = (acc[item.productId] ?? 0) + item.qty;
      return acc;
    }, {});
  }, [cartItems]);

  useEffect(() => {
    if (id) {
      dispatch(fetchShopById(id));
      dispatch(fetchProductsByShop(id));
    }
  }, [id, dispatch]);

  const filtered = useMemo(() => {
    const bySearch = products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()),
    );
    const byTab = tab === 'available' ? bySearch.filter((p) => p.available) : bySearch;
    const sorted = [...byTab];
    const getPricePaise = (product: any): number => {
      const value = typeof product.pricePaise === 'number' ? product.pricePaise : 0;
      return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
    };
    if (sort === 'priceAsc') sorted.sort((a, b) => getPricePaise(a) - getPricePaise(b));
    if (sort === 'priceDesc') sorted.sort((a, b) => getPricePaise(b) - getPricePaise(a));
    return sorted;
  }, [products, search, sort, tab]);

  if (status === 'loading' || !shop)
    return (
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <div className={shopStyles.header}>
          <Shimmer style={{ width: '100%', height: 200 }} className="rounded-2xl" />
        </div>
        <div className={shopStyles.products}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonProductCard key={i} />
          ))}
        </div>
      </div>
    );

  if (status === 'failed' || !shop)
    return (
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <EmptyState message={error || 'Failed to load shop'} />
      </div>
    );

  const galleryImages = Array.isArray((shop as any)?.gallery)
    ? (shop as any).gallery
    : Array.isArray((shop as any)?.images)
    ? (shop as any).images
    : [];
  const displayGallery = galleryImages.filter((img: unknown) => typeof img === 'string' && img).slice(0, 3);
  const description = (shop as any)?.description || (shop as any)?.about;

  const cartButtonAriaLabel =
    cartCount > 0
      ? `View cart (${cartCount === 1 ? '1 item' : `${cartCount} items`})`
      : 'View cart';

  return (
    <div className="space-y-4 px-4 py-6 md:px-6 lg:px-8">
      <div className="flex items-center gap-3 text-text-secondary">
        <button
          type="button"
          onClick={() => window.history.back()}
          aria-label="Back"
          className="rounded-full border border-borderc/40 p-2 hover:text-gray-800"
        >
          <FiArrowLeft />
        </button>
        {shop.contact && (
          <a
            className="rounded-full border border-borderc/40 p-2 hover:text-gray-800"
            href={`tel:${shop.contact}`}
            aria-label="Call"
          >
            <FiPhone />
          </a>
        )}
        <button
          type="button"
          className="rounded-full border border-borderc/40 p-2 hover:text-gray-800"
          onClick={() => {
            if (navigator.share) {
              void navigator.share({ title: shop.name, url: window.location.href });
            } else {
              void navigator.clipboard.writeText(window.location.href);
              showToast('Link copied');
            }
          }}
          aria-label="Share"
        >
          <FiShare2 />
        </button>
        <button
          type="button"
          className="relative rounded-full border border-borderc/40 p-2 hover:text-gray-800"
          onClick={() => navigate(paths.cart())}
          aria-label={cartButtonAriaLabel}
        >
          <FiShoppingCart />
          {cartCount > 0 ? (
            <span
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-semibold text-white"
              aria-label={cartCount === 1 ? '1 item in cart' : `${cartCount} items in cart`}
            >
              {cartCount}
            </span>
          ) : null}
        </button>
      </div>

      <div className={shopStyles.header}>
        <div className="flex flex-col gap-4 lg:flex-row">
          <img
            className="h-44 w-full rounded-2xl object-cover lg:h-52 lg:w-64"
            src={shop.banner || shop.image || fallbackImage}
            alt={shop.name}
            onError={(e) => (e.currentTarget.src = fallbackImage)}
          />
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-text-primary">{shop.name}</h2>
              {typeof shop.ratingAvg === 'number' && Number.isFinite(shop.ratingAvg) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1 text-sm text-text-secondary">
                  <AiFillStar className="text-yellow-500" />
                  {shop.ratingAvg.toFixed(1)}
                </span>
              )}
            </div>
            <p className="text-sm text-text-secondary">{shop.address || shop.location}</p>
            <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
              {shop.category && <span className="rounded-full bg-surface-2 px-3 py-1">{shop.category}</span>}
              {shop.isOpen !== undefined && (
                <span className="rounded-full bg-surface-2 px-3 py-1">
                  {shop.isOpen ? 'Open now' : 'Closed'}
                </span>
              )}
              {shop.contact && <span className="rounded-full bg-surface-2 px-3 py-1">{shop.contact}</span>}
            </div>
          </div>
        </div>
      </div>

      {displayGallery.length > 0 && (
        <div className={shopStyles.gallery}>
          {displayGallery.map((img: string, index: number) => (
            <img
              key={index}
              src={img}
              alt={`Gallery image ${index + 1}`}
              className="h-28 w-full rounded-xl object-cover"
              onError={(e) => (e.currentTarget.src = fallbackImage)}
            />
          ))}
        </div>
      )}

      {description && (
        <div className={shopStyles.about}>
          <h3 className="text-lg font-semibold text-text-primary">About</h3>
          <p className="mt-2 text-sm text-text-secondary">{description}</p>
        </div>
      )}

      <div className="rounded-2xl border border-borderc/40 bg-surface-1 p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              tab === 'all' ? 'bg-gray-900 text-white' : 'bg-surface-2 text-text-secondary'
            }`}
            onClick={() => setTab('all')}
          >
            All Products
          </button>
          <button
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              tab === 'available' ? 'bg-gray-900 text-white' : 'bg-surface-2 text-text-secondary'
            }`}
            onClick={() => setTab('available')}
          >
            Available
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            type="text"
            placeholder="Search products"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-borderc/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-500)] md:max-w-md"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="w-full rounded-xl border border-borderc/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-500)] md:w-48"
          >
            <option value="relevance">Sort: Relevance</option>
            <option value="priceAsc">Price: Low to High</option>
            <option value="priceDesc">Price: High to Low</option>
          </select>
        </div>
      </div>

      <div className={shopStyles.products}>
        {filtered.length === 0 ? (
          <EmptyState message="No products found" />
        ) : (
          filtered.map((product) => {
            const cardProduct = buildCardProduct(product);
            const quantity = cartQuantities[cardProduct._id] ?? 0;
            const variantId =
              typeof (product as { variantId?: unknown }).variantId === 'string'
                ? ((product as { variantId?: string }).variantId ?? '').trim() || undefined
                : undefined;
            const productShopId =
              typeof (cardProduct as { shopId?: unknown }).shopId === 'string'
                ? ((cardProduct as { shopId?: string }).shopId ?? '').trim() || undefined
                : undefined;
            const identifiers = {
              productId: cardProduct._id,
              shopId: productShopId ?? shopId,
              variantId,
            };
            const decrease = () => {
              const nextQty = quantity - 1;
              if (nextQty <= 0) {
                removeFromCart(identifiers);
                showToast('Removed from cart');
              } else {
                updateCartQuantity({ ...identifiers, qty: nextQty });
              }
            };
            const increase = () => {
              updateCartQuantity({ ...identifiers, qty: quantity + 1 });
            };
            const actions =
              quantity > 0 ? (
                <div className={productCardStyles.quantityControls}>
                  <button
                    type="button"
                    onClick={decrease}
                    aria-label={`Decrease quantity of ${cardProduct.name}`}
                  >
                    <FiMinus />
                  </button>
                  <span aria-live="polite">{quantity}</span>
                  <button
                    type="button"
                    onClick={increase}
                    aria-label={`Increase quantity of ${cardProduct.name}`}
                  >
                    <FiPlus />
                  </button>
                </div>
              ) : undefined;
            return (
              <ProductCard
                key={product._id}
                product={cardProduct}
                actions={actions}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

const buildCardProduct = (product: any): ProductCardProduct => {
  const pricePaise =
    typeof product?.pricePaise === 'number' && Number.isFinite(product.pricePaise)
      ? Math.max(0, Math.round(product.pricePaise))
      : 0;
  const mrpPaise =
    typeof product?.mrpPaise === 'number' && Number.isFinite(product.mrpPaise)
      ? Math.max(0, Math.round(product.mrpPaise))
      : undefined;
  const discountPercent =
    typeof product?.discountPercent === 'number' && Number.isFinite(product.discountPercent)
      ? Math.max(0, Math.round(product.discountPercent))
      : mrpPaise && mrpPaise > 0
      ? Math.max(
          0,
          Math.round(
            ((Math.max(0, mrpPaise) - Math.max(0, pricePaise)) / Math.max(1, mrpPaise)) * 100,
          ),
        )
      : undefined;

  return {
    ...product,
    pricePaise,
    mrpPaise,
    discountPercent,
  } as ProductCardProduct;
};

export default ShopDetails;
