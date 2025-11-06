import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Clock, ShieldCheck, Sparkles, Star } from 'lucide-react'
import type { AppDispatch, RootState } from '@/store'
import { fetchServices } from '@/store/services'
import { Badge, Button, Card, Chip } from '@/app/components/primitives'

const ServicesScreen = () => {
  const dispatch = useDispatch<AppDispatch>()
  const servicesState = useSelector((state: RootState) => state.services)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    if (servicesState.status === 'idle') {
      void dispatch(fetchServices(undefined))
    }
  }, [dispatch, servicesState.status])

  const services = useMemo(() => {
    const items = servicesState.items ?? []
    if (filter === 'active') return items.filter((service) => service.isActive !== false)
    if (filter === 'inactive') return items.filter((service) => service.isActive === false)
    return items
  }, [servicesState.items, filter])

  const totalServices = servicesState.items.length
  const activeServices = servicesState.items.filter((service) => service.isActive !== false).length
  const inactiveServices = totalServices - activeServices

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden rounded-[2rem]">
        <div className="grid gap-6 p-6 md:grid-cols-[1.15fr_0.85fr] md:p-8">
          <div className="space-y-4">
            <Badge tone="accent">Concierge services</Badge>
            <h1 className="text-2xl font-semibold text-primary">Concierge-crafted services tailored for you</h1>
            <p className="text-sm text-muted">
              Choose from vetted providers with transparent workflows and premium support managed by the Manacity concierge team.
            </p>
            <div className="flex flex-wrap gap-3">
              <Badge tone="neutral">{totalServices} services</Badge>
              <Badge tone="success">{activeServices} active</Badge>
              <Badge tone="neutral">{inactiveServices} paused</Badge>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" icon={Sparkles}>
                Submit a request
              </Button>
              <Button variant="outline">View service catalog</Button>
            </div>
          </div>
          <Card className="gradient-card rounded-[2rem] p-6 text-white shadow-md-theme">
            <div className="flex h-full flex-col justify-between gap-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Concierge highlight</h2>
                <p className="text-sm text-white/80">
                  Seamless fulfilment backed by verified partners and detailed progress updates for every request.
                </p>
              </div>
              <div className="space-y-4 text-sm">
                <p className="inline-flex items-center gap-2 text-white/85">
                  <Clock className="h-4 w-4" /> Rapid assignments with concierge oversight
                </p>
                <p className="inline-flex items-center gap-2 text-white/85">
                  <ShieldCheck className="h-4 w-4" /> Providers verified by Manacity
                </p>
                <p className="inline-flex items-center gap-2 text-white/85">
                  <Star className="h-4 w-4" /> Feedback-driven quality controls
                </p>
              </div>
              <Button variant="primary" className="bg-white text-[var(--primary)] shadow-lg-theme">
                Start a request
              </Button>
            </div>
          </Card>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
          All
        </Chip>
        <Chip active={filter === 'active'} onClick={() => setFilter('active')}>
          Active
        </Chip>
        <Chip active={filter === 'inactive'} onClick={() => setFilter('inactive')}>
          Inactive
        </Chip>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {services.length === 0 ? (
          <Card className="rounded-3xl p-6">
            <p className="text-sm text-muted">No services match this filter yet.</p>
          </Card>
        ) : (
          services.map((service) => (
            <Card key={service._id} className="rounded-3xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-primary">{service.name}</h2>
                    <Badge tone={service.isActive === false ? 'neutral' : 'accent'}>
                      {service.isActive === false ? 'Paused' : 'Active'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {service.description || 'Managed concierge service with tailored fulfilment.'}
                  </p>
                </div>
                <Button variant="ghost" className="text-sm text-primary">
                  Request
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

export default ServicesScreen
