import { orderResource } from '@/contracts/order'
import { createCrudHooks } from '@/lib/crud-hooks'

export const orderHooks = createCrudHooks(orderResource)
