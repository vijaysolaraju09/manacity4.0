import { Link } from 'react-router-dom'

interface HeroBannerProps {
  shopsCount: number
  servicesCount: number
  eventsCount: number
}

const formatCount = (value: number) => {
  if (value > 999) {
    return `${Math.floor(value / 100) / 10}k+`
  }
  if (value > 0) {
    return `${value}+`
  }
  return 'New'
}

export default function HeroBanner({ shopsCount, servicesCount, eventsCount }: HeroBannerProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-borderc/40 bg-gradient-to-r from-brand-500 via-accent-500 to-sky-500 p-8 text-white shadow-[0_25px_60px_rgba(14,116,144,0.18)]">
      <div className="absolute inset-0 opacity-[0.18] mix-blend-screen" aria-hidden>
        <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.4),_transparent_55%)]" />
      </div>
      <div className="relative grid gap-8 md:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-4 py-1 text-sm font-medium backdrop-blur">
            Your neighbourhood companion
          </p>
          <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
            Discover shops, services and events curated for your Manacity neighbourhood.
          </h1>
          <p className="max-w-xl text-sm text-white/80 md:text-base">
            Plan your day with confidence – browse trusted local businesses, request services and never miss a community moment.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/shops"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-brand-600 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              Explore shops
              <span aria-hidden>→</span>
            </Link>
            <Link
              to="/events"
              className="inline-flex items-center gap-2 rounded-xl border border-white/60 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Upcoming events
            </Link>
          </div>
        </div>
        <div className="relative grid place-items-center">
          <div className="grid w-full max-w-xs gap-4 rounded-2xl bg-white/12 p-4 backdrop-blur">
            <StatPill label="Shops to explore" value={formatCount(shopsCount)} />
            <StatPill label="Services on-demand" value={formatCount(servicesCount)} />
            <StatPill label="Active events" value={formatCount(eventsCount)} />
          </div>
        </div>
      </div>
    </section>
  )
}

const StatPill = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm">
    <span className="font-medium text-white/90">{label}</span>
    <span className="text-lg font-semibold text-white">{value}</span>
  </div>
)
