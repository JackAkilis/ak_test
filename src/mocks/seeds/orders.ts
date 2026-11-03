import type { Customer } from '@/contracts/customer'
import type { Order, OrderStatus } from '@/contracts/order'
import { DAY, createRng } from './rng'

const PRODUCTS = [
  '专业版 · 年付',
  '专业版 · 月付',
  '企业版 · 年付',
  '额外席位 ×5',
  '额外席位 ×20',
  'API 调用包 100 万次',
  '私有化部署服务',
  '专属客户成功服务',
]

export function seedOrders(customers: Customer[], count = 120, seed = 7): Order[] {
  const rng = createRng(seed)
  const list: Order[] = []
  for (let i = 0; i < count; i++) {
    const customer = rng.pick(customers)
    const status: OrderStatus = rng.pick([
      'pending',
      'paid',
      'paid',
      'paid',
      'paid',
      'refunded',
      'cancelled',
    ])
    const createdAt = new Date(Date.now() - rng.int(0, 180) * DAY - rng.int(0, DAY))
    const currency = rng.next() > 0.85 ? 'USD' : 'CNY'
    const amount = currency === 'USD' ? rng.int(1, 40) * 29 : rng.int(1, 40) * 199
    const paidAt =
      status === 'paid' || status === 'refunded'
        ? new Date(createdAt.getTime() + rng.int(1, 120) * 60_000).toISOString()
        : null
    const seq = String(count - i).padStart(4, '0')
    list.push({
      id: `ord_${String(i + 1).padStart(4, '0')}`,
      orderNo: `NB-${createdAt.toISOString().slice(0, 10).replace(/-/g, '')}-${seq}`,
      customerId: customer.id,
      customerName: customer.name,
      product: rng.pick(PRODUCTS),
      amount,
      currency,
      status,
      paidAt,
      remark: '',
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    })
  }
  return list
}
