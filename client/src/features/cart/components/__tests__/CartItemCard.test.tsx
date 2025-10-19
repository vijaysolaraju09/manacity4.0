import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnimatePresence } from 'framer-motion';

import CartItemCard from '../CartItemCard';
import type { CartDisplayItem } from '../../types';

const item: CartDisplayItem = {
  productId: 'p1',
  shopId: 's1',
  name: 'Organic Alphonso Mangoes',
  image: 'https://cdn.example.com/mango.jpg',
  qty: 2,
  unitPricePaise: 29900,
  lineTotalPaise: 59800,
  brand: 'Fresh Farm',
  variantLabels: ['1kg box'],
  availabilityLabel: 'In stock',
  deliveryMessage: 'Delivery by Tue, Oct 21 • Free above ₹499',
};

describe('CartItemCard', () => {
  it('matches snapshot', () => {
    render(
      <AnimatePresence>
        <CartItemCard
          item={item}
          selected
          onSelectChange={vi.fn()}
          onQtyChange={vi.fn()}
          onRemove={vi.fn()}
          onSaveForLater={vi.fn()}
        />
      </AnimatePresence>,
    );

    const snapshot = {
      name: screen.getByText('Organic Alphonso Mangoes').textContent,
      qtyLabel: screen.getByText('Qty').textContent,
      unitPrice: screen.getByText('₹299.00').textContent,
      total: screen.getByText('₹598.00').textContent,
      badge: screen.getByText(/In stock/i).textContent,
    };

    expect(snapshot).toMatchInlineSnapshot(
      `{
  "badge": "In stock",
  "name": "Organic Alphonso Mangoes",
  "qtyLabel": "Qty",
  "total": "₹598.00",
  "unitPrice": "₹299.00",
}`,
    );
  });
});
