import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { MapPin, Search, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { AppDispatch, RootState } from '@/store'
import { fetchShops, type Shop } from '@/store/shops'
import { Badge, Button, Card, Chip, Input } from '@/app/components/primitives'
import { paths } from '@/routes/paths'

const toStatus = (shop: Shop): { tone: 'success' | 'accent' | 'neutral'; label: string } => {
  if (shop.isOpen === false) return { tone: 'neutral', label: 'Closed' }
  if (shop.status === 'approved') return { tone: 'success', label: 'Open now' }
  if (shop.status === 'pending') return { tone: 'accent', label: 'Pending approval' }
  return { tone: 'neutral', label: 'Unavailable' }
}

const ShopsScreen = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const shopsState = useSelector((state: RootState) => state.shops)
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')

  const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value)
  }, [])

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
    const items = shopsState.items ?? []
    const normalizedFilter = filter.toLowerCase()
    const normalizedQuery = query.trim().toLowerCase()
    return items.filter((shop) => {
      const matchesCategory =
        filter === 'All' || shop.category?.toLowerCase() === normalizedFilter
      const matchesQuery =
        normalizedQuery.length === 0 ||
        shop.name?.toLowerCase().includes(normalizedQuery) ||
        shop.location?.toLowerCase().includes(normalizedQuery)
      return matchesCategory && matchesQuery
    })
  }, [filter, query, shopsState.items])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Explore shops</h1>
        </div>
        <div className="flex w-full flex-col gap-3 md:w-auto md:items-end">
          <Input
            icon={Search}
            value={query}
            onChange={handleSearchChange}
            placeholder="Search shops…"
            className="w-full md:w-[260px]"
            inputClassName="text-sm"
            aria-label="Search shops"
            type="search"
          />
          <div className="flex w-full flex-nowrap gap-3 overflow-x-auto md:flex-wrap md:justify-end">
            {categories.map((name) => (
              <Chip key={name} active={filter === name} onClick={() => setFilter(name)}>
                {name}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 ? (
          <Card className="rounded-3xl p-6">
            <p className="text-sm text-muted">No shops available for the selected category.</p>
          </Card>
        ) : (
          filtered.map((shop) => {
            const status = toStatus(shop)
            const handleVisit = () => navigate(paths.shop(shop._id))
            const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                handleVisit()
              }
            }
            return (
              <Card
                key={shop._id}
                className="rounded-3xl p-5 transition hover:-translate-y-0.5 hover:shadow-lg-theme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_45%,transparent)]"
                role="button"
                tabIndex={0}
                onClick={handleVisit}
                onKeyDown={handleCardKeyDown}
              >
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
                  <Button
                    variant="primary"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleVisit()
                    }}
                  >
                    Visit shop
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={(event) => {
                      event.stopPropagation()
                    }}
                  >
                    Save
                  </Button>
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
