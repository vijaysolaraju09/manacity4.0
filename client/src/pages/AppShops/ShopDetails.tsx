import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchShopById, fetchProductsByShop } from '@/store/shops/actions';
import { addToCart, updateQty } from '@/store/cart/actions';
import fallbackImage from '@/assets/no-image.svg';

export default function ShopDetails() {
  const { shopId = '' } = useParams();
  const nav = useNavigate();
  const dispatch = useAppDispatch();
  const shopState = useAppSelector((s) => s.shops);
  const products = shopState.products ?? [];
  const shop = (shopState.item ?? shopState.items?.find((x) => x._id === shopId)) ?? null;
  const coverImage = shop?.cover || shop?.banner || shop?.image || null;
  const [productQuery, setProductQuery] = useState('');
  const [sort, setSort] = useState<'priceAsc' | 'priceDesc' | 'none'>('none');

  useEffect(() => {
    if (!shopId) return;
    void dispatch(fetchShopById(shopId));
    void dispatch(fetchProductsByShop(shopId));
  }, [dispatch, shopId]);

  const shown = useMemo(() => {
    let arr = Array.isArray(products) ? [...products] : [];
    const s = productQuery.trim().toLowerCase();
    if (s) {
      arr = arr.filter((p: any) =>
        [p.name, p.description]
          .filter(Boolean)
          .some((v: string) => v.toLowerCase().includes(s)),
      );
    }
    if (sort === 'priceAsc') arr.sort((a: any, b: any) => (a.price ?? a.pricePaise ?? 0) - (b.price ?? b.pricePaise ?? 0));
    if (sort === 'priceDesc') arr.sort((a: any, b: any) => (b.price ?? b.pricePaise ?? 0) - (a.price ?? a.pricePaise ?? 0));
    return arr;
  }, [products, productQuery, sort]);

  return (
    <div className="container mx-auto px-4 py-6">
      <button onClick={() => nav(-1)} className="mb-3 text-accent-500" type="button">
        &larr; Back
      </button>
      <div className="rounded-2xl overflow-hidden border border-borderc/40 bg-surface-1 shadow-inner-card mb-4">
        {coverImage && <img src={coverImage} alt={shop?.name ?? 'Shop cover'} className="w-full h-40 object-cover" />}
        <div className="p-4">
          <h1 className="text-2xl font-bold">{shop?.name ?? 'Shop'}</h1>
          <div className="text-text-muted">{shop?.address ?? 'Address unavailable'}</div>
          <div className="flex items-center gap-3 mt-2 text-sm">
            <span className={`${shop?.isOpen ? 'text-emerald-500' : 'text-red-500'}`}>
              {shop?.isOpen ? 'Open' : 'Closed'}
            </span>
            <span className="text-text-muted">{shop?.category ?? 'General'}</span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <input
              className="rounded-xl border border-borderc/40 bg-surface-1 px-3 py-2"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder="Search products…"
            />
            <select
              className="rounded-xl border border-borderc/40 bg-surface-1 px-3 py-2"
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
            >
              <option value="none">Sort by</option>
              <option value="priceAsc">Price: Low → High</option>
              <option value="priceDesc">Price: High → Low</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((p: any) => {
          const price = typeof p.price === 'number' ? p.price : p.pricePaise ? p.pricePaise / 100 : 0;
          const mrp = typeof p.mrp === 'number' ? p.mrp : p.mrpPaise ? p.mrpPaise / 100 : undefined;
          const discount = mrp && mrp > price ? Math.round((1 - price / mrp) * 100) : undefined;
          return (
            <div key={p._id} className="rounded-xl border border-borderc/40 bg-surface-1 p-3 shadow-inner-card">
              <div
                role="button"
                tabIndex={0}
                onClick={() => nav(`/products/${p._id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    nav(`/products/${p._id}`);
                  }
                }}
                className="h-36 rounded-lg overflow-hidden bg-surface-2 mb-2 grid place-items-center cursor-pointer"
              >
                <img
                  src={p.image || fallbackImage}
                  onError={(e: any) => {
                    e.currentTarget.src = fallbackImage;
                  }}
                  alt={p.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-text-muted">Qty: {p.stock ?? 0}</div>
              <div className="flex items-center gap-2 mt-1">
                <div className="text-lg font-bold">₹{price}</div>
                {mrp && mrp > price && (
                  <>
                    <div className="text-text-muted line-through text-sm">₹{mrp}</div>
                    {typeof discount === 'number' && (
                      <div className="text-emerald-500 text-sm">-{discount}%</div>
                    )}
                  </>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => dispatch(addToCart({ productId: p._id, qty: 1, price, name: p.name }))}
                  className="flex-1 rounded-lg px-3 py-2 text-white bg-gradient-to-r from-accent-500 to-brand-500"
                  type="button"
                >
                  Add to cart
                </button>
                <button
                  onClick={() => dispatch(updateQty({ productId: p._id, delta: -1 }))}
                  className="rounded-lg px-3 py-2 border border-borderc/40"
                  type="button"
                >
                  −
                </button>
                <button
                  onClick={() => dispatch(updateQty({ productId: p._id, delta: +1 }))}
                  className="rounded-lg px-3 py-2 border border-borderc/40"
                  type="button"
                >
                  ＋
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
