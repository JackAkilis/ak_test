import { customerResource, type Customer, type CustomerInput } from '@/contracts/customer'
import { createCrudHandlers } from '../crud-handlers'
import { db } from '../db'
import { newId, nowIso } from '../store'

export const customerHandlers = createCrudHandlers(customerResource, db.customers, {
  create: (input: CustomerInput): Customer => {
    const now = nowIso()
    return { id: newId('cus'), ...input, createdAt: now, updatedAt: now }
  },
  update: (current, input) => ({ ...current, ...input, updatedAt: nowIso() }),
  beforeRemove: (customer) => {
    const count = db.orders.all().filter((o) => o.customerId === customer.id).length
    if (count > 0) {
      return {
        code: 'HAS_ORDERS',
        message: `该客户下还有 ${count} 笔订单，请先处理订单后再删除`,
      }
    }
    return undefined
  },
})
