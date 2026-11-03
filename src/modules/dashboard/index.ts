import { LayoutDashboard } from 'lucide-react'
import { lazy } from 'react'
import type { ModuleDef } from '../types'

export const dashboardModule: ModuleDef = {
  id: 'dashboard',
  title: '总览',
  path: '/dashboard',
  icon: LayoutDashboard,
  Page: lazy(() => import('./DashboardPage')),
}
