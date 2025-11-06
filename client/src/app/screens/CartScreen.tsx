import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { CreditCard, ShoppingBag } from 'lucide-react'
import type { RootState } from '@/store'
import { Badge, Button, Card } from '@/app/components/primitives'

const formatINR = (paise: number) => (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })

const CartScreen = () => {
  const cart = useSelector((state: RootState) => state.cart)

  const { subtotalPaise, serviceFeePaise, totalPaise } = useMemo(() => {
    const subtotal = cart.items.reduce((sum, item) => sum + item.pricePaise * item.qty, 0)
    const serviceFee = Math.round(subtotal * 0.04)
    return {
      subtotalPaise: subtotal,
      serviceFeePaise: serviceFee,
      totalPaise: subtotal + serviceFee,
    }
  }, [cart.items])

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-primary">Cart overview</h1>
            <p className="text-sm text-muted">Review your curated items and services before proceeding to checkout.</p>
          </div>
          <Badge tone="accent">Secure checkout</Badge>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="rounded-3xl p-6">
          <h2 className="text-lg font-semibold text-primary">Items & experiences</h2>
          <div className="mt-4 space-y-4">
            {cart.items.length === 0 ? (
              <p className="text-sm text-muted">Your cart is empty. Add items from shops or services to get started.</p>
            ) : (
              cart.items.map((item) => (
                <div
                  key={`${item.productId}-${item.shopId}-${item.variantId ?? 'default'}`}
                  className="flex flex-col gap-4 rounded-2xl border border-default p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-1 items-start gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
                      <ShoppingBag className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary">{item.name}</p>
                      <p className="mt-1 text-xs text-muted">Product ID: {item.productId}</p>
                      {item.variantId ? <p className="text-xs text-muted">Variant: {item.variantId}</p> : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-primary">
                    <span className="rounded-full border border-default px-3 py-1 text-xs text-muted">Qty {item.qty}</span>
                    <span className="font-semibold">{formatINR(item.pricePaise * item.qty)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
        <div className="space-y-6">
          <Card className="rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-primary">Order summary</h2>
            <div className="mt-4 space-y-3 text-sm text-muted">
              <div className="flex items-center justify-between text-primary">
                <span>Subtotal</span>
                <span className="font-semibold">{formatINR(subtotalPaise)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Concierge services</span>
                <span>{formatINR(serviceFeePaise)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-dashed border-default pt-3 text-primary">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-base font-semibold">{formatINR(totalPaise)}</span>
              </div>
            </div>
            <Button variant="primary" icon={CreditCard} className="mt-5 w-full">
              Proceed to pay
            </Button>
            <p className="mt-3 text-xs text-muted">
              Payments are processed securely. Concierge will confirm delivery windows within 10 minutes.
            </p>
          </Card>
          <Card className="rounded-3xl p-6 text-sm">
            <h3 className="text-sm font-semibold text-primary">Members get complimentary delivery</h3>
            <p className="mt-2 text-muted">
              Use your loyalty points at checkout for curated perks and next-day concierge support.
            </p>
            <Button variant="outline" className="mt-4 w-full">
              Redeem perks
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default CartScreen
