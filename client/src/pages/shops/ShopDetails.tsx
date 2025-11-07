import type { FC } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchShopById, fetchProductsByShop } from '@/store/shops/actions';
import { addToCart } from '@/store/cart/actions';

type Params = {
  shopId?: string;
};

const ShopDetails: FC = () => {
  const { shopId } = useParams<Params>();
  const nav = useNavigate();
  const dispatch = useAppDispatch();
  const { item: shop, products = [], status, error } = useAppSelector((state) => state.shops);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'priceAsc' | 'priceDesc' | 'default'>('default');

  useEffect(() => {
    if (!shopId) return;
    dispatch(fetchShopById(shopId));
    dispatch(fetchProductsByShop(shopId));
  }, [dispatch, shopId]);

  const getProductPriceValue = (product: any): number => {
    if (typeof product?.price === 'number' && Number.isFinite(product.price)) {
      return product.price;
    }
    if (typeof product?.pricePaise === 'number' && Number.isFinite(product.pricePaise)) {
      return product.pricePaise / 100;
    }
    const parsed = Number(product?.price);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const filtered = useMemo(() => {
    let arr = Array.isArray(products) ? [...products] : [];
    const s = q.trim().toLowerCase();
    if (s)
      arr = arr.filter((p) =>
        [p.name, (p as { description?: string }).description]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(s)),
      );
    if (sort === 'priceAsc') arr.sort((a, b) => getProductPriceValue(a) - getProductPriceValue(b));
    if (sort === 'priceDesc') arr.sort((a, b) => getProductPriceValue(b) - getProductPriceValue(a));
    return arr;
  }, [products, q, sort]);

  const resolveCover = () => {
    if (!shop) return undefined;
    const candidate =
      (shop as { cover?: string | null }).cover ??
      (shop as { banner?: string | null }).banner ??
      (shop as { image?: string | null }).image ??
      null;
    return candidate || undefined;
  };

  const formatPrice = (value: unknown, fallbackPaise?: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.round(value * 100) / 100;
    }
    const paise = typeof fallbackPaise === 'number' ? fallbackPaise : Number(fallbackPaise);
    if (Number.isFinite(paise)) {
      return Math.round((paise / 100) * 100) / 100;
    }
    return 0;
  };

  const handleAddToCart = (product: any) => {
    if (!shop) return;
    const priceRupees = formatPrice(product.price, product.pricePaise);
    dispatch(
      addToCart({
        productId: product._id,
        shopId: shop._id ?? shop.id ?? product.shopId,
        qty: 1,
        name: product.name,
        image: product.image,
        price: priceRupees,
        pricePaise: typeof product.pricePaise === 'number' ? product.pricePaise : undefined,
        variantId: product.variantId,
      }),
    );
  };

  if (status === 'loading' && !shop) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col gap-6 px-4 py-10">
        <div className="rounded-xl border border-borderc/40 bg-surface-1 p-6 text-center text-text-muted">
          Loading shop details…
        </div>
      </main>
    );
  }

  if (!shop) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col gap-6 px-4 py-10">
        <button onClick={() => nav(-1)} className="text-accent-500">&larr; Back</button>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-600">
          {error || 'Shop not found.'}
        </div>
      </main>
    );
  }

  const cover = resolveCover();

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <button onClick={() => nav(-1)} className="mb-3 text-accent-500">&larr; Back</button>
      <div className="rounded-2xl overflow-hidden border border-borderc/40 bg-surface-1 shadow-inner-card mb-4">
        {cover && <img src={cover} alt={shop.name} className="w-full h-40 object-cover" />}
        <div className="p-4">
          <h1 className="text-2xl font-bold">{shop.name}</h1>
          <div className="text-text-muted">{shop.address}</div>
          <div className="flex items-center gap-3 mt-2 text-sm">
            <span className={`${shop.isOpen ? 'text-emerald-500' : 'text-red-500'}`}>
              {shop.isOpen ? 'Open' : 'Closed'}
            </span>
            <span className="text-text-muted">{shop.category}</span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <input
              className="rounded-xl border border-borderc/40 bg-surface-1 px-3 py-2"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products…"
            />
            <select
              className="rounded-xl border border-borderc/40 bg-surface-1 px-3 py-2"
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
            >
              <option value="default">Sort by</option>
              <option value="priceAsc">Price: Low → High</option>
              <option value="priceDesc">Price: High → Low</option>
            </select>
          </div>
        </div>
      </div>

      {status === 'failed' ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
          {error || 'Failed to load products.'}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => {
          const priceRupees = formatPrice(p.price, p.pricePaise);
          const mrp = formatPrice(p.mrp, (p as { mrpPaise?: number }).mrpPaise);
          const hasDiscount = mrp > priceRupees && mrp > 0;
          const discount = hasDiscount ? Math.round((1 - priceRupees / mrp) * 100) : 0;
          return (
            <div
              key={p._id}
              className="rounded-xl border border-borderc/40 bg-surface-1 p-3 shadow-inner-card"
            >
              <div className="h-36 rounded-lg overflow-hidden bg-surface-2 mb-2 grid place-items-center">
                {p.image && <img src={p.image} alt={p.name} className="w-full h-full object-cover" />}
              </div>
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-text-muted">Qty: {(p as { stock?: number }).stock ?? 0}</div>
              <div className="flex items-center gap-2 mt-1">
                <div className="text-lg font-bold">₹{priceRupees}</div>
                {hasDiscount ? (
                  <>
                    <div className="text-text-muted line-through text-sm">₹{mrp}</div>
                    <div className="text-emerald-500 text-sm">-{discount}%</div>
                  </>
                ) : null}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => handleAddToCart(p)}
                  className="flex-1 rounded-lg px-3 py-2 text-white bg-gradient-to-r from-accent-500 to-brand-500"
                >
                  Add to cart
                </button>
                {/* +/- controls optional if you have qty control in UI slice */}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-xl border border-borderc/40 bg-surface-1 p-6 text-center text-text-muted">
            {status === 'loading' ? 'Loading products…' : 'No products found.'}
          </div>
        ) : null}
      </div>
    </main>
  );
};

export default ShopDetails;
