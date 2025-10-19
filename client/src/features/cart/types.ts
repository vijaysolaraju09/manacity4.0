export type CartDisplayItem = {
  productId: string;
  shopId: string;
  name: string;
  brand?: string;
  image: string;
  qty: number;
  unitPricePaise: number;
  lineTotalPaise: number;
  mrpPaise?: number;
  variantLabels?: string[];
  productUrl?: string;
  shopUrl?: string;
  availabilityLabel?: string;
  availabilityTone?: 'default' | 'low' | 'out';
  deliveryMessage?: string;
  shippingNote?: string;
};
