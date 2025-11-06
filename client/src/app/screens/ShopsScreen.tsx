import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { MapPin, Star } from 'lucide-react'
import type { AppDispatch, RootState } from '@/store'
import { fetchShops, type Shop } from '@/store/shops'
import { Badge, Button, Card, Chip } from '@/app/components/primitives'

const toStatus = (shop: Shop): { tone: 'success' | 'accent' | 'neutral'; label: string } => {
  if (shop.isOpen === false) return { tone: 'neutral', label: 'Closed' }
  if (shop.status === 'approved') return { tone: 'success', label: 'Open now' }
  if (shop.status === 'pending') return { tone: 'accent', label: 'Pending approval' }
  return { tone: 'neutral', label: 'Unavailable' }
}

const ShopsScreen = () => {
  const dispatch = useDispatch<AppDispatch>()
  const shopsState = useSelector((state: RootState) => state.shops)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    if (shopsState.status === 'idle') {
      void dispatch(fetchShops({ pageSize: 24, sort: '-createdAt' }))
    }
  }, [dispatch, shopsState.status])

  const categories = useMemo(() => {
    const set = new Set<string>()
    ;(shopsState.items ?? []).forEach((shop) => {
      if (shop.category) {
        set.add(shop.category)
      }
    })
    return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [shopsState.items])

  const filtered = useMemo(() => {
    if (!shopsState.items) return []
    if (filter === 'All') return shopsState.items
    const normalized = filter.toLowerCase()
    return shopsState.items.filter((shop) => shop.category?.toLowerCase() === normalized)
  }, [filter, shopsState.items])

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-primary">Explore curated shops</h1>
            <p className="text-sm text-muted">Browse verified partners and independent businesses offering concierge-grade service.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {categories.map((name) => (
              <Chip key={name} active={filter === name} onClick={() => setFilter(name)}>
                {name}
              </Chip>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 ? (
          <Card className="rounded-3xl p-6">
            <p className="text-sm text-muted">No shops available for the selected category.</p>
          </Card>
        ) : (
          filtered.map((shop) => {
            const status = toStatus(shop)
            return (
              <Card key={shop._id} className="rounded-3xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-primary">{shop.name}</h2>
                    <p className="mt-1 text-sm text-muted">{shop.category || 'Independent merchant'}</p>
                  </div>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>
                <div className="mt-4 flex items-center gap-4 text-sm text-muted">
                  <span className="inline-flex items-center gap-1 text-primary">
                    <Star className="h-4 w-4 text-[var(--accent)]" />
                    {(shop.ratingAvg ?? 0).toFixed(1)}
                  </span>
                  {shop.ratingCount ? <span>{shop.ratingCount} reviews</span> : null}
                  {shop.location ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {shop.location}
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {shop.address ? <Badge tone="neutral">{shop.address.split(',')[0]}</Badge> : null}
                  <Badge tone="neutral">{shop.status}</Badge>
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <Button variant="primary">Visit shop</Button>
                  <Button variant="ghost">Save</Button>
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}

export default ShopsScreen
