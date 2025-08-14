import { useState } from 'react';
import Toolbar from '../components/ui/Toolbar';
import SectionHeader from '../components/ui/SectionHeader';
import StatusChip from '../components/ui/StatusChip';
import {
  ProductCard,
  OrderCard,
  FacetFilterBar,
  QuantityStepper,
  ModalSheet,
  type Product,
} from '../components/base';

const UiPreview = () => {
  const [qty, setQty] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [category, setCategory] = useState('All');
  const [price, setPrice] = useState(50);
  const [rating, setRating] = useState(0);
  const [available, setAvailable] = useState(false);
  const [sort, setSort] = useState('relevance');

  const product: Product = {
    id: '1',
    title: 'Sample Product With A Very Long Name',
    image: 'https://via.placeholder.com/300x400',
    price: 199,
    mrp: 299,
    discount: 33,
  };

  const order = {
    items: [{ id: '1', title: 'Sample', image: 'https://via.placeholder.com/80' }],
    shop: 'Demo Shop',
    date: new Date().toISOString(),
    status: 'pending' as const,
    quantity: 1,
    total: 199,
  };

  return (
    <>
      <Toolbar title={<span>Preview</span>} actions={<button>Action</button>} />
      <div
        className="container"
        style={{
          paddingTop: 'var(--space-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        <SectionHeader title="Featured" href="#" />
        <ProductCard
          product={product}
          ctaLabel="Add to Cart"
          onCtaClick={() => alert('Added to cart')}
        />
        <OrderCard {...order} />
        <FacetFilterBar
          categories={['All', 'Men', 'Women']}
          activeCategory={category}
          onCategoryChange={setCategory}
          price={price}
          minPrice={0}
          maxPrice={100}
          onPriceChange={setPrice}
          rating={rating}
          onRatingChange={setRating}
          available={available}
          onAvailabilityChange={setAvailable}
          sort={sort}
          sortOptions={[
            { value: 'relevance', label: 'Relevance' },
            { value: 'price', label: 'Price' },
          ]}
          onSortChange={setSort}
        />
        <QuantityStepper value={qty} min={1} max={5} onChange={setQty} />
        <button type="button" onClick={() => setSheetOpen(true)}>
          Open Sheet
        </button>
        <ModalSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
          <div style={{ padding: '1rem' }}>Hello from sheet</div>
        </ModalSheet>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <StatusChip status="pending" />
          <StatusChip status="accepted" />
          <StatusChip status="rejected" />
          <StatusChip status="cancelled" />
        </div>
      </div>
    </>
  );
};

export default UiPreview;

