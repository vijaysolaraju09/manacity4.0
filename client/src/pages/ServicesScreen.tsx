import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Clock, Search, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { AppDispatch, RootState } from '@/store'
import { fetchServices } from '@/store/services'
import {
  fetchMyServiceRequests,
  acceptPublicServiceRequest,
  fetchPublicServiceRequests,
} from '@/store/serviceRequests'
import { fetchAssignedRequests } from '@/store/providerServiceRequests'
import { Badge, Button, Card, Chip, Input } from '@/components/primitives'
import { paths } from '@/routes/paths'
import showToast from '@/components/ui/Toast'

const ServicesScreen = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const servicesState = useSelector((state: RootState) => state.services)
  const publicRequestsState = useSelector((state: RootState) => state.serviceRequests.publicList)
  const myRequestsState = useSelector((state: RootState) => state.serviceRequests.mine)
  const myServicesState = useSelector((state: RootState) => state.providerServiceRequests)
  const isAuthenticated = Boolean(useSelector((state: RootState) => state.auth.token))
  const currentUserId = useSelector(
    (state: RootState) => state.userProfile.item?.id ?? state.auth.user?.id ?? null,
  )
  const [filter, setFilter] = useState<'all' | 'publicRequests' | 'myRequests' | 'myServices'>('all')
  const [query, setQuery] = useState('')
  const [submitting, setSubmitting] = useState<string | null>(null)

  useEffect(() => {
    if (servicesState.status === 'idle') {
      void dispatch(fetchServices(undefined))
    }
  }, [dispatch, servicesState.status])

  useEffect(() => {
    if (filter === 'publicRequests' && publicRequestsState.status === 'idle') {
      void dispatch(fetchPublicServiceRequests(undefined))
    }
  }, [dispatch, filter, publicRequestsState.status])

  useEffect(() => {
    if (
      isAuthenticated &&
      (filter === 'publicRequests' || filter === 'myRequests') &&
      myRequestsState.status === 'idle'
    ) {
      void dispatch(fetchMyServiceRequests())
    }
  }, [dispatch, filter, isAuthenticated, myRequestsState.status])

  useEffect(() => {
    if (isAuthenticated && filter === 'myServices' && myServicesState.status === 'idle') {
      void dispatch(fetchAssignedRequests())
    }
  }, [dispatch, filter, isAuthenticated, myServicesState.status])

  const normalizedQuery = query.trim().toLowerCase()

  const filteredServices = useMemo(() => {
    const items = servicesState.items ?? []
    return items.filter((service) => {
      if (!normalizedQuery) return true
      return (
        service.name.toLowerCase().includes(normalizedQuery) ||
        (service.description ?? '').toLowerCase().includes(normalizedQuery)
      )
    })
  }, [servicesState.items, normalizedQuery])

  const myRequestIds = useMemo(() => {
    const mine = myRequestsState.items ?? []
    return new Set(mine.map((item) => item._id || item.id))
  }, [myRequestsState.items])

  const filteredPublicRequests = useMemo(() => {
    const items = publicRequestsState.items ?? []
    return items.filter((request) => {
      const isMine =
        myRequestIds.has(request._id) ||
        (!!currentUserId && (request.requesterId === currentUserId || request.acceptedBy === currentUserId))
      if (isMine) return false
      if (!normalizedQuery) return true
      return (
        request.title.toLowerCase().includes(normalizedQuery) ||
        (request.description ?? '').toLowerCase().includes(normalizedQuery)
      )
    })
  }, [publicRequestsState.items, myRequestIds, normalizedQuery, currentUserId])

  const filteredMyRequests = useMemo(() => {
    const items = myRequestsState.items ?? []
    return items.filter((request) => {
      if (!normalizedQuery) return true
      const name = request.service?.name ?? request.customName ?? ''
      return (
        name.toLowerCase().includes(normalizedQuery) ||
        (request.description ?? '').toLowerCase().includes(normalizedQuery)
      )
    })
  }, [myRequestsState.items, normalizedQuery])

  const filteredMyServices = useMemo(() => {
    const items = myServicesState.items ?? []
    return items.filter((request) => {
      if (!normalizedQuery) return true
      const title = request.title || request.serviceName || ''
      return (
        title.toLowerCase().includes(normalizedQuery) ||
        (request.description ?? '').toLowerCase().includes(normalizedQuery)
      )
    })
  }, [myServicesState.items, normalizedQuery])

  const openServiceRequest = useCallback(
    (serviceId?: string, serviceName?: string) => {
      const params = new URLSearchParams()
      if (serviceId) params.set('serviceId', serviceId)
      if (serviceName) params.set('name', serviceName)
      const target = params.toString()
        ? `${paths.services.request()}?${params.toString()}`
        : paths.services.request()
      navigate(target)
    },
    [navigate],
  )

  const statusByFilter = {
    all: servicesState.status,
    publicRequests: publicRequestsState.status,
    myRequests: myRequestsState.status,
    myServices: myServicesState.status,
  } as const

  const errorByFilter = {
    all: servicesState.error,
    publicRequests: publicRequestsState.error,
    myRequests: myRequestsState.error,
    myServices: myServicesState.error,
  } as const

  const currentStatus = statusByFilter[filter]
  const currentError = errorByFilter[filter]

  const handleCardNavigation = useCallback(
    (path: string) => {
      navigate(path)
    },
    [navigate],
  )

  const handleOfferHelp = useCallback(
    async (requestId: string) => {
      setSubmitting(requestId)
      try {
        await dispatch(acceptPublicServiceRequest({ id: requestId })).unwrap()
        showToast('Request accepted. Contact details will be shared with you.', 'success')
        void dispatch(fetchAssignedRequests())
      } catch (error) {
        const message = typeof error === 'string' ? error : 'Unable to accept request'
        showToast(message, 'error')
      } finally {
        setSubmitting(null)
      }
    },
    [dispatch],
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-primary">Services</h1>
          <Button size="sm" onClick={() => openServiceRequest()}>
            Request Service
          </Button>
        </div>
        <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="md:w-[260px]">
            <Input
              icon={Search}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search services…"
              className="w-full"
              inputClassName="text-sm"
              aria-label="Search services"
              type="search"
            />
          </div>
          <div className="flex w-full flex-nowrap gap-3 overflow-x-auto md:flex-1 md:flex-wrap md:justify-end">
            <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
              All
            </Chip>
            <Chip active={filter === 'publicRequests'} onClick={() => setFilter('publicRequests')}>
              Public requests
            </Chip>
            <Chip active={filter === 'myRequests'} onClick={() => setFilter('myRequests')}>
              My service requests
            </Chip>
            <Chip active={filter === 'myServices'} onClick={() => setFilter('myServices')}>
              My services
            </Chip>
          </div>
        </div>
      </div>

      {currentStatus === 'loading' ? (
        <Card className="rounded-3xl p-6">
          <p className="text-sm text-muted">Loading…</p>
        </Card>
      ) : currentError ? (
        <Card className="rounded-3xl p-6">
          <p className="text-sm text-danger">{currentError}</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filter === 'all'
            ? filteredServices.map((service) => (
                <Card
                  key={service._id}
                  className="rounded-3xl p-5 transition hover:-translate-y-0.5 hover:shadow-lg-theme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_45%,transparent)]"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCardNavigation(paths.services.detail(service._id))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleCardNavigation(paths.services.detail(service._id))
                    }
                  }}
                >
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
                    <Button
                      variant="ghost"
                      className="text-sm text-primary"
                      onClick={(event) => {
                        event.stopPropagation()
                        openServiceRequest(service._id, service.name)
                      }}
                    >
                      Request
                    </Button>
                  </div>
                </Card>
              ))
            : null}

          {filter === 'publicRequests'
            ? filteredPublicRequests.map((request) => (
                <Card
                  key={request._id}
                  className="rounded-3xl p-5 transition hover:-translate-y-0.5 hover:shadow-lg-theme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_45%,transparent)]"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCardNavigation(paths.serviceRequests.detail(request._id))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleCardNavigation(paths.serviceRequests.detail(request._id))
                    }
                  }}
                >
                  {(() => {
                    const type = (request.type || '').toLowerCase()
                    const status = (request.status || '').toLowerCase()
                    const isMine =
                      myRequestIds.has(request._id) ||
                      (!!currentUserId &&
                        (request.requesterId === currentUserId || request.acceptedBy === currentUserId))
                    const canOfferHelp =
                      filter === 'publicRequests' &&
                      type === 'public' &&
                      status === 'pending' &&
                      !isMine &&
                      !request.acceptedBy
                    return (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h2 className="text-lg font-semibold text-primary">{request.title}</h2>
                              <Badge tone="accent">Public</Badge>
                            </div>
                            <p className="text-sm text-muted">{request.description}</p>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                              {request.location ? (
                                <span className="inline-flex items-center gap-1">
                                  <ShieldCheck className="h-3.5 w-3.5" /> {request.location}
                                </span>
                              ) : null}
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" /> {request.offersCount} offer(s)
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-3">
                            <Badge tone="neutral">{request.status}</Badge>
                            {canOfferHelp ? (
                              <Button
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  void handleOfferHelp(request._id)
                                }}
                                disabled={submitting === request._id}
                              >
                                {submitting === request._id ? 'Offering help…' : 'Offer help'}
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </Card>
              ))
            : null}

          {filter === 'myRequests'
            ? filteredMyRequests.map((request) => (
                <Card
                  key={request._id}
                  className="rounded-3xl p-5 transition hover:-translate-y-0.5 hover:shadow-lg-theme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_45%,transparent)]"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCardNavigation(paths.serviceRequests.detail(request._id))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleCardNavigation(paths.serviceRequests.detail(request._id))
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-primary">
                          {request.service?.name || request.customName || 'Service request'}
                        </h2>
                        <Badge tone="accent">My request</Badge>
                      </div>
                      <p className="text-sm text-muted">
                        {request.description || 'Managed concierge service with tailored fulfilment.'}
                      </p>
                    </div>
                    <Badge tone="neutral">{request.status}</Badge>
                  </div>
                </Card>
              ))
            : null}

          {filter === 'myServices'
            ? filteredMyServices.map((request) => (
                <Card
                  key={request.id}
                  className="rounded-3xl p-5 transition hover:-translate-y-0.5 hover:shadow-lg-theme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_45%,transparent)]"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCardNavigation(paths.serviceRequests.detail(request.id))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleCardNavigation(paths.serviceRequests.detail(request.id))
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-primary">{request.title}</h2>
                        <Badge tone="accent">Helping</Badge>
                      </div>
                      <p className="text-sm text-muted">{request.description}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                        {request.customerName ? <span>{request.customerName}</span> : null}
                        {request.location ? <span>{request.location}</span> : null}
                        {request.phone ? <span>{request.phone}</span> : null}
                      </div>
                    </div>
                    <Badge tone="neutral">{request.status}</Badge>
                  </div>
                </Card>
              ))
            : null}

          {filter === 'all' && filteredServices.length === 0 ? (
            <Card className="rounded-3xl p-6">
              <p className="text-sm text-muted">No services match this filter yet.</p>
            </Card>
          ) : null}

          {filter === 'publicRequests' && filteredPublicRequests.length === 0 ? (
            <Card className="rounded-3xl p-6">
              <p className="text-sm text-muted">No public requests available.</p>
            </Card>
          ) : null}

          {filter === 'myRequests' && filteredMyRequests.length === 0 ? (
            <Card className="rounded-3xl p-6">
              <p className="text-sm text-muted">You have no service requests yet.</p>
            </Card>
          ) : null}

          {filter === 'myServices' && filteredMyServices.length === 0 ? (
            <Card className="rounded-3xl p-6">
              <p className="text-sm text-muted">You are not helping any requests yet.</p>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default ServicesScreen
