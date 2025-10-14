import { describe, expect, it } from 'vitest';
import { normalizeOrder } from './orders';

describe('normalizeOrder', () => {
  it('converts rupee totals to paise when amounts are in rupees', () => {
    const payload = {
      _id: 'order-rupee',
      status: 'pending',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      customer: { _id: 'customer-1', name: 'Customer One' },
      shop: { _id: 'shop-1', name: 'Shop One' },
      items: [
        {
          _id: 'item-1',
          name: 'Test Item',
          quantity: 2,
          price: 12.5,
        },
      ],
      totals: {
        subtotal: 25,
        discount: 5,
        tax: 2.5,
        shipping: 1.25,
        total: 23.75,
      },
    };

    const order = normalizeOrder(payload);

    expect(order.items[0]?.unitPricePaise).toBe(1250);
    expect(order.items[0]?.subtotalPaise).toBe(2500);
    expect(order.totals.itemsPaise).toBe(2500);
    expect(order.totals.discountPaise).toBe(500);
    expect(order.totals.taxPaise).toBe(250);
    expect(order.totals.shippingPaise).toBe(125);
    expect(order.totals.grandPaise).toBe(2375);
  });

  it('preserves paise totals when provided in paise', () => {
    const payload = {
      _id: 'order-paise',
      status: 'pending',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      customer: { _id: 'customer-2', name: 'Customer Two' },
      shop: { _id: 'shop-2', name: 'Shop Two' },
      items: [
        {
          _id: 'item-2',
          name: 'Another Item',
          quantity: 3,
          price: 4500,
        },
      ],
      itemsTotal: 13500,
      discountTotal: 1500,
      taxTotal: 675,
      shippingFee: 250,
      grandTotal: 12925,
    } as any;

    const order = normalizeOrder(payload);

    expect(order.items[0]?.unitPricePaise).toBe(4500);
    expect(order.items[0]?.subtotalPaise).toBe(13500);
    expect(order.totals.itemsPaise).toBe(13500);
    expect(order.totals.discountPaise).toBe(1500);
    expect(order.totals.taxPaise).toBe(675);
    expect(order.totals.shippingPaise).toBe(250);
    expect(order.totals.grandPaise).toBe(12925);
  });
});
