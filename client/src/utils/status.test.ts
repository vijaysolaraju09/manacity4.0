import { describe, expect, it } from 'vitest';
import { mergePreservingStatus } from './status';

describe('mergePreservingStatus', () => {
  it('keeps existing shop status when incoming update omits it', () => {
    const existing = { id: 'shop-1', name: 'Shop', status: 'active' };
    const incoming = { name: 'Updated Shop' };

    const merged = mergePreservingStatus({ existing, incoming });

    expect(merged.status).toBe('active');
    expect(merged.name).toBe('Updated Shop');
  });

  it('keeps product lifecycle status while updating other fields', () => {
    const existing = { id: 'prod-1', status: 'approved', price: 10 };
    const incoming = { price: 12 };

    const merged = mergePreservingStatus({ existing, incoming });

    expect(merged.status).toBe('approved');
    expect(merged.price).toBe(12);
  });

  it('supports custom status keys such as isActive', () => {
    const existing = { id: 'svc-1', isActive: false, name: 'Service' };
    const incoming = { name: 'Updated service' };

    const merged = mergePreservingStatus({ existing, incoming, keys: ['isActive'] });

    expect(merged.isActive).toBe(false);
    expect(merged.name).toBe('Updated service');
  });
});
