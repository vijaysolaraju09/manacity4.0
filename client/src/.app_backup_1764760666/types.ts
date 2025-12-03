import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  label: string
  icon: LucideIcon
  path: string
  badge?: string | number
}
