import { orderResource, type Order, type OrderInput } from '@/contracts/order'
import { createCrudHandlers } from '../crud-handlers'
import { db } from '../db'
import { localDateStamp, newId, nowIso } from '../store'

let seq = 0
function nextOrderNo() {
  seq += 1
  return `NB-${localDateStamp()}-${String(db.orders.all().length + seq).padStart(4, '0')}`
}

function resolvePaidAt(prev: Order | undefined, status: Order['status']) {
  if (status === 'paid' || status === 'refunded') return prev?.paidAt ?? nowIso()
  return null
}

export const orderHandlers = createCrudHandlers(orderResource, db.orders, {
  create: (input: OrderInput) => {
    const customer = db.customers.get(input.customerId)
    if (!customer) {
      return {
        status: 400,
        error: {
          code: 'VALIDATION_ERROR',
          message: '客户不存在',
          fieldErrors: { customerId: ['所选客户不存在'] },
        },
      }
    }
    const now = nowIso()
    return {
      id: newId('ord'),
      orderNo: nextOrderNo(),
      ...input,
      customerName: customer.name,
      paidAt: resolvePaidAt(undefined, input.status),
      createdAt: now,
      updatedAt: now,
    }
  },
  update: (current, input) => {
    const customer = db.customers.get(input.customerId)
    if (!customer) {
      return {
        status: 400,
        error: {
          code: 'VALIDATION_ERROR',
          message: '客户不存在',
          fieldErrors: { customerId: ['所选客户不存在'] },
        },
      }
    }
    return {
      ...current,
      ...input,
      customerName: customer.name,
      paidAt: resolvePaidAt(current, input.status),
      updatedAt: nowIso(),
    }
  },
})
