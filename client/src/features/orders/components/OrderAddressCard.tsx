import { MapPin, Phone, User } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { Order, OrderAddress } from '@/store/orders';

type OrderAddressCardProps = {
  address?: OrderAddress | null;
  fulfillment: Order['fulfillment'];
};

const OrderAddressCard = ({ address, fulfillment }: OrderAddressCardProps) => {
  const lines = [address?.address1, address?.address2, address?.landmark, address?.city, address?.pincode]
    .filter(Boolean)
    .join(', ');

  return (
    <Card className="rounded-3xl border border-[color:var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-card)_92%,transparent)] shadow-sm dark:border-[color:var(--border-subtle)]/60 dark:bg-[color-mix(in_srgb,var(--surface-card)_70%,transparent)]">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Delivery details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-ink-500 dark:text-ink-500">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4" aria-hidden="true" />
          <span>{address?.name ?? 'Recipient'}</span>
        </div>
        {address?.phone ? (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4" aria-hidden="true" />
            <a href={`tel:${address.phone}`} className="text-[var(--brand-600)] hover:underline dark:text-[var(--brand-400)]">
              {address.phone}
            </a>
          </div>
        ) : null}
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4" aria-hidden="true" />
          <span>{lines || 'Address details will be shared closer to delivery.'}</span>
        </div>
        <div className="rounded-2xl border border-[color:var(--brand-200)] bg-[color-mix(in_srgb,var(--brand-500)_12%,transparent)] px-4 py-3 text-xs text-[var(--brand-600)] dark:border-[color:var(--brand-400)]/40 dark:bg-[color-mix(in_srgb,var(--brand-500)_18%,transparent)] dark:text-[var(--brand-400)]">
          {fulfillment.type === 'pickup'
            ? 'Pickup from shop counter when you receive confirmation.'
            : 'Doorstep delivery with live tracking and OTP confirmation.'}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderAddressCard;
