import { z } from 'zod'
import { orderSchema, orderStatusSchema } from './order'

/** GET /api/dashboard/summary */
export const dashboardSummarySchema = z.object({
  customerTotal: z.number(),
  activeCustomers: z.number(),
  trialCustomers: z.number(),
  mrr: z.number(),
  ordersThisMonth: z.number(),
  revenueThisMonth: z.number(),
  statusBreakdown: z.array(z.object({ status: orderStatusSchema, count: z.number() })),
  recentOrders: z.array(orderSchema),
})
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>
