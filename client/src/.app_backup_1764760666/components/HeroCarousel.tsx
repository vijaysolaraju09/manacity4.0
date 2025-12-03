import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card } from './primitives'
import { cn } from '@/utils/cn'

type CarouselAction = {
  label: string
  to?: string
  onClick?: () => void
}

export type HeroCarouselItem = {
  id: string
  highlight?: string
  title: string
  description?: string
  primaryAction?: CarouselAction
  secondaryAction?: CarouselAction
}

interface HeroCarouselProps {
  items: HeroCarouselItem[]
  intervalMs?: number
}

const HeroCarousel = ({ items, intervalMs = 6000 }: HeroCarouselProps) => {
  const [index, setIndex] = useState(0)
  const hasItems = items.length > 0

  useEffect(() => {
    if (!hasItems) return
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length)
    }, intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs, items.length, hasItems])

  const current = useMemo(() => (hasItems ? items[index % items.length] : null), [hasItems, items, index])

  if (!current) {
    return null
  }

  const goNext = () => setIndex((prev) => (prev + 1) % items.length)
  const goPrev = () => setIndex((prev) => (prev - 1 + items.length) % items.length)

  const renderAction = (action: CarouselAction | undefined, variant: 'primary' | 'ghost') => {
    if (!action || !action.label) return null
    const content = (
      <Button
        variant={variant === 'primary' ? 'primary' : 'ghost'}
        className={cn(
          variant === 'primary'
            ? 'bg-white/20 text-white shadow-lg-theme hover:bg-white/30'
            : 'text-white hover:bg-white/15',
        )}
        onClick={action.onClick}
      >
        {action.label}
      </Button>
    )

    if (action.to) {
      return (
        <Link key={action.label} to={action.to} className="inline-flex">
          {content}
        </Link>
      )
    }

    return content
  }

  return (
    <Card className="relative overflow-hidden rounded-[2.25rem] p-8 sm:p-10">
      <div className="absolute inset-0 gradient-hero opacity-90" aria-hidden />
      <div className="relative z-10 flex flex-col gap-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3 sm:max-w-lg">
          {current.highlight ? <Badge tone="accent">{current.highlight}</Badge> : null}
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{current.title}</h1>
          {current.description ? (
            <p className="text-base leading-relaxed text-white/85">{current.description}</p>
          ) : null}
          <div className="flex flex-wrap gap-3 pt-1">
            {renderAction(current.primaryAction, 'primary')}
            {renderAction(current.secondaryAction, 'ghost')}
          </div>
        </div>
        {items.length > 1 ? (
          <div className="flex items-center gap-3 self-end sm:self-center">
            <button
              type="button"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-0 focus-visible:[box-shadow:var(--ring)]"
              onClick={goPrev}
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-0 focus-visible:[box-shadow:var(--ring)]"
              onClick={goNext}
              aria-label="Next slide"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        ) : null}
      </div>
      {items.length > 1 ? (
        <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-2">
          {items.map((item, idx) => (
            <span
              key={item.id}
              className={cn(
                'h-1.5 w-6 rounded-full transition-all',
                idx === index ? 'bg-white' : 'bg-white/40',
              )}
            />
          ))}
        </div>
      ) : null}
    </Card>
  )
}

export type { HeroCarouselProps }
export default HeroCarousel
