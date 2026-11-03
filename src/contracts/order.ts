import { z } from 'zod'
import { idSchema, listQuerySchema, timestampFields } from './common'
import { defineResource, toOptions } from './resource'

export const orderStatusSchema = z.enum(['pending', 'paid', 'refunded', 'cancelled'])
export type OrderStatus = z.infer<typeof orderStatusSchema>
export const orderStatusLabels: Record<OrderStatus, string> = {
  pending: '待支付',
  paid: '已支付',
  refunded: '已退款',
  cancelled: '已取消',
}
export const orderStatusOptions = toOptions(orderStatusLabels)

export const currencySchema = z.enum(['CNY', 'USD'])
export type Currency = z.infer<typeof currencySchema>
export const currencyLabels: Record<Currency, string> = { CNY: '人民币 ¥', USD: '美元 $' }
export const currencyOptions = toOptions(currencyLabels)

export const orderSchema = z.object({
  id: idSchema,
  /** 服务端生成的订单号，如 NB-20250101-0001 */
  orderNo: z.string(),
  customerId: idSchema,
  /** 服务端冗余的客户名快照，避免列表 N+1 */
  customerName: z.string(),
  product: z.string(),
  amount: z.number(),
  currency: currencySchema,
  status: orderStatusSchema,
  /** 支付时间，未支付为 null */
  paidAt: z.string().nullable(),
  remark: z.string(),
  ...timestampFields,
})
export type Order = z.infer<typeof orderSchema>

export const orderInputSchema = z.object({
  customerId: z.string().min(1, '请选择客户'),
  product: z.string().trim().min(1, '请输入商品/套餐名称').max(100, '最多 100 个字符'),
  amount: z.number({ error: '请输入有效金额' }).positive('金额必须大于 0'),
  currency: currencySchema,
  status: orderStatusSchema,
  remark: z.string().max(200, '最多 200 个字符'),
})
export type OrderInput = z.infer<typeof orderInputSchema>

export const orderQuerySchema = listQuerySchema.extend({
  status: orderStatusSchema.optional().catch(undefined),
  customerId: z.string().optional(),
})
export type OrderQuery = z.infer<typeof orderQuerySchema>

export const orderResource = defineResource<Order, OrderInput, OrderQuery>({
  name: 'orders',
  label: '订单',
  entity: orderSchema,
  input: orderInputSchema,
  query: orderQuerySchema,
  searchFields: ['orderNo', 'customerName', 'product'],
  filterFields: ['status', 'customerId'],
  defaultSort: { field: 'createdAt', order: 'desc' },
})
