import { HttpResponse, http } from 'msw'
import type { DashboardSummary } from '@/contracts/dashboard'
import { orderStatusSchema } from '@/contracts/order'
import { simulateLatency } from '../crud-handlers'
import { db } from '../db'

export const dashboardHandlers = [
  http.get('/api/dashboard/summary', async () => {
    await simulateLatency()
    const customers = db.customers.all()
    const orders = db.orders.all()
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const thisMonth = orders.filter((o) => new Date(o.createdAt).getTime() >= monthStart)

    const summary: DashboardSummary = {
      customerTotal: customers.length,
      activeCustomers: customers.filter((c) => c.status === 'active').length,
      trialCustomers: customers.filter((c) => c.status === 'trial').length,
      mrr: customers.reduce((sum, c) => sum + c.mrr, 0),
      ordersThisMonth: thisMonth.length,
      revenueThisMonth: thisMonth
        .filter((o) => o.status === 'paid' && o.currency === 'CNY')
        .reduce((sum, o) => sum + o.amount, 0),
      statusBreakdown: orderStatusSchema.options.map((status) => ({
        status,
        count: orders.filter((o) => o.status === status).length,
      })),
      recentOrders: [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
    }
    return HttpResponse.json(summary)
  }),
]
