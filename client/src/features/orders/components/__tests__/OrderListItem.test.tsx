import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import OrderListItem from '../OrderListItem';
import type { Order } from '@/store/orders';

const order: Order = {
  id: 'order-123456',
  type: 'product',
  status: 'confirmed',
  items: [
    {
      id: 'item-1',
      title: 'Cold pressed groundnut oil',
      qty: 1,
      unitPricePaise: 49900,
      subtotalPaise: 49900,
      image: 'https://cdn.example.com/oil.jpg',
    },
    {
      id: 'item-2',
      title: 'Stone-ground turmeric powder',
      qty: 2,
      unitPricePaise: 19900,
      subtotalPaise: 39800,
      image: 'https://cdn.example.com/turmeric.jpg',
    },
  ],
  totals: {
    itemsPaise: 89700,
    discountPaise: 5000,
    taxPaise: 1200,
    shippingPaise: 0,
    grandPaise: 85900,
  },
  fulfillment: { type: 'delivery' },
  shippingAddress: { name: 'Aditi Sharma' },
  notes: '',
  currency: 'INR',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  timeline: [],
  customer: { id: 'user-1', name: 'Aditi' },
  shop: { id: 'shop-1', name: 'Sainath Organics' },
  payment: { method: 'UPI', status: 'Paid' },
  cancel: null,
  rating: null,
  review: null,
  contactSharedAt: null,
};

describe('OrderListItem', () => {
  it('matches snapshot', () => {
    render(
      <OrderListItem
        order={order}
        onView={vi.fn()}
        onTrack={vi.fn()}
        onInvoice={vi.fn()}
        onReorder={vi.fn()}
      />,
    );

    const snapshot = {
      heading: screen.getByText(/Order #/i).textContent,
      status: screen.getByText('confirmed').textContent,
      total: screen.getByText('₹859.00').textContent,
      shop: screen.getByText(/Sainath Organics/).textContent,
    };

    expect(snapshot).toMatchInlineSnapshot(
      `{
  "heading": "Order #123456",
  "shop": "Sainath Organics • 2 items",
  "status": "confirmed",
  "total": "₹859.00",
}`,
    );
  });
});
