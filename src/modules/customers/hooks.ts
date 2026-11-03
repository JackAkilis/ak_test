import { customerResource } from '@/contracts/customer'
import { createCrudHooks } from '@/lib/crud-hooks'

export const customerHooks = createCrudHooks(customerResource)
