import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchProductById } from '@/store/products/actions';
import { addToCart } from '@/store/cart/actions';
import fallbackImage from '@/assets/no-image.svg';

export default function ProductDetails() {
  const { productId = '' } = useParams();
  const nav = useNavigate();
  const dispatch = useAppDispatch();
  const { item: current, status, error } = useAppSelector((s) => s.catalog);

  useEffect(() => {
    if (productId) {
      void dispatch(fetchProductById(productId));
    }
  }, [dispatch, productId]);

  if (status === 'loading' && !current) return <div className="p-6">Loading…</div>;
  if (error && !current) return <div className="p-6 text-red-500">Failed to load product.</div>;

  const p: any = current || {};
  const price = typeof p.price === 'number' ? p.price : p.pricePaise ? p.pricePaise / 100 : 0;
  const mrp = typeof p.mrp === 'number' ? p.mrp : p.mrpPaise ? p.mrpPaise / 100 : undefined;

  return (
    <div className="container mx-auto px-4 py-6">
      <button onClick={() => nav(-1)} className="mb-3 text-accent-500" type="button">
        &larr; Back
      </button>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl overflow-hidden border border-borderc/40 bg-surface-1 p-0">
          <img
            src={p.image || fallbackImage}
            onError={(e: any) => {
              e.currentTarget.src = fallbackImage;
            }}
            alt={p.name}
            className="w-full h-80 object-cover"
          />
        </div>
        <div className="rounded-2xl border border-borderc/40 bg-surface-1 p-4 shadow-inner-card">
          <h1 className="text-2xl font-bold mb-1">{p.name}</h1>
          <p className="text-text-muted mb-2">{p.description}</p>
          <div className="flex items-center gap-2 mb-4">
            <div className="text-2xl font-bold">₹{price}</div>
            {mrp && mrp > price && <div className="text-text-muted line-through">₹{mrp}</div>}
          </div>
          <div className="text-sm text-text-muted mb-4">Available: {p.stock ?? 0}</div>
          <button
            className="w-full rounded-xl px-4 py-3 text-white bg-gradient-to-r from-accent-500 to-brand-500"
            onClick={() => dispatch(addToCart({ productId: p._id, qty: 1, price, name: p.name }))}
            type="button"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
