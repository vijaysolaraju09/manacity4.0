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
    <Card className="rounded-3xl border border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/70">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Delivery details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4" aria-hidden="true" />
          <span>{address?.name ?? 'Recipient'}</span>
        </div>
        {address?.phone ? (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4" aria-hidden="true" />
            <a href={`tel:${address.phone}`} className="text-blue-600 hover:underline dark:text-blue-300">
              {address.phone}
            </a>
          </div>
        ) : null}
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4" aria-hidden="true" />
          <span>{lines || 'Address details will be shared closer to delivery.'}</span>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
          {fulfillment.type === 'pickup'
            ? 'Pickup from shop counter when you receive confirmation.'
            : 'Doorstep delivery with live tracking and OTP confirmation.'}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderAddressCard;
