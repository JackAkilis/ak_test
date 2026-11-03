import { ReceiptText } from 'lucide-react'
import { lazy } from 'react'
import type { ModuleDef } from '../types'

export const ordersModule: ModuleDef = {
  id: 'orders',
  title: '订单',
  path: '/orders',
  icon: ReceiptText,
  Page: lazy(() => import('./OrdersPage')),
}
