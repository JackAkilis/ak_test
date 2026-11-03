import type { Customer } from '@/contracts/customer'
import type { Order } from '@/contracts/order'
import { seedCustomers, seedOrders } from './seeds'
import { createStore } from './store'
// <harness:db-imports>

/** Mock 数据库：每张表一个 Store。新增模块在此注册新表。 */
export const db = {
  customers: createStore<Customer>('customers', () => seedCustomers()),
  orders: createStore<Order>('orders', () => seedOrders(seedCustomers())),
  // <harness:db-tables>
}

export function resetDb() {
  Object.values(db).forEach((store) => store.reset())
}
