import { Users } from 'lucide-react'
import { lazy } from 'react'
import type { ModuleDef } from '../types'

export const customersModule: ModuleDef = {
  id: 'customers',
  title: '客户',
  path: '/customers',
  icon: Users,
  Page: lazy(() => import('./CustomersPage')),
}
