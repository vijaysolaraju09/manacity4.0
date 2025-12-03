import { useEffect, useState } from 'react'

export interface Countdown {
  days: number
  hours: number
  minutes: number
  seconds: number
}

const clampPositive = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0)

export const useCountdown = (target: Date | string | number | null | undefined): Countdown => {
  const resolveTarget = () => {
    if (!target) return Date.now()
    if (target instanceof Date) return target.getTime()
    if (typeof target === 'string') {
      const parsed = Date.parse(target)
      return Number.isFinite(parsed) ? parsed : Date.now()
    }
    if (typeof target === 'number') return target
    return Date.now()
  }

  const [diff, setDiff] = useState(() => resolveTarget() - Date.now())

  useEffect(() => {
    const nextTarget = resolveTarget()
    setDiff(nextTarget - Date.now())
    const interval = window.setInterval(() => {
      setDiff(nextTarget - Date.now())
    }, 1000)
    return () => window.clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target instanceof Date ? target.getTime() : target])

  const total = clampPositive(diff)
  const days = Math.floor(total / (1000 * 60 * 60 * 24))
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((total / (1000 * 60)) % 60)
  const seconds = Math.floor((total / 1000) % 60)

  return { days, hours, minutes, seconds }
}

export default useCountdown
