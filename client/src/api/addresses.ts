import { http } from '@/lib/http';
import { toItem, toItems } from '@/lib/response';

export interface AddressCoords {
  lat?: number;
  lng?: number;
}

export interface AddressPayload {
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
  coords?: AddressCoords | null;
}

export interface Address extends AddressPayload {
  id: string;
  lastUsedAt: string | null;
}

const toIdString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const candidate = value as { id?: unknown; _id?: unknown };
    return toIdString(candidate.id ?? candidate._id);
  }
  return undefined;
};

const normalizeAddress = (input: unknown): Address => {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid address payload');
  }

  const value = input as Record<string, unknown>;
  const id = toIdString(value._id ?? value.id);
  if (!id) {
    throw new Error('Address is missing an identifier');
  }

  const label = typeof value.label === 'string' && value.label.trim() ? value.label.trim() : 'Address';
  const line1 = typeof value.line1 === 'string' ? value.line1 : '';
  const line2 = typeof value.line2 === 'string' ? value.line2 : undefined;
  const city = typeof value.city === 'string' ? value.city : '';
  const state = typeof value.state === 'string' ? value.state : '';
  const pincode = typeof value.pincode === 'string' ? value.pincode : '';
  const isDefault = value.isDefault === true;
  const lastUsedAt =
    typeof value.lastUsedAt === 'string' && value.lastUsedAt ? value.lastUsedAt : null;

  const coords = value.coords && typeof value.coords === 'object'
    ? {
        lat: typeof (value.coords as { lat?: unknown }).lat === 'number'
          ? (value.coords as { lat?: number }).lat
          : undefined,
        lng: typeof (value.coords as { lng?: unknown }).lng === 'number'
          ? (value.coords as { lng?: number }).lng
          : undefined,
      }
    : undefined;

  return {
    id,
    label,
    line1,
    line2,
    city,
    state,
    pincode,
    isDefault,
    coords: coords ?? null,
    lastUsedAt,
  } satisfies Address;
};

export const listAddresses = async (): Promise<Address[]> => {
  const response = await http.get('/addresses');
  const items = toItems(response);

  return items
    .map((item) => {
      try {
        return normalizeAddress(item);
      } catch {
        return null;
      }
    })
    .filter((item): item is Address => Boolean(item));
};

export const createAddress = async (payload: AddressPayload): Promise<Address> => {
  const response = await http.post('/addresses', payload);
  return normalizeAddress(toItem(response));
};
