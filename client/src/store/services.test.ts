import { describe, expect, it } from 'vitest';
import reducer, { updateService } from './services';
import type { Service } from '@/types/services';

const baseService: Service = {
  _id: 'svc-1',
  id: 'svc-1',
  name: 'Plumbing',
  description: 'Fixes',
  icon: '🛠️',
  isActive: false,
};

const baseState = {
  items: [baseService],
  status: 'idle',
  error: null,
  providers: {
    'svc-1': {
      service: baseService,
      items: [],
      fallback: [],
      status: 'idle',
      error: null,
    },
  },
  detail: {
    serviceId: null,
    currentService: null,
    providers: [],
    loading: false,
    error: null,
  },
  createStatus: 'idle',
  createError: null,
  updateStatus: 'idle',
  updateError: null,
};

describe('services reducer', () => {
  it('preserves isActive when updates omit status fields', () => {
    const payload = { _id: 'svc-1', id: 'svc-1', name: 'Updated plumbing' } as Service;

    const nextState = reducer(
      baseState as any,
      updateService.fulfilled(payload, '', { id: 'svc-1', payload: { name: 'Updated plumbing' } })
    );

    expect(nextState.items[0]?.isActive).toBe(false);
    expect(nextState.providers['svc-1']?.service?.isActive).toBe(false);
  });
});
