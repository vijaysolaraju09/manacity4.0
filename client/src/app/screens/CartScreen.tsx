import { useCallback, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CreditCard, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { Badge, Button, Card, IconButton } from '@/app/components/primitives'
import { selectCartItems, selectItemCount, selectSubtotalPaise } from '@/store/slices/cartSlice'
import { useCartActions } from '@/hooks/useCartActions'
import showToast from '@/components/ui/Toast'
import { paths } from '@/routes/paths'
import { formatINR } from '@/utils/currency'

const QuantityControl = ({
  value,
  onChange,
}: {
  value: number
  onChange: (nextValue: number) => void
}) => (
  <div className="inline-flex items-center rounded-full border border-default bg-surface-1 text-primary shadow-sm-theme">
    <button
      type="button"
      aria-label="Decrease quantity"
      onClick={() => onChange(Math.max(1, value - 1))}
      className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-surface-2"
    >
      <Minus className="h-4 w-4" />
    </button>
    <span className="min-w-[2.5rem] text-center text-sm font-medium">{value}</span>
    <button
      type="button"
      aria-label="Increase quantity"
      onClick={() => onChange(value + 1)}
      className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-surface-2"
    >
      <Plus className="h-4 w-4" />
    </button>
  </div>
)

const CartScreen = () => {
  const navigate = useNavigate()
  const items = useSelector(selectCartItems)
  const itemCount = useSelector(selectItemCount)
  const subtotalPaise = useSelector(selectSubtotalPaise)
  const { updateCartQuantity, removeFromCart, clearCart } = useCartActions()
  const isEmpty = items.length === 0

  const { serviceFeePaise, totalPaise } = useMemo(() => {
    const serviceFee = Math.round(subtotalPaise * 0.04)
    return {
      serviceFeePaise: serviceFee,
      totalPaise: subtotalPaise + serviceFee,
    }
  }, [subtotalPaise])

  const handleNavigateShops = useCallback(() => {
    navigate(paths.shops())
  }, [navigate])

  const handleCheckout = useCallback(() => {
    if (isEmpty) {
      showToast('Add items to your cart before checking out', 'info')
      return
    }
    navigate(paths.checkout())
  }, [isEmpty, navigate])

  const handleClear = useCallback(() => {
    if (items.length === 0) return
    clearCart()
    showToast('Cart cleared', 'info')
  }, [clearCart, items.length])

  const handleQuantityChange = useCallback(
    (productId: string, shopId: string, nextQty: number, variantId?: string) => {
      updateCartQuantity({ productId, shopId, qty: nextQty, variantId })
    },
    [updateCartQuantity],
  )

  const handleRemove = useCallback(
    (productId: string, shopId: string, variantId?: string) => {
      removeFromCart({ productId, shopId, variantId })
      showToast('Removed from cart', 'info')
    },
    [removeFromCart],
  )

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

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 space-y-4">
          <Card className="rounded-3xl p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-primary">Items & experiences</h2>
                <p className="text-sm text-muted">
                  {itemCount} item{itemCount === 1 ? '' : 's'} ready for checkout
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="ghost" icon={ArrowLeft} onClick={handleNavigateShops}>
                  Back to shops
                </Button>
                <Button variant="outline" icon={Trash2} onClick={handleClear} disabled={items.length === 0}>
                  Clear cart
                </Button>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-default p-6 text-center text-sm text-muted">
                  <p>Your cart is empty. Add items from shops or services to get started.</p>
                  <Button variant="primary" className="mt-4" onClick={handleNavigateShops}>
                    Start exploring
                  </Button>
                </div>
              ) : (
                items.map((item) => (
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
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                      <QuantityControl
                        value={item.qty}
                        onChange={(value) => handleQuantityChange(item.productId, item.shopId, value, item.variantId)}
                      />
                      <span className="text-sm font-semibold text-primary">{formatINR(item.pricePaise * item.qty)}</span>
                      <IconButton
                        icon={Trash2}
                        label={`Remove ${item.name}`}
                        onClick={() => handleRemove(item.productId, item.shopId, item.variantId)}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="w-full max-w-[360px] space-y-6">
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
            <Button
              variant="primary"
              icon={CreditCard}
              className="mt-5 w-full"
              onClick={handleCheckout}
              disabled={isEmpty}
            >
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
